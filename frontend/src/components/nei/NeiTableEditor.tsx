import React, {useEffect, useRef, useState} from "react";
import {Button, Empty, Input, Tooltip, theme} from "antd";
import {DeleteOutlined, HolderOutlined, PlusOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import {useVirtualizer} from "@tanstack/react-virtual";
import type {DragEndEvent, DragOverEvent, DragStartEvent} from "@dnd-kit/react";
import {DragDropProvider} from "@dnd-kit/react";
import {isSortable, useSortable} from "@dnd-kit/react/sortable";
import {SortableKeyboardPlugin} from "@dnd-kit/dom/sortable";
import {csvColumnCount} from "../../utils/csv";

/**
 * NeiTableEditor .nei 表格视图
 * 复刻 COM3D2_MOD_EDITOR 的 nei/NeiTableEditor：逐单元格编辑 + 增删行列 + 拖动调整行顺序。
 *
 * .nei 表格常有上千行，但这里没法用 antd 的 Table：
 * 它的虚拟滚动模式（virtual）不走 components.body.row，也就接不上 dnd-kit 的可排序行，
 * 而不开虚拟滚动的话上千行 × 每格一个 Input 会卡死。
 * 因此改成自绘表格：行由 @tanstack/react-virtual 虚拟化，拖动排序由 @dnd-kit/react 负责。
 * 每次修改都同步回 Rows/Cols，避免保存时行列数与实际数据不一致。
 */

const CellWidth = 200;   // 数据列宽
const HeadWidth = 108;   // 行首列宽（拖拽手柄 + 行号 + 删除按钮），横向滚动时固定在左侧
const RowHeight = 33;    // 行高，固定值，虚拟滚动按它预估
const HeaderHeight = 38; // 表头行高

/**
 * dnd-kit 默认的 OptimisticSortingPlugin 是靠 insertAdjacentElement 真的挪 DOM 节点来做
 * 拖动预览的，而这里的行是虚拟滚动用 position:absolute + top 摆出来的：挪节点既看不出效果，
 * 又会让真实 DOM 顺序和 React 的顺序永久错开（key 是行号，顺序没变 React 就不会去纠正）。
 * 所以只保留键盘排序插件，落点预览改由下方 DropIndicator 自己画。
 */
const SortablePlugins = [SortableKeyboardPlugin];

/** 把 from 处的元素移到 to，语义与 @dnd-kit/helpers 的 move() 对无 id 数组的处理一致 */
function arrayMove<T>(list: T[], from: number, to: number): T[] {
    const next = list.slice();
    next.splice(to, 0, next.splice(from, 1)[0]);
    return next;
}

interface NeiRowProps {
    rowIndex: number;
    cells: string[];
    colCount: number;
    /** 虚拟滚动算出的行顶端偏移 */
    top: number;
    dragLabel: string;
    deleteLabel: string;
    onCellChange: (rowIndex: number, colIndex: number, value: string) => void;
    onDeleteRow: (rowIndex: number) => void;
}

/**
 * NeiRow 一行数据
 * 位置由虚拟滚动算出的 top 决定；拖动中 dnd-kit 会用 !important 的注入样式把它提到
 * position: fixed 的顶层，并在原位插入一个隐藏克隆占位，所以这里的 top 不会打架。
 */
const NeiRow: React.FC<NeiRowProps> = ({
                                           rowIndex,
                                           cells,
                                           colCount,
                                           top,
                                           dragLabel,
                                           deleteLabel,
                                           onCellChange,
                                           onDeleteRow,
                                       }) => {
    const {token} = theme.useToken();
    const {ref, handleRef, isDragging} = useSortable({id: rowIndex, index: rowIndex, plugins: SortablePlugins});

    const border = `1px solid ${token.colorBorderSecondary}`;
    const cellStyle: React.CSSProperties = {
        display: "flex",
        alignItems: "center",
        flex: `0 0 ${CellWidth}px`,
        padding: "0 4px",
        borderRight: border,
        borderBottom: border,
    };

    return (
        <div
            ref={ref}
            role="row"
            aria-rowindex={rowIndex + 2}
            style={{
                position: "absolute",
                top,
                left: 0,
                display: "flex",
                height: RowHeight,
                width: HeadWidth + colCount * CellWidth,
                background: isDragging ? token.controlItemBgActive : token.colorBgContainer,
            }}
        >
            <div
                role="rowheader"
                style={{
                    ...cellStyle,
                    position: "sticky",
                    left: 0,
                    zIndex: 1,
                    flex: `0 0 ${HeadWidth}px`,
                    gap: 2,
                    background: "inherit",
                }}
            >
                <button
                    ref={handleRef}
                    type="button"
                    title={dragLabel}
                    aria-label={dragLabel}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        padding: 4,
                        border: "none",
                        background: "transparent",
                        color: token.colorTextDescription,
                        cursor: "grab",
                    }}
                >
                    <HolderOutlined/>
                </button>
                <span style={{
                    flex: 1,
                    textAlign: "right",
                    color: token.colorTextDescription,
                    fontSize: token.fontSizeSM,
                }}>
                    {rowIndex + 1}
                </span>
                <Tooltip title={deleteLabel}>
                    <Button type="text" size="small" danger aria-label={deleteLabel}
                            icon={<DeleteOutlined/>} onClick={() => onDeleteRow(rowIndex)}/>
                </Tooltip>
            </div>
            {Array.from({length: colCount}, (_, colIndex) => (
                <div key={colIndex} role="cell" style={cellStyle}>
                    <Input
                        size="small"
                        value={cells[colIndex] ?? ""}
                        onChange={(e) => onCellChange(rowIndex, colIndex, e.target.value)}
                    />
                </div>
            ))}
        </div>
    );
};

