import React, {useMemo} from "react";
import {Alert, Select, Space, Tooltip} from "antd";
import {QuestionCircleOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import NeimpTableEditor from "./NeimpTableEditor";
import {
    addNeimpListItem,
    addNeimpRow,
    deleteNeimpColumn,
    deleteNeimpListItem,
    deleteNeimpRow,
    detectNeimpIdColumn,
    isNeimpIdMismatch,
    NeimpRow,
    neimpCellText,
    neimpTableKey,
    neimpTableLabel,
    resolveNeimpTable,
    scanNeimpSheets,
    setNeimpCell,
    setNeimpListValue,
    withNeimpListValues,
    withNeimpRows,
} from "../../utils/neimpTable";

/**
 * NeimpTablePane .neimp 表格视图的容器
 *
 * 负责三件事：从值树里扫出可编辑的形态、在多张表之间切换、把改动写回值树。
 * 表本身由 NeimpTableEditor 渲染，两种形态共用同一套表格：
 * - table：CsvData 的 `[版本, {行键: 行数组}]`
 * - list：`*_enabled_list.neimp` 这种扁平 id 数组，渲染成单列
 */
const NeimpTablePane: React.FC<{
    data: any;
    setData: (value: any) => void;
    tablePath: string | null;
    onSelectTable: (key: string) => void;
}> = ({data, setData, tablePath, onSelectTable}) => {
    const {t} = useTranslation();

    const sheets = useMemo(() => scanNeimpSheets(data), [data]);
    const sheet = useMemo(() => resolveNeimpTable(sheets, tablePath), [sheets, tablePath]);
    const idColumn = useMemo(
        () => (sheet && sheet.kind === "table" ? detectNeimpIdColumn(sheet) : null),
        [sheet],
    );

    // id 清单的每一行就是数组的一个元素，行键用下标
    const rows: NeimpRow[] = useMemo(() => {
        if (!sheet) return [];
        if (sheet.kind === "table") return sheet.rows;
        return sheet.values.map((value, index) => ({key: String(index), cells: [value]}));
    }, [sheet]);

    // 行键与 id 列不一致的行数：游戏按行键查找，这种行会被漏掉
    const mismatchedRows = useMemo(
        () => (sheet?.kind === "table" && idColumn !== null
            ? sheet.rows.filter((row) => isNeimpIdMismatch(row, idColumn)).length
            : 0),
        [sheet, idColumn],
    );

    if (!sheet) {
        return (
            <Alert
                type="info"
                showIcon
                title={t('NeimpEditor.no_table')}
                description={t('NeimpEditor.no_table_description')}
            />
        );
    }

    const handleCellChange = (rowKey: string, index: number, value: any) => {
        if (sheet.kind === "table") {
            setData(withNeimpRows(data, sheet, setNeimpCell(sheet.map, rowKey, index, value)));
            return;
        }
        setData(withNeimpListValues(data, sheet, setNeimpListValue(sheet.values, Number(rowKey), value)));
    };

    const handleDeleteRow = (rowKey: string) => {
        if (sheet.kind === "table") {
            setData(withNeimpRows(data, sheet, deleteNeimpRow(sheet.map, rowKey)));
            return;
        }
        setData(withNeimpListValues(data, sheet, deleteNeimpListItem(sheet.values, Number(rowKey))));
    };

    const handleAddRow = () => {
        if (sheet.kind === "table") {
            setData(withNeimpRows(data, sheet, addNeimpRow(sheet.map, idColumn).map));
            return;
        }
        setData(withNeimpListValues(data, sheet, addNeimpListItem(sheet.values).values));
    };

    const handleDeleteColumn = sheet.kind === "table"
        ? (index: number) => setData(withNeimpRows(data, sheet, deleteNeimpColumn(sheet.map, index)))
        : undefined;

    return (
        <div style={{display: "flex", flexDirection: "column", flex: 1, minHeight: 0}}>
            {/* 规模、版本、表选择与列键说明，与下方表格分开 */}
            <div style={{marginBottom: 8, flexShrink: 0, textAlign: "left"}}>
                <div style={{display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8}}>
                    {sheet.kind === "table" ? (
                        <>
                            <span>{t('NeimpEditor.table_size_colon')}{rows.length} × {sheet.columnCount}</span>
                            <span>{t('NeimpEditor.table_version_colon')}{neimpCellText(sheet.version)}</span>
                        </>
                    ) : (
                        <span>{t('NeimpEditor.list_size_colon')}{rows.length}</span>
                    )}
                    {sheets.length > 1 && (
                        <Space.Compact>
                            <Space.Addon>{t('NeimpEditor.table')}</Space.Addon>
                            <Select
                                size="small"
                                style={{minWidth: 180}}
                                // 复合表可能有上百张表（field_data 有 128 张），必须能按路径搜
                                showSearch
                                optionFilterProp="label"
                                value={neimpTableKey(sheet)}
                                onChange={onSelectTable}
                                options={sheets.map((candidate) => ({
                                    value: neimpTableKey(candidate),
                                    label: `${neimpTableLabel(candidate, t('NeimpEditor.root_table'))} (${candidate.kind === "table" ? candidate.rows.length : candidate.values.length})`,
                                }))}
                            />
                        </Space.Compact>
                    )}
                    <Tooltip title={sheet.kind === "table" ? t('NeimpEditor.column_key_tip') : t('NeimpEditor.list_tip')}>
                        <QuestionCircleOutlined/>
                    </Tooltip>
                </div>
                {mismatchedRows > 0 && (
                    <Alert
                        type="warning"
                        showIcon
                        style={{marginTop: 8}}
                        title={t('NeimpEditor.id_mismatch_count', {rows: mismatchedRows})}
                    />
                )}
            </div>
            <NeimpTableEditor
                rows={rows}
                columnCount={sheet.kind === "table" ? sheet.columnCount : 1}
                idColumn={idColumn}
                columnLabel={sheet.kind === "table" ? undefined : t('NeimpEditor.list_value_column')}
                rowHeaderLabel={sheet.kind === "table" ? undefined : t('NeimpEditor.list_index')}
                onCellChange={handleCellChange}
                onDeleteRow={handleDeleteRow}
                onDeleteColumn={handleDeleteColumn}
                onAddRow={handleAddRow}
            />
        </div>
    );
};

export default NeimpTablePane;
