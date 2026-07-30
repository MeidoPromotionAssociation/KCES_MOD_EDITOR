import React, {forwardRef, useRef} from "react";
import {Button, message, Space} from "antd";
import {ExportOutlined, ImportOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import BaseFormatEditor, {BaseFormatEditorProps, FormatEditorRef} from "./common/BaseFormatEditor";
import JsonObjectForm from "./common/JsonObjectForm";
import {convertCsvToNei, convertNeiToCsv} from "../utils/formatServices";
import {
    SelectFile,
    SelectPathToSave
} from "../../bindings/github.com/MeidoPromotionAssociation/KCES_MOD_EDITOR/app";

/**
 * NeiEditor .nei 表格数据编辑器
 * 样式1：结构化表单；样式2：完整 JSON
 * 额外提供 CSV 导入/导出（.nei 与 .csv 双向转换）
 */
const NeiEditor = forwardRef<FormatEditorRef, Omit<BaseFormatEditorProps, "renderStyle1" | "renderHeader"> & {
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

    const renderStyle1 = (data: any, setData: (value: any) => void) => (
        <div style={{
            height: "calc(100vh - 250px)",
            overflow: "auto",
            textAlign: "left"
        }}>
            <JsonObjectForm value={data} onChange={setData} defaultExpandDepth={1}/>
        </div>
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
            <BaseFormatEditor {...props} ref={innerRef} renderStyle1={renderStyle1}/>
        </div>
    );
});

export default NeiEditor;
