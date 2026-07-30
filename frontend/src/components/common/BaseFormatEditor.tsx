import React, {forwardRef, useEffect, useImperativeHandle, useState} from "react";
import {Button, Collapse, ConfigProvider, Descriptions, Empty, Modal, Radio} from "antd";
import {appMessage as message} from "../../utils/feedback";
import {useTranslation} from "react-i18next";
import {Window} from "@wailsio/runtime";
import {FileInfo} from "../../../bindings/github.com/MeidoPromotionAssociation/MeidoSerialization/service/COM3D2/models";
import {KCESFormatDef, selectPattern, AppTitle, AppTitleNoAuthor} from "../../utils/consts";
import {formatServices, MaxConvertBytes} from "../../utils/formatServices";
import {editorViewModeKey} from "../../utils/LocalStorageKeys";
import {getFileName} from "../../utils/utils";
import {losslessParse, losslessStringify} from "../../utils/losslessJson";
import {editingModelPath} from "../../utils/monacoSchemas";
import MonacoJsonEditor from "./MonacoJsonEditor";
import {
    NewStructuredDocument, ReadTextFile, SelectPathToSave, WriteTextFile
} from "../../../bindings/github.com/MeidoPromotionAssociation/KCES_MOD_EDITOR/internal/app.ts";

// 大文件警告阈值 20MB
const LargeFileThreshold = 1024 * 1024 * 20;

/** FormatEditorRef 暴露给页面/NavBar 的操作方法：读取、保存、另存为 */
export interface FormatEditorRef {
    handleReadFile: () => Promise<void>;
    handleSaveFile: () => Promise<void>;
    handleSaveAsFile: () => Promise<void>;
}

export interface BaseFormatEditorProps {
    fileInfo?: FileInfo;
    format: KCESFormatDef;
    /** 样式1（结构化表单）渲染器；未提供时只有 JSON 视图 */
    renderStyle1?: (data: any, setData: (value: any) => void) => React.ReactNode;
    /** 顶部附加信息渲染器（文件头等） */
    renderHeader?: (data: any) => React.ReactNode;
}

/** 保存路径规范化结果 */
function normalizeSavePath(path: string, format: KCESFormatDef): { path: string; isJson: boolean } {
    const lower = path.toLowerCase();
    for (const suffix of format.suffixes) {
        if (lower.endsWith(suffix + ".json")) {
            return {path, isJson: true};
        }
    }
    for (const suffix of format.suffixes) {
        if (lower.endsWith(suffix)) {
            return {path, isJson: false};
        }
    }
    const primary = format.suffixes[0];
    if (lower.endsWith(".json")) {
        // 补全为 <name><suffix>.json
        if (primary.startsWith(".")) {
            return {path: path.slice(0, -".json".length) + primary + ".json", isJson: true};
        }
        return {path, isJson: true};
    }
    if (primary.startsWith(".")) {
        return {path: path + primary, isJson: false};
    }
    // paths.dat / system.dat 等固定文件名格式不自动补全，交由服务校验
    return {path, isJson: false};
}

/** 判断路径是否为编辑 JSON */
function isJsonPath(path: string): boolean {
    return path.toLowerCase().endsWith(".json");
}

/**
 * BaseFormatEditor 所有格式编辑器的公共引擎
 * - 读取/保存/另存为（原生与编辑 JSON 双格式）
 * - 大文件警告与直接转换
 * - 样式1（结构化表单）/ 样式2（Monaco JSON）视图切换
 * 与 COM3D2_MOD_EDITOR 各 XxxEditor 的行为一致
 */
