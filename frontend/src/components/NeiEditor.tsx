import React, {forwardRef, useMemo, useRef} from "react";
import {Alert, Button, Select, Space, Tooltip} from "antd";
import {appMessage as message} from "../utils/feedback";
import {ExportOutlined, ImportOutlined, QuestionCircleOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import BaseFormatEditor, {BaseFormatEditorProps, FormatEditorRef} from "./common/BaseFormatEditor";
import NeiTableEditor from "./nei/NeiTableEditor";
import NeiCsvEditor from "./nei/NeiCsvEditor";
import {convertCsvToNei, convertNeiToCsv} from "../utils/formatServices";
import {csvColumnCount} from "../utils/csv";
import {
    SelectFile,
    SelectPathToSave
} from "../../bindings/github.com/MeidoPromotionAssociation/KCES_MOD_EDITOR/internal/app.ts";

// KCES 通过 crc.dll 解码单元格，写出必须是 UTF-8；Shift-JIS 是 COM3D2 的编码
const KcesEncoding = "UTF-8";

/**
 * NeiHeader 表格规模与单元格编码
 * 纯 ASCII 的表格无法从内容判断编码，库会报告为 Shift-JIS，此时写出与 UTF-8 字节一致，
 * 因此只有表格真的含非 ASCII 文本时才提示编码问题。
 */
const NeiHeader: React.FC<{ data: any; setData: (value: any) => void }> = ({data, setData}) => {
    const {t} = useTranslation();
    const rows: string[][] = Array.isArray(data?.Data) ? data.Data : [];
    const encoding: string = data?.TextEncoding ?? "";

    const hasNonAscii = useMemo(
        // eslint-disable-next-line no-control-regex
        () => rows.some((row) => (row ?? []).some((cell) => /[^\x00-\x7f]/.test(cell ?? ""))),
        [rows]
    );

    return (
        <div style={{marginTop: 8, textAlign: "left"}}>
            <Space wrap>
                <span>{t('NeiEditor.table_size_colon')}{rows.length} × {csvColumnCount(rows)}</span>
                <Space.Compact>
                    <Space.Addon>{t('NeiEditor.text_encoding')}</Space.Addon>
                    <Select
                        size="small"
                        style={{width: 120}}
                        value={encoding || undefined}
                        placeholder="Shift-JIS"
                        options={[{value: "UTF-8"}, {value: "Shift-JIS"}]}
                        onChange={(value) => setData({...data, TextEncoding: value})}
                    />
                </Space.Compact>
                <Tooltip title={t('NeiEditor.text_encoding_tip')}>
                    <QuestionCircleOutlined/>
                </Tooltip>
            </Space>
            {encoding !== KcesEncoding && hasNonAscii && (
                <Alert
                    type="warning"
                    showIcon
                    style={{marginTop: 8}}
                    title={t('NeiEditor.text_encoding_not_utf8')}
                />
            )}
        </div>
    );
};

/**
 * NeiEditor .nei 表格数据编辑器
 * .nei 是加密的 CSV，没有嵌套结构，所以不提供 JSON 视图：
 * 样式1 为表格编辑，样式2 为 CSV 原文编辑（与 COM3D2_MOD_EDITOR 的 NeiEditor 一致）。
 * 额外提供 CSV 导入/导出（.nei 与 .csv 双向转换）
 */
const NeiEditor = forwardRef<FormatEditorRef, Omit<BaseFormatEditorProps, "renderStyle1" | "renderStyle2" | "renderHeader"> & {
    currentPath?: string
}>((props, ref) => {
    const {t} = useTranslation();
    const innerRef = useRef<FormatEditorRef>(null);

    // 将现有 .nei 文件导出为 CSV
    const handleExportCsv = async () => {
        try {
            const input = props.fileInfo?.Path;
            if (!input || input.toLowerCase().endsWith(".json") || input.toLowerCase().endsWith(".csv")) {
                message.warning(t('NeiEditor.export_csv_need_nei'));
                return;
            }
            const output = await SelectPathToSave("*.csv", "CSV");
            if (!output) return;
            const outputPath = output.toLowerCase().endsWith(".csv") ? output : output + ".csv";
            await convertNeiToCsv(input, outputPath);
            message.success(t('Infos.success_export_file_colon') + outputPath);
        } catch (error: any) {
            console.error(error);
            message.error(t('Errors.save_file_failed_colon') + error);
        }
    };

    // 选择 CSV 文件并转换为 .nei
    const handleImportCsv = async () => {
        try {
            const input = await SelectFile("*.csv", "CSV");
            if (!input) return;
            const output = await SelectPathToSave("*.nei", t('Formats.nei'));
            if (!output) return;
            const outputPath = output.toLowerCase().endsWith(".nei") ? output : output + ".nei";
            await convertCsvToNei(input, outputPath);
            message.success(t('Infos.directly_convert_success') + outputPath, 5);
        } catch (error: any) {
            console.error(error);
            message.error(t('Errors.directly_convert_failed_colon') + error);
        }
    };

    // 表格规模与单元格编码
    const renderHeader = (data: any, setData: (value: any) => void) => (
        <NeiHeader data={data} setData={setData}/>
    );

    const renderStyle1 = (data: any, setData: (value: any) => void) => (
        <NeiTableEditor data={data} onChange={setData}/>
    );

    const renderStyle2 = (data: any, setData: (value: any) => void) => (
        <NeiCsvEditor data={data} onChange={setData}/>
    );

    React.useImperativeHandle(ref, () => ({
        handleReadFile: () => innerRef.current!.handleReadFile(),
        handleSaveFile: () => innerRef.current!.handleSaveFile(),
        handleSaveAsFile: () => innerRef.current!.handleSaveAsFile(),
    }));

    return (
        <div>
            <Space style={{margin: "8px 0 0 10px", width: "100%", justifyContent: "flex-start"}}>
                <Button size="small" icon={<ExportOutlined/>} onClick={handleExportCsv}>
                    {t('NeiEditor.export_csv')}
                </Button>
                <Button size="small" icon={<ImportOutlined/>} onClick={handleImportCsv}>
                    {t('NeiEditor.import_csv')}
                </Button>
            </Space>
            <BaseFormatEditor
                {...props}
                ref={innerRef}
                renderHeader={renderHeader}
                renderStyle1={renderStyle1}
                renderStyle2={renderStyle2}
                style1Label={t('NeiEditor.table_mode')}
                style2Label={t('NeiEditor.csv_editor_mode')}
            />
        </div>
    );
});

export default NeiEditor;