const NeiTableEditor: React.FC<{
    data: any;
    onChange: (value: any) => void;
}> = ({data, onChange}) => {
    const {t} = useTranslation();
    const {token} = theme.useToken();
    const scrollRef = useRef<HTMLDivElement>(null);

    const rows: string[][] = Array.isArray(data?.Data) ? data.Data : [];
    const colCount = Math.max(1, csvColumnCount(rows));
    const totalWidth = HeadWidth + colCount * CellWidth;

    // 虚拟滚动需要数值高度，随窗口变化重算。
    // 总高度对齐样式2的 CSV 编辑器（calc(100vh - 215px)），再减去下方两个按钮占的 40px，
    // 这样在同一个 .nei 文件的两个视图之间来回切时编辑区不会跳
    const availableHeight = () => Math.max(240, window.innerHeight - 215 - 40);
    const [tableHeight, setTableHeight] = useState(availableHeight);
    useEffect(() => {
        const onResize = () => setTableHeight(availableHeight());
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => RowHeight,
        overscan: 10,
    });

    // 写回数据，同时同步行列数
    const commit = (newRows: string[][]) => {
        onChange({
            ...data,
            Data: newRows,
            Rows: newRows.length,
            Cols: csvColumnCount(newRows),
        });
    };

    // 修改单元格；行内缺少的列先补空串
    const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
        const newRows = rows.map((row, index) => {
            if (index !== rowIndex) return row;
            const newRow = [...(row ?? [])];
            while (newRow.length <= colIndex) {
                newRow.push("");
            }
            newRow[colIndex] = value;
            return newRow;
        });
        commit(newRows);
    };

    const handleAddRow = () => {
        commit([...rows, new Array(colCount).fill("")]);
        // 新行在末尾，虚拟滚动下默认看不到，等这一帧渲染完再滚过去
        requestAnimationFrame(() => virtualizer.scrollToIndex(rows.length));
    };

    const handleDeleteRow = (rowIndex: number) => {
        commit(rows.filter((_, index) => index !== rowIndex));
    };

    const handleAddColumn = () => {
        if (rows.length === 0) {
            commit([[""]]);
            return;
        }
        commit(rows.map((row) => [...(row ?? []), ""]));
    };

    const handleDeleteColumn = (colIndex: number) => {
        commit(rows.map((row) => (row ?? []).filter((_, index) => index !== colIndex)));
    };

    /**
     * 拖动过程中的落点预览。
     * 关掉乐观排序后 dnd-kit 不再挪 DOM，落点靠 dragover 报出的 target 自己记，
     * 画成一条插入线：往下拖画在目标行下边缘，往上拖画在目标行上边缘 —— 与
     * arrayMove(rows, from, to) 的落位一致。
     */
    const [drag, setDrag] = useState<{ from: number; to: number } | null>(null);

    const handleDragStart = (event: DragStartEvent) => {
        const source = event.operation.source;
        if (!source || !isSortable(source)) return;
        setDrag({from: source.index, to: source.index});
    };

    const handleDragOver = (event: DragOverEvent) => {
        const {source, target} = event.operation;
        if (!source || !target || !isSortable(source) || !isSortable(target)) return;
        setDrag({from: source.index, to: target.sortable.index});
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setDrag(null);
        const {source, target} = event.operation;
        if (event.canceled || !source || !target || !isSortable(source) || !isSortable(target)) return;
        const from = source.index;
        const to = target.sortable.index;
        if (from === to || from < 0 || from >= rows.length || to < 0 || to >= rows.length) return;
        commit(arrayMove(rows, from, to));
    };

    const border = `1px solid ${token.colorBorderSecondary}`;
    const headerCellStyle: React.CSSProperties = {
        display: "flex",
        alignItems: "center",
        flex: `0 0 ${CellWidth}px`,
        padding: "0 4px 0 8px",
        borderRight: border,
        borderBottom: border,
    };

    return (
        <div style={{textAlign: "left"}}>
            <DragDropProvider
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div
                    ref={scrollRef}
                    role="table"
                    aria-rowcount={rows.length + 1}
                    aria-colcount={colCount + 1}
                    style={{
                        height: tableHeight,
                        overflow: "auto",
                        border,
                        borderRadius: token.borderRadius,
                        background: token.colorBgContainer,
                    }}
                >
                    <div style={{width: totalWidth, position: "relative"}}>
                        {/* 表头：纵向吸顶，横向随内容滚动
                            sticky 要挂在 rowgroup 上而不是里面的行上：sticky 元素只能在父元素盒子内偏移，
                            而 rowgroup 的高度就等于表头行高，挂在行上等于完全不能动 */}
                        <div role="rowgroup" style={{position: "sticky", top: 0, zIndex: 2}}>
                            <div
                                role="row"
                                aria-rowindex={1}
                                style={{
                                    display: "flex",
                                    height: HeaderHeight,
                                    width: totalWidth,
                                    background: token.colorFillAlter,
                                    fontWeight: 500,
                                }}
                            >
                                <div role="columnheader" style={{
                                    ...headerCellStyle,
                                    position: "sticky",
                                    left: 0,
                                    zIndex: 1,
                                    flex: `0 0 ${HeadWidth}px`,
                                    justifyContent: "center",
                                    background: "inherit",
                                }}>
                                    #
                                </div>
                                {Array.from({length: colCount}, (_, colIndex) => (
                                    <div key={colIndex} role="columnheader" style={{
                                        ...headerCellStyle,
                                        justifyContent: "space-between",
                                        gap: 4,
                                    }}>
                                        <span>{`${t('NeiEditor.column')} ${colIndex + 1}`}</span>
                                        <Tooltip title={t('NeiEditor.delete_column')}>
                                            <Button
                                                type="text"
                                                size="small"
                                                danger
                                                aria-label={t('NeiEditor.delete_column')}
                                                icon={<DeleteOutlined/>}
                                                onClick={() => handleDeleteColumn(colIndex)}
                                            />
                                        </Tooltip>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* 表体：只渲染视口内的行 */}
                        <div role="rowgroup" style={{height: virtualizer.getTotalSize(), position: "relative"}}>
                            {virtualizer.getVirtualItems().map((row) => (
                                <NeiRow
                                    key={row.key}
                                    rowIndex={row.index}
                                    cells={rows[row.index] ?? []}
                                    colCount={colCount}
                                    top={row.start}
                                    dragLabel={t('NeiEditor.drag_row')}
                                    deleteLabel={t('NeiEditor.delete_row')}
                                    onCellChange={handleCellChange}
                                    onDeleteRow={handleDeleteRow}
                                />
                            ))}
                            {drag && drag.from !== drag.to && (
                                <div
                                    aria-hidden="true"
                                    style={{
                                        position: "absolute",
                                        top: (drag.to > drag.from ? drag.to + 1 : drag.to) * RowHeight - 1,
                                        left: 0,
                                        height: 3,
                                        width: totalWidth,
                                        borderRadius: 2,
                                        background: token.colorPrimary,
                                        pointerEvents: "none",
                                        zIndex: 1,
                                    }}
                                />
                            )}
                        </div>
                        {rows.length === 0 && (
                            <Empty description={t('NeiEditor.empty_table')} style={{margin: "32px 0"}}/>
                        )}
                    </div>
                </div>
            </DragDropProvider>
            <div style={{marginTop: 8}}>
                <Button type="primary" icon={<PlusOutlined/>} onClick={handleAddRow} style={{marginRight: 8}}>
                    {t('NeiEditor.add_row')}
                </Button>
                <Button icon={<PlusOutlined/>} onClick={handleAddColumn}>
                    {t('NeiEditor.add_column')}
                </Button>
            </div>
        </div>
    );
};

export default NeiTableEditor;
