import React, {useCallback, useRef, useState} from "react";
import {Button, Empty, Input, theme, Tooltip} from "antd";
import {DeleteOutlined, HolderOutlined, PlusOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import {useVirtualizer} from "@tanstack/react-virtual";
import {Resizable} from "react-resizable";
import type {DragEndEvent, DragOverEvent, DragStartEvent} from "@dnd-kit/react";
import {DragDropProvider} from "@dnd-kit/react";
import {isSortable, useSortable} from "@dnd-kit/react/sortable";
import {SortableKeyboardPlugin} from "@dnd-kit/dom/sortable";
import {csvColumnCount} from "../../utils/csv";
import {arrayMove} from "../../utils/utils";
import {NeiColumnWidthsKey} from "../../utils/LocalStorageKeys";

/**
 * NeiTableEditor .nei 表格视图
 * 复刻 COM3D2_MOD_EDITOR 的 nei/NeiTableEditor：逐单元格编辑 + 增删行列 + 拖动调整行顺序。
 *
 * .nei 表格常有上千行，但这里没法用 antd 的 Table：
 * 它的虚拟滚动模式（virtual）不走 components.body.row，也就接不上 dnd-kit 的可排序行，
 * 而不开虚拟滚动的话上千行 × 每格一个 Input 会卡死。
 * 因此改成自绘表格：行由 @tanstack/react-virtual 虚拟化，拖动排序由 @dnd-kit/react 负责。
 * 每次修改都同步回 Rows/Cols，避免保存时行列数与实际数据不一致。
 *
 * 列宽可拖拽调整（基于 react-resizable，与 PresetRecordTable 同一套做法）：
 * .nei 各列宽度差异很大（有的存路径、有的只存 0/1），固定 200px 总要横向滚动。
 * 宽度按「列序号」存在 localStorage 里跨会话保留，详见 readStoredColumnWidths。
 */

const DefaultCellWidth = 200; // 数据列宽默认值
const MinCellWidth = 60;      // 列宽下限：再窄输入框就没法用了
const MaxCellWidth = 900;     // 列宽上限：避免一列拖满整屏把别的列挤没
const HeadWidth = 108;        // 行首列宽（拖拽手柄 + 行号 + 删除按钮），横向滚动时固定在左侧
const RowHeight = 33;         // 行高，固定值，虚拟滚动按它预估
const HeaderHeight = 38;      // 表头行高

/**
 * 读取上次拖动后的列宽表（key = 列序号，从 0 开始）。
 *
 * 为什么按「列序号」而不是列名存：.nei 表头就是 列 1 / 列 2 ...，没有稳定标识，
 * 序号是这里唯一可用的键。代价是删除中间某列后，右侧列的序号会整体左移、
 * 从而继承前一列的宽度 —— 列宽只是显示偏好，这个偏差可以接受，不值得为它做迁移逻辑。
 *
 * 越界值一律丢弃并回落到默认宽，避免手改 localStorage 后把某列撑成 0 或几千像素。
 */
function readStoredColumnWidths(): Record<number, number> {
    try {
        const raw = localStorage.getItem(NeiColumnWidthsKey);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return {};
        const result: Record<number, number> = {};
        for (const [key, value] of Object.entries(parsed)) {
            const index = Number(key);
            const width = Number(value);
            if (!Number.isInteger(index) || index < 0) continue;
            if (!Number.isFinite(width) || width < MinCellWidth || width > MaxCellWidth) continue;
            result[index] = width;
        }
        return result;
    } catch {
        // localStorage 里是脏数据（手改过、被别的版本写过）就当作没存过
        return {};
    }
}

/**
 * dnd-kit 默认的 OptimisticSortingPlugin 是靠 insertAdjacentElement 真的挪 DOM 节点来做
 * 拖动预览的，而这里的行是虚拟滚动用 position:absolute + top 摆出来的：挪节点既看不出效果，
 * 又会让真实 DOM 顺序和 React 的顺序永久错开（key 是行号，顺序没变 React 就不会去纠正）。
 * 所以只保留键盘排序插件，落点预览改由下方 DropIndicator 自己画。
 */
const SortablePlugins = [SortableKeyboardPlugin];

interface NeiRowProps {
    rowIndex: number;
    cells: string[];
    /** 各列当前生效的宽度，长度与列数一致 */
    columnWidths: number[];
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
                                           columnWidths,
                                           top,
                                           dragLabel,
                                           deleteLabel,
                                           onCellChange,
                                           onDeleteRow,
                                       }) => {
    const {token} = theme.useToken();
    const {ref, handleRef, isDragging} = useSortable({id: rowIndex, index: rowIndex, plugins: SortablePlugins});

    const border = `1px solid ${token.colorBorderSecondary}`;
    // 行的总宽必须与表头逐列一致（都取 columnWidths），否则表体与表头会错位
    const rowWidth = HeadWidth + columnWidths.reduce((sum, width) => sum + width, 0);
    const baseCellStyle: React.CSSProperties = {
        display: "flex",
        alignItems: "center",
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
                width: rowWidth,
                background: isDragging ? token.controlItemBgActive : token.colorBgContainer,
            }}
        >
            <div
                role="rowheader"
                style={{
                    ...baseCellStyle,
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
            {Array.from({length: columnWidths.length}, (_, colIndex) => (
                <div key={colIndex} role="cell"
                     style={{...baseCellStyle, flex: `0 0 ${columnWidths[colIndex]}px`}}>
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

    /**
     * 各列宽度。初始值从 localStorage 读入，没存过的列回落到 DefaultCellWidth。
     *
     * 宽度由本组件自己持有，而不是写回 data —— 列宽是显示偏好，不属于 .nei 文件内容，
     * 塞进 data 会被序列化进文件、还会让保存时的 diff 出现噪声。
     */
    const [columnWidths, setColumnWidths] = useState<Record<number, number>>(readStoredColumnWidths);

    /** 当前生效的逐列宽度数组，长度对齐 colCount */
    const widths = React.useMemo(
        () => Array.from({length: colCount}, (_, colIndex) => columnWidths[colIndex] ?? DefaultCellWidth),
        [colCount, columnWidths],
    );

    /** 表格内容总宽（行首列 + 各数据列），表头、每行与拖动指示线都用它 */
    const totalWidth = HeadWidth + widths.reduce((sum, width) => sum + width, 0);

    /**
     * 拖动中的连续更新只改 state，松手时（onResizeStop）才落 localStorage ——
     * 拖拽每秒触发几十次，每次都写 localStorage 是同步 I/O，会拖慢拖动本身。
     */
    const resizeColumn = useCallback((colIndex: number, nextWidth: number) => {
        setColumnWidths((prev) => (prev[colIndex] === nextWidth ? prev : {...prev, [colIndex]: nextWidth}));
    }, []);

    const persistColumnWidths = useCallback((next: Record<number, number>) => {
        try {
            localStorage.setItem(NeiColumnWidthsKey, JSON.stringify(next));
        } catch {
            // 隐私模式 / 配额满时写不进去，列宽降级为「本次会话有效」，不影响编辑
        }
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
        padding: "0 4px 0 8px",
        borderRight: border,
        borderBottom: border,
    };

    /**
     * 表头单元格的可拖拽内容（react-resizable）。
     *
     * 与 PresetRecordTable 的 ResizableHeaderCell 同一套做法，但这里不是 antd Table，
     * 所以不存在「全局注册的 header.cell 会被每一列复用」的问题，直接把内容包一层即可。
     *
     * 包的是内层 div 而不是外层那个 flex 单元格：Resizable 会给子元素注入
     * style={{width}}，包外层会把单元格宽度从 flex 布局手里抢走，和 flex: 0 0 Npx 打架。
     * 包内层就只影响内容区，实际列宽仍由 widths 驱动。
     *
     * 内层 div 必须自带 position: relative：把手是 position: absolute; right: -3px，
     * 靠这个定位上下文才能贴在本列右边线上。库自带的 .react-resizable{position:relative}
     * 本项目没引入（react-resizable/css/styles.css 未被 import），少了它把手会一路向上
     * 找到表格内容容器，于是每列的把手都堆到整张表右边缘 —— 表现为「看不到把手」。
     */
    const renderHeaderCellContent = (colIndex: number) => {
        const currentWidth = widths[colIndex];
        return (
            <Resizable
                width={currentWidth}
                height={0}
                axis="x"
                // 只留右边一个把手：列宽调整只该从右边界拖
                resizeHandles={["e"]}
                minConstraints={[MinCellWidth, 0]}
                maxConstraints={[MaxCellWidth, Infinity]}
                onResize={(_e, data) => resizeColumn(colIndex, Math.round(data.size.width))}
                onResizeStop={(_e, data) => {
                    const nextWidth = Math.round(data.size.width);
                    setColumnWidths((prev) => {
                        const next = {...prev, [colIndex]: nextWidth};
                        persistColumnWidths(next);
                        return next;
                    });
                }}
                // 双击把手恢复默认列宽
                handle={(handleAxis, ref) => (
                    <span
                        ref={ref as React.Ref<HTMLSpanElement>}
                        className={`nei-col-resizer nei-col-resizer-${handleAxis}`}
                        role="separator"
                        aria-orientation="vertical"
                        title={t('NeiEditor.resize_column_tip')}
                        onDoubleClick={(event) => {
                            // 不让双击冒泡到表头，否则会和别的点击行为打架
                            event.stopPropagation();
                            setColumnWidths((prev) => {
                                const next = {...prev};
                                delete next[colIndex];
                                persistColumnWidths(next);
                                return next;
                            });
                        }}
                    />
                )}
            >
                {/* 内边距与定位上下文都放在这一层：把手才能贴到单元格真正的右边线上 */}
                <div className="nei-col-resizer-inner" style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 4,
                    width: "100%",
                    height: "100%",
                    paddingInline: 8,
                    boxSizing: "border-box",
                    overflow: "hidden",
                }}>
                    <span style={{overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>
                        {`${t('NeiEditor.column')} ${colIndex + 1}`}
                    </span>
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
            </Resizable>
        );
    };

    return (
        <div style={{textAlign: "left", display: "flex", flexDirection: "column", flex: 1, minHeight: 0}}>
            <div style={{flex: 1, minHeight: 0}}>
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
                            height: "100%",
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
                                        // padding 归零后交给内层 div，把手才能贴到单元格右边线上；
                                        // 表头单元格默认的 overflow 不能裁掉向右溢出的把手（见 style.css）
                                        <div key={colIndex} role="columnheader" className="nei-header-cell" style={{
                                            ...headerCellStyle,
                                            padding: 0,
                                            flex: `0 0 ${widths[colIndex]}px`,
                                        }}>
                                            {renderHeaderCellContent(colIndex)}
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
                                        columnWidths={widths}
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
            </div>
            <div style={{marginTop: 8, flexShrink: 0}}>
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