const BaseFormatEditor = forwardRef<FormatEditorRef, BaseFormatEditorProps>((props, ref) => {
    const {t} = useTranslation();
    const {format} = props;
    const service = formatServices[format.key];

    const [fileInfo, setFileInfo] = useState<FileInfo | null>(props.fileInfo || null);
    const [filePath, setFilePath] = useState<string | null>(props.fileInfo?.Path || null);

    // 结构化数据对象（原生结构或编辑 JSON 解析结果）
    const [data, setData] = useState<any>(null);

    // 当前格式是否不支持新建（如 preset），用于区分空占位文案
    const [noNewDocument, setNoNewDocument] = useState(false);

    // 视图模式：1=结构化表单，2=JSON
    const [viewMode, setViewMode] = useState<1 | 2>(() => {
        const saved = localStorage.getItem(editorViewModeKey(format.key));
        const mode = saved ? (Number(saved) as 1 | 2) : 1;
        return props.renderStyle1 ? mode : 2;
    });

    // 大文件警告模态框
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [pendingFileContent, setPendingFileContent] = useState<{ size: number }>({size: 0});

    useEffect(() => {
        if (props.fileInfo) {
            setFileInfo(props.fileInfo);
            setFilePath(props.fileInfo.Path);
        }
    }, [props.fileInfo]);

    /** 组件挂载或 filePath 改变时，如果传入了 filePath 就自动读取一次 */
    useEffect(() => {
        let isMounted = true;

        if (filePath) {
            const fileName = getFileName(filePath);
            Window.SetTitle(AppTitleNoAuthor + ` —— ${t("Infos.editing_colon")}${fileName}  (${filePath})`);

            (async () => {
                try {
                    if (!isMounted) return;
                    await handleReadFile();
                } catch {
                }
            })();
        } else {
            Window.SetTitle(AppTitle);
            // 无文件时加载新文档模板（编辑后另存为即为新建文件）；不支持新建的格式保持空占位
            (async () => {
                try {
                    const text = await NewStructuredDocument(format.key);
                    if (isMounted) {
                        setNoNewDocument(false);
                        setData(losslessParse(text));
                    }
                } catch {
                    if (isMounted) {
                        setNoNewDocument(true);
                        setData(null);
                    }
                }
            })();
        }

        return () => {
            isMounted = false;
        };
    }, [filePath]);

    /** 读取文件（带大文件警告） */
    const handleReadFile = async () => {
        if (!filePath || !fileInfo) {
            message.error(t('Infos.pls_open_file_first'));
            return;
        }
        try {
            const size = fileInfo?.Size ?? 0;
            if (size > LargeFileThreshold) {
                setPendingFileContent({size});
                setIsConfirmModalOpen(true);
                return;
            }
            await handleConfirmRead(false);
        } catch (error: any) {
            console.error(error);
            message.error(t('Errors.read_foo_file_failed_colon', {file_type: format.suffixes[0]}) + error);
        }
    };

    // 确认读取文件；DirectlyConvert 为 true 时在原生与 JSON 间直接转换而不加载
    const handleConfirmRead = async (DirectlyConvert: boolean) => {
        setIsConfirmModalOpen(false);
        if (!filePath || !fileInfo) {
            message.error(t('Errors.pls_open_file_first_new_file_use_save_as'));
            return;
        }
        if (DirectlyConvert) {
            if (!service.toJson || !service.toNative) {
                message.error(t('Errors.direct_convert_not_supported'));
                setFilePath(null);
                return;
            }
            const hide = message.loading(t('Infos.converting_please_wait'), 0);
            try {
                if (isJsonPath(filePath)) {
                    const path = filePath.slice(0, -".json".length);
                    await service.toNative(filePath, path, MaxConvertBytes);
                    message.success(t('Infos.directly_convert_success') + path, 5);
                } else {
                    const path = filePath + ".json";
                    await service.toJson(filePath, path, MaxConvertBytes);
                    message.success(t('Infos.directly_convert_success') + path, 5);
                }
            } catch (error: any) {
                console.error(error);
                message.error(t('Errors.directly_convert_failed_colon') + error);
            } finally {
                setFilePath(null);
                hide();
            }
            return;
        }
        const hide = message.loading(t('Infos.loading_please_wait'));
        try {
            let text: string;
            if (isJsonPath(filePath)) {
                text = await ReadTextFile(filePath);
            } else {
                text = await service.read(filePath);
            }
            setData(losslessParse(text));
        } catch (error: any) {
            console.error(error);
            message.error(t('Errors.read_foo_file_failed_colon', {file_type: format.suffixes[0]}) + error);
        } finally {
            hide();
        }
    };

    /** 写入指定路径（自动区分原生与编辑 JSON） */
    const writeToPath = async (path: string, isJson: boolean) => {
        if (isJson) {
            await WriteTextFile(path, losslessStringify(data, 2) + "\n");
        } else {
            await service.write(path, losslessStringify(data));
        }
    };

    /** 保存文件（覆盖写回） */
    const handleSaveFile = async () => {
        if (!filePath) {
            message.error(t('Errors.pls_open_file_first_new_file_use_save_as'));
            return;
        }
        if (data === null || data === undefined) {
            message.error(t('Errors.pls_load_file_first'));
            return;
        }
        try {
            await writeToPath(filePath, isJsonPath(filePath));
            message.success(t('Infos.success_save_file'));
        } catch (error: any) {
            console.error(error);
            message.error(t('Errors.save_file_failed_colon') + error);
        }
    };

    /** 另存为文件 */
    const handleSaveAsFile = async () => {
        if (data === null || data === undefined) {
            message.error(t('Errors.pls_load_file_first'));
            return;
        }
        try {
            const chosen = await SelectPathToSave(selectPattern(format), t(`Formats.${format.key}`));
            if (!chosen) {
                // 用户取消
                return;
            }
            const {path, isJson} = normalizeSavePath(chosen, format);
            await writeToPath(path, isJson);
            message.success(t('Infos.success_save_as_file_colon') + path);
        } catch (error: any) {
            message.error(t('Errors.save_as_file_failed_colon') + (error?.message ?? error));
            console.error(error);
        }
    };

    /** 暴露给父组件的 Ref 方法：读取、保存、另存为 */
    useImperativeHandle(ref, () => ({
        handleReadFile,
        handleSaveFile,
        handleSaveAsFile
    }));

    const hasStyle1 = !!props.renderStyle1;

    return (
        <div style={{padding: 10}}>
            <Modal
                title={t('Infos.large_file_waring')}
                open={isConfirmModalOpen}
                onCancel={() => setIsConfirmModalOpen(false)}
                footer={[
                    <Button key="convert" type="primary" onClick={() => handleConfirmRead(true)}>
                        {t('Common.convert_directly')}
                    </Button>,
                    <Button key="cancel" onClick={() => {
                        setIsConfirmModalOpen(false);
                        setFilePath(null);
                    }}>
                        {t('Common.cancel')}
                    </Button>,
                    <Button key="confirm" onClick={() => handleConfirmRead(false)}>
                        {t('Common.continue')}
                    </Button>
                ]}
            >
                <p>{t('Infos.file_too_large_tip', {size: (pendingFileContent?.size / 1024 / 1024).toFixed(2)})}</p>
                <p>{t('Infos.file_too_large_convert_to_json_directly')}</p>
            </Modal>
            <ConfigProvider
                theme={{
                    components: {
                        Form: {
                            itemMarginBottom: 10
                        }
                    }
                }}
            >
                {/* 文件信息 */}
                {fileInfo && (
                    <Collapse
                        size="small"
                        items={[{
                            key: "fileinfo",
                            label: t('Common.file_info'),
                            children: (
                                <Descriptions size="small" column={3}>
                                    <Descriptions.Item label={t('Common.file_type')}>{fileInfo.FileType}</Descriptions.Item>
                                    <Descriptions.Item
                                        label={t('Common.storage_format')}>{fileInfo.StorageFormat}</Descriptions.Item>
                                    <Descriptions.Item
                                        label={t('Common.file_size')}>{(fileInfo.Size / 1024).toFixed(2)} KB</Descriptions.Item>
                                </Descriptions>
                            ),
                        }]}
                    />
                )}

                {props.renderHeader && data !== null && props.renderHeader(data)}

                <div style={{marginBottom: 8, marginTop: 8}}>
                    <Radio.Group
                        block
                        value={viewMode}
                        onChange={(e) => {
                            setViewMode(e.target.value);
                            localStorage.setItem(editorViewModeKey(format.key), e.target.value.toString());
                        }}
                        options={[
                            {label: t('Common.style1'), value: 1, disabled: !hasStyle1},
                            {label: t('Common.style2'), value: 2},
                        ]}
                        optionType="button"
                        buttonStyle="solid"
                    />
                </div>

                {data === null || data === undefined ? (
                    <Empty
                        description={noNewDocument ? t('Infos.format_no_new_document') : t('Infos.pls_select_a_file_to_edit')}
                        style={{marginTop: 100}}
                    />
                ) : (
                    <>
                        {viewMode === 1 && hasStyle1 && props.renderStyle1!(data, setData)}
                        {viewMode === 2 && (
                            <MonacoJsonEditor data={data} setData={setData} path={editingModelPath(format.key)}/>
                        )}
                    </>
                )}
            </ConfigProvider>
        </div>
    );
});

export default BaseFormatEditor;
