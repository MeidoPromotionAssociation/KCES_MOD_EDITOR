import React, {useEffect, useMemo, useState} from "react";
import {Button, Input, Table, Tooltip} from "antd";
import {DeleteOutlined, PlusOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import {csvColumnCount} from "../../utils/csv";

/**
 * NeiTableEditor .nei 表格视图
 * 复刻 COM3D2_MOD_EDITOR 的 nei/NeiTableEditor：逐单元格编辑 + 增删行列。
 * .nei 表格常有上千行，这里用 antd 的虚拟滚动表格渲染，因此每列都必须给定宽度。
 * 每次修改都同步回 Rows/Cols，避免保存时行列数与实际数据不一致。
 */

const CellWidth = 200; // 数据列宽（虚拟表格要求固定宽度）
const IndexWidth = 60; // 行号列宽
const ActionWidth = 60; // 操作列宽

const NeiTableEditor: React.FC<{
    data: any;
    onChange: (value: any) => void;
}> = ({data, onChange}) => {
    const {t} = useTranslation();

    const rows: string[][] = Array.isArray(data?.Data) ? data.Data : [];
    const colCount = Math.max(1, csvColumnCount(rows));

    // 虚拟表格需要数值高度，随窗口变化重算
    const [tableHeight, setTableHeight] = useState(() => Math.max(240, window.innerHeight - 330));
    useEffect(() => {
        const onResize = () => setTableHeight(Math.max(240, window.innerHeight - 330));
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

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

    const columns = useMemo(() => {
        const result: any[] = [{
            title: "#",
            key: "__index",
            width: IndexWidth,
            fixed: "left",
            render: (_: any, __: any, index: number) => (
                <span style={{color: "#888"}}>{index + 1}</span>
            ),
        }];

        for (let i = 0; i < colCount; i++) {
            result.push({
                title: (
                    <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4}}>
                        <span>{`${t('NeiEditor.column')} ${i + 1}`}</span>
                        <Tooltip title={t('NeiEditor.delete_column')}>
                            <Button
                                type="text"
                                size="small"
                                danger
                                icon={<DeleteOutlined/>}
                                onClick={() => handleDeleteColumn(i)}
                            />
                        </Tooltip>
                    </div>
                ),
                key: i,
                width: CellWidth,
                render: (_: any, record: any) => (
                    <Input
                        size="small"
                        value={rows[record.__index]?.[i] ?? ""}
                        onChange={(e) => handleCellChange(record.__index, i, e.target.value)}
                    />
                ),
            });
        }

        result.push({
            title: t('Common.operate'),
            key: "__action",
            width: ActionWidth,
            fixed: "right",
            render: (_: any, record: any) => (
                <Tooltip title={t('NeiEditor.delete_row')}>
                    <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined/>}
                        onClick={() => handleDeleteRow(record.__index)}
                    />
                </Tooltip>
            ),
        });

        return result;
    }, [rows, colCount, t]);

    const dataSource = useMemo(
        () => rows.map((_, index) => ({key: index, __index: index})),
        [rows]
    );

    return (
        <div style={{textAlign: "left"}}>
            <Table
                virtual
                dataSource={dataSource}
                columns={columns}
                rowKey="key"
                size="small"
                bordered
                pagination={false}
                scroll={{x: IndexWidth + colCount * CellWidth + ActionWidth, y: tableHeight}}
                footer={() => (
                    <>
                        <Button type="primary" icon={<PlusOutlined/>} onClick={handleAddRow} style={{marginRight: 8}}>
                            {t('NeiEditor.add_row')}
                        </Button>
                        <Button icon={<PlusOutlined/>} onClick={handleAddColumn}>
                            {t('NeiEditor.add_column')}
                        </Button>
                    </>
                )}
            />
        </div>
    );
};

export default NeiTableEditor;
