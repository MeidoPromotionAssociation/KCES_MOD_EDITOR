import React, {useCallback, useMemo, useRef, useState} from "react";
import {Button, Empty, Input, theme, Tooltip} from "antd";
import {DeleteOutlined, ExclamationCircleOutlined, PlusOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import {useVirtualizer} from "@tanstack/react-virtual";
import {Resizable} from "react-resizable";
import {appMessage as message} from "../../utils/feedback";
import {NeimpColumnWidthsKey} from "../../utils/LocalStorageKeys";
import {
    isNeimpIdMismatch,
    NeimpRow,
    neimpCellText,
    neimpCellValue,
} from "../../utils/neimpTable";

/**
 * NeimpTableEditor .neimp 表格视图
 *
 * 与 nei/NeiTableEditor 同一套自绘表格（虚拟滚动 + 可拖拽列宽），差别在数据模型：
 * .neimp 的行是 CsvData 字典的成员、行体是按 [Key(n)] 位置排的数组，
 * 所以列就是数组下标，行键（而不是行号）是身份。
 *
 * 不做拖动排序：字典成员顺序对游戏没有意义，库回写时也会按排序整理键。
 * 单元格按类型保护地编辑，详见 neimpCellValue。
 */

const DefaultCellWidth = 200; // 数据列宽默认值
const MinCellWidth = 60;      // 列宽下限：再窄输入框就没法用了
const MaxCellWidth = 900;     // 列宽上限：避免一列拖满整屏把别的列挤没
const HeadWidth = 132;        // 行首列宽（行键 + 删除按钮），横向滚动时固定在左侧
const RowHeight = 33;         // 行高，固定值，虚拟滚动按它预估
const HeaderHeight = 38;      // 表头行高

/**
 * 读取上次拖动后的列宽表（key = 列下标）。
 *
 * 列下标就是 [Key(n)] 的位置，是这张表的稳定标识，删掉中间一列不会让右侧列的宽度整体错位。
 * 越界值一律丢弃并回落到默认宽，避免手改 localStorage 后把某列撑成 0 或几千像素。
 */
function readStoredColumnWidths(): Record<string, number> {
    try {
        const raw = localStorage.getItem(NeimpColumnWidthsKey);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return {};
        const result: Record<string, number> = {};
        for (const [key, value] of Object.entries(parsed)) {
            const width = Number(value);
            if (!Number.isFinite(width) || width < MinCellWidth || width > MaxCellWidth) continue;
            result[key] = width;
        }
        return result;
    } catch {
        // localStorage 里是脏数据（手改过、被别的版本写过）就当作没存过
        return {};
    }
}

interface NeimpCellProps {
    value: any;
    onCommit: (value: any) => void;
}

/**
 * NeimpCell 一个可编辑单元格
 *
 * 输入过程用本地草稿，提交（失焦 / 回车）时才解析并写回值树：
 * 受控于值树的话，每敲一个字符都要经过一次「文本 → 值」的解析，
 * 像 0.1 这种中间态（"0."）根本过不了解析。
 */
const NeimpCell: React.FC<NeimpCellProps> = ({value, onCommit}) => {
    const {t} = useTranslation();
    // null 表示没在编辑，显示值树里的当前值
    const [draft, setDraft] = useState<string | null>(null);
    const text = draft ?? neimpCellText(value);

    const commit = () => {
        if (draft === null) return;
        setDraft(null);
        if (draft === neimpCellText(value)) return;
        const result = neimpCellValue(value, draft);
        if (!result.ok) {
            message.error(t('NeimpEditor.cell_invalid_json'));
            return;
        }
        onCommit(result.value);
    };

    return (
        <Input
            size="small"
            value={text}
            // null 单元格没有类型可显示，用占位符说明它是空的
            placeholder={value === null || value === undefined ? "null" : undefined}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onPressEnter={(event) => (event.target as HTMLInputElement).blur()}
            onKeyDown={(event) => {
                if (event.key === "Escape") {
                    // 放弃这次输入，回到值树里的原值
                    setDraft(null);
                    (event.target as HTMLInputElement).blur();
                }
            }}
        />
    );
};

interface NeimpRowViewProps {
    row: NeimpRow;
    columns: number[];
    columnWidths: number[];
    idColumn: number | null;
    top: number;
    onCellChange: (rowKey: string, index: number, value: any) => void;
    onDeleteRow: (rowKey: string) => void;
}

/** NeimpRowView 一行数据，位置由虚拟滚动算出的 top 决定 */
const NeimpRowView: React.FC<NeimpRowViewProps> = ({
                                                       row,
                                                       columns,
                                                       columnWidths,
                                                       idColumn,
                                                       top,
                                                       onCellChange,
                                                       onDeleteRow,
                                                   }) => {
    const {token} = theme.useToken();
    const {t} = useTranslation();
    const border = `1px solid ${token.colorBorderSecondary}`;
    const rowWidth = HeadWidth + columnWidths.reduce((sum, width) => sum + width, 0);
    const mismatch = isNeimpIdMismatch(row, idColumn);
    const cellStyle: React.CSSProperties = {
        display: "flex",
        alignItems: "center",
        padding: "0 4px",
        borderRight: border,
        borderBottom: border,
    };

    return (
        <div
            role="row"
            style={{
                position: "absolute",
                top,
                left: 0,
                display: "flex",
                height: RowHeight,
                width: rowWidth,
                background: token.colorBgContainer,
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
                {mismatch && (
                    <Tooltip title={t('NeimpEditor.id_mismatch')}>
                        <ExclamationCircleOutlined style={{color: token.colorWarning, fontSize: token.fontSizeSM}}/>
                    </Tooltip>
                )}
                <Tooltip title={t('NeimpEditor.row_key_tip')}>
                    <span style={{
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        color: token.colorTextDescription,
                        fontSize: token.fontSizeSM,
                    }}>
                        {row.key}
                    </span>
                </Tooltip>
                <Tooltip title={t('NeimpEditor.delete_row')}>
                    <Button type="text" size="small" danger aria-label={t('NeimpEditor.delete_row')}
                            icon={<DeleteOutlined/>} onClick={() => onDeleteRow(row.key)}/>
                </Tooltip>
            </div>
            {columns.map((index, position) => (
                <div key={index} role="cell" style={{...cellStyle, flex: `0 0 ${columnWidths[position]}px`}}>
                    {index < row.cells.length ? (
                        <NeimpCell value={row.cells[index]}
                                   onCommit={(value) => onCellChange(row.key, index, value)}/>
                    ) : (
                        // 行比最长行短：该位置在这条记录里不存在，写进去会改变数组长度，禁止编辑
                        <Tooltip title={t('NeimpEditor.missing_cell_tip')}>
                            <Input size="small" disabled value=""/>
                        </Tooltip>
                    )}
                </div>
            ))}
        </div>
    );
};

interface NeimpTableEditorProps {
    rows: NeimpRow[];
    columnCount: number;
    idColumn: number | null;
    /** id 清单只有一列，列头用它代替下标 */
    columnLabel?: string;
    /** 行首列的标题，默认「行键」；id 清单用「序号」 */
    rowHeaderLabel?: string;
    onCellChange: (rowKey: string, index: number, value: any) => void;
    onDeleteRow: (rowKey: string) => void;
    /** 不传表示这种形态不能删列（id 清单没有列可删） */
    onDeleteColumn?: (index: number) => void;
    onAddRow: () => void;
}

const NeimpTableEditor: React.FC<NeimpTableEditorProps> = ({
                                                               rows,
                                                               columnCount,
                                                               idColumn,
                                                               columnLabel,
                                                               rowHeaderLabel,
                                                               onCellChange,
                                                               onDeleteRow,
                                                               onDeleteColumn,
                                                               onAddRow,
                                                           }) => {
    const {t} = useTranslation();
    const {token} = theme.useToken();
    const scrollRef = useRef<HTMLDivElement>(null);

    // 列就是行数组的下标
    const columns = useMemo(
        () => Array.from({length: columnCount}, (_, index) => index),
        [columnCount],
    );

    // 列宽是显示偏好，不属于文件内容，只存在本组件与 localStorage 里
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>(readStoredColumnWidths);

    const widthOf = (index: number) => columnWidths[String(index)] ?? DefaultCellWidth;
    const widths = useMemo(
        () => columns.map((index) => columnWidths[String(index)] ?? DefaultCellWidth),
        // widthOf 依赖 columnWidths，这里直接列出依赖
        [columns, columnWidths],
    );
    const totalWidth = HeadWidth + widths.reduce((sum, width) => sum + width, 0);

    /** 拖动过程中只改 state，松手时才落 localStorage（拖动每秒触发几十次） */
    const resizeColumn = useCallback((index: number, nextWidth: number) => {
        setColumnWidths((prev) => (prev[String(index)] === nextWidth ? prev : {...prev, [String(index)]: nextWidth}));
    }, []);

    const persistColumnWidths = useCallback((next: Record<string, number>) => {
        try {
            localStorage.setItem(NeimpColumnWidthsKey, JSON.stringify(next));
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

    const handleAddRow = () => {
        onAddRow();
        // 新行在末尾，虚拟滚动下默认看不到，等这一帧渲染完再滚过去
        requestAnimationFrame(() => virtualizer.scrollToIndex(rows.length));
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
     * 表头单元格内容（含 react-resizable 的右边界把手）。
     * 把手定位在内层 div 上，见 nei/NeiTableEditor 的同名实现与 style.css 的说明。
     */
    const renderHeaderCellContent = (index: number) => (
        <Resizable
            width={widthOf(index)}
            height={0}
            axis="x"
            resizeHandles={["e"]}
            minConstraints={[MinCellWidth, 0]}
            maxConstraints={[MaxCellWidth, Infinity]}
            onResize={(_event, data) => resizeColumn(index, Math.round(data.size.width))}
            onResizeStop={(_event, data) => {
                const nextWidth = Math.round(data.size.width);
                setColumnWidths((prev) => {
                    const next = {...prev, [String(index)]: nextWidth};
                    persistColumnWidths(next);
                    return next;
                });
            }}
            // 双击把手恢复默认列宽
            handle={(handleAxis, ref) => (
                <span
                    ref={ref as React.Ref<HTMLSpanElement>}
                    className={`table-col-resizer table-col-resizer-${handleAxis}`}
                    role="separator"
                    aria-orientation="vertical"
                    title={t('NeimpEditor.resize_column_tip')}
                    onDoubleClick={(event) => {
                        event.stopPropagation();
                        setColumnWidths((prev) => {
                            const next = {...prev};
                            delete next[String(index)];
                            persistColumnWidths(next);
                            return next;
                        });
                    }}
                />
            )}
        >
            <div style={{
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
                <Tooltip title={t('NeimpEditor.column_key_tip')}>
                    <span style={{overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>
                        {columnLabel ?? index}
                    </span>
                </Tooltip>
                {onDeleteColumn && (
                    <Tooltip title={t('NeimpEditor.delete_column')}>
                        <Button
                            type="text"
                            size="small"
                            danger
                            aria-label={t('NeimpEditor.delete_column')}
                            icon={<DeleteOutlined/>}
                            onClick={() => onDeleteColumn(index)}
                        />
                    </Tooltip>
                )}
            </div>
        </Resizable>
    );

    return (
        <div style={{textAlign: "left", display: "flex", flexDirection: "column", flex: 1, minHeight: 0}}>
            <div style={{flex: 1, minHeight: 0}}>
                <div
                    ref={scrollRef}
                    role="table"
                    aria-rowcount={rows.length + 1}
                    aria-colcount={columnCount + 1}
                    style={{
                        height: "100%",
                        overflow: "auto",
                        border,
                        borderRadius: token.borderRadius,
                        background: token.colorBgContainer,
                    }}
                >
                    <div style={{width: totalWidth, position: "relative"}}>
                        {/* 表头：纵向吸顶。sticky 必须挂在 rowgroup 上而不是行上，
                            否则只能在行自己的高度里偏移，等于完全不能动 */}
                        <div role="rowgroup" style={{position: "sticky", top: 0, zIndex: 2}}>
                            <div
                                role="row"
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
                                    {rowHeaderLabel ?? t('NeimpEditor.row_key')}
                                </div>
                                {columns.map((index) => (
                                    <div key={index} role="columnheader" className="table-header-cell" style={{
                                        ...headerCellStyle,
                                        padding: 0,
                                        flex: `0 0 ${widthOf(index)}px`,
                                    }}>
                                        {renderHeaderCellContent(index)}
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* 表体：只渲染视口内的行 */}
                        <div role="rowgroup" style={{height: virtualizer.getTotalSize(), position: "relative"}}>
                            {virtualizer.getVirtualItems().map((virtualRow) => (
                                <NeimpRowView
                                    key={rows[virtualRow.index].key}
                                    row={rows[virtualRow.index]}
                                    columns={columns}
                                    columnWidths={widths}
                                    idColumn={idColumn}
                                    top={virtualRow.start}
                                    onCellChange={onCellChange}
                                    onDeleteRow={onDeleteRow}
                                />
                            ))}
                        </div>
                        {rows.length === 0 && (
                            <Empty description={t('NeimpEditor.empty_table')} style={{margin: "32px 0"}}/>
                        )}
                    </div>
                </div>
            </div>
            <div style={{marginTop: 8, flexShrink: 0}}>
                <Button type="primary" icon={<PlusOutlined/>} onClick={handleAddRow}>
                    {t('NeimpEditor.add_row')}
                </Button>
            </div>
        </div>
    );
};

export default NeimpTableEditor;
