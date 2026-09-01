import {forwardRef, useEffect, useImperativeHandle, useState} from "react";
import {Alert, Button, Card, Descriptions, Empty, Image, Radio, Space, Spin, Tooltip, Typography, theme} from "antd";
import {
    ExportOutlined,
    FileImageOutlined,
    QuestionCircleOutlined,
    ReloadOutlined,
    SaveOutlined,
    SwapOutlined,
    ThunderboltOutlined,
} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import {Window} from "@wailsio/runtime";
import {appMessage as message, appModal} from "../utils/feedback";
import {FileInfo} from "../../bindings/github.com/MeidoPromotionAssociation/MeidoSerialization/v2/service/COM3D2/models";
import {Texture2DInfo} from "../../bindings/github.com/MeidoPromotionAssociation/KCES_MOD_EDITOR/internal/models";
import {
    CheckImageMagick,
    CopyTexture2DFile,
    ExportTexture2DImage,
    FileExists,
    ImportImageAsTexture2D,
    IsTexture2DFile,
    PreviewImage,
    PreviewTexture2D,
    ReadTexture2DInfo,
} from "../../bindings/github.com/MeidoPromotionAssociation/KCES_MOD_EDITOR/internal/texture2dservice";
import {SelectFile, SelectPathToSaveAs} from "../../bindings/github.com/MeidoPromotionAssociation/KCES_MOD_EDITOR/internal/app";
import {AppTitle, AppTitleNoAuthor, KCESFormatDef, Texture2DImageSuffixes} from "../utils/consts";
import {Texture2DExportFormatKey} from "../utils/LocalStorageKeys";
import type {FormatEditorRef} from "./common/BaseFormatEditor";
import {getFileName} from "../utils/utils";

/**
 * Texture2DEditor KCES 贴图（独立 Unity Texture2D 主文件）的查看与转换
 *
 * KCES 的贴图不是 COM3D2 的 CM3D2_TEX，而是带内嵌 TypeTree 的独立 Unity Texture2D 对象，
 * aba 规范化解包写成 Texture2D/<名字>.tex。因为它不是结构化 JSON，所以不走 BaseFormatEditor，
 * 而是自行实现 FormatEditorRef 以复用 NavBar 的打开/保存/另存为与快捷键。
 *
 * 三个动作：
 *   快速导出同名文件（Ctrl+S）：贴图 → 同目录同名图像，图像 → 同目录同名贴图，与
 *     COM3D2_MOD_EDITOR 的 TexEditor 一致；目标已存在时先确认再覆盖
 *   写回贴图：把「替换图像」重建进当前打开的贴图文件，用于换贴图
 *   另存为（Alt+S）：自行选目标，图像后缀则导出图像，贴图后缀则写出贴图
 *
 * PNG 预览与 PNG 导出由库调用 ImageMagick 完成（压缩格式如 DXT5 只能靠它解码），
 * 未安装时给出提示；DDS 导出是纯 Go 的，不受影响。
 */

/** 图像后缀（含 dds）：另存为时据此决定是导出图像还是写出贴图 */
const ImageOutputSuffixes = [...Texture2DImageSuffixes, ".dds"];

/** 贴图后缀，按长的优先匹配，用于换算同名文件 */
const TextureSuffixes = [".texture2d.bytes", ".tex.bytes", ".texture2d", ".tex"];

function hasImageSuffix(path: string): boolean {
    const lower = path.toLowerCase();
    return ImageOutputSuffixes.some((suffix) => lower.endsWith(suffix));
}

function isSourceImage(path: string): boolean {
    const lower = path.toLowerCase();
    return Texture2DImageSuffixes.some((suffix) => lower.endsWith(suffix));
}

/** 去掉贴图或图像后缀，得到用于拼同名文件的基名 */
function stripKnownSuffix(path: string): string {
    const lower = path.toLowerCase();
    for (const suffix of [...TextureSuffixes, ...ImageOutputSuffixes]) {
        if (lower.endsWith(suffix)) {
            return path.slice(0, -suffix.length);
        }
    }
    return path.replace(/\.[^/\\.]+$/, "");
}

/**
 * siblingPath 换算「快速导出同名文件」的目标路径
 *
 * 贴图 → <基名>.<png|dds>，图像 → <基名>.tex。用 .tex 而不是 .texture2d 是有意的：
 * 库按输出文件名推断资源名（inferAssetNameForPack），实测 <基名>.tex、<基名>.tex.bytes、
 * <基名>.png、<基名>.tex.png 都还原成 "<基名>.tex"，而 <基名>.texture2d 会得到 "<基名>"，
 * 也就是丢掉 .tex，与规范化解包出来的资源名不一致。
 */
function siblingPath(path: string, exportFormat: "png" | "dds", openedImage: boolean): string {
    const base = stripKnownSuffix(path);
    return openedImage ? `${base}.tex` : `${base}.${exportFormat}`;
}

/** directoryOf 取路径所在目录，供保存对话框预填 */
function directoryOf(path: string): string {
    const index = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
    return index >= 0 ? path.slice(0, index) : "";
}

export interface Texture2DEditorProps {
    fileInfo?: FileInfo;
    format: KCESFormatDef;
}

const Texture2DEditor = forwardRef<FormatEditorRef, Texture2DEditorProps>((props, ref) => {
    const {t} = useTranslation();
    const {token} = theme.useToken();

    const [filePath, setFilePath] = useState<string | null>(props.fileInfo?.Path ?? null);
    const [preview, setPreview] = useState<string | null>(null);
    const [info, setInfo] = useState<Texture2DInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [magickReady, setMagickReady] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);

    // 待写入的替换图像；为空表示打开的贴图还没有改动
    const [pendingImage, setPendingImage] = useState<string | null>(null);

    const [exportFormat, setExportFormat] = useState<"png" | "dds">(
        () => (localStorage.getItem(Texture2DExportFormatKey) as "png" | "dds") || "png"
    );

    useEffect(() => {
        CheckImageMagick().then(setMagickReady).catch(() => setMagickReady(false));
    }, []);

    useEffect(() => {
        if (props.fileInfo?.Path) {
            setFilePath(props.fileInfo.Path);
            setPendingImage(null);
        }
    }, [props.fileInfo]);

    /** 载入当前路径：贴图读元数据并转 PNG 预览，图像直接预览 */
    const loadFile = async (path: string | null, imageOverride?: string | null) => {
        const previewTarget = imageOverride ?? path;
        if (!path || !previewTarget) return;
        setLoading(true);
        setError(null);
        try {
            const isTexture = !imageOverride && await IsTexture2DFile(path);
            if (isTexture) {
                setInfo(await ReadTexture2DInfo(path));
                const shot = await PreviewTexture2D(path);
                setPreview(`data:${shot.mime};base64,${shot.base64}`);
            } else {
                setInfo(null);
                const shot = await PreviewImage(previewTarget);
                setPreview(`data:${shot.mime};base64,${shot.base64}`);
            }
        } catch (err: any) {
            setPreview(null);
            setError(String(err?.message ?? err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (filePath) {
            Window.SetTitle(`${AppTitleNoAuthor} —— ${t("Infos.editing_colon")}${getFileName(filePath)}  (${filePath})`);
            // 打开的是图像时，它本身就是待写入的源
            const asSource = isSourceImage(filePath) ? filePath : null;
            setPendingImage(asSource);
            void loadFile(filePath, asSource);
        } else {
            Window.SetTitle(AppTitle);
            setPreview(null);
            setInfo(null);
        }
    }, [filePath]);

    /** 选择一张图像作为替换源 */
    const handlePickImage = async () => {
        try {
            const chosen = await SelectFile(
                Texture2DImageSuffixes.map((suffix) => `*${suffix}`).join(";"),
                t('Texture2DEditor.image_file')
            );
            if (!chosen) return;
            setPendingImage(chosen);
            await loadFile(filePath ?? chosen, chosen);
            if (!filePath) setFilePath(chosen);
            message.success(t('Texture2DEditor.image_picked'));
        } catch (err: any) {
            message.error(t('Errors.file_selection_error_colon') + err);
        }
    };

    /** 导出为图像（png / dds），文件名预填为同名文件 */
    const handleExportImage = async () => {
        if (!filePath || !info) {
            message.error(t('Texture2DEditor.no_texture_loaded'));
            return;
        }
        try {
            const suggestion = siblingPath(filePath, exportFormat, false);
            const chosen = await SelectPathToSaveAs(
                `*.${exportFormat}`,
                t('Texture2DEditor.image_file'),
                directoryOf(suggestion),
                getFileName(suggestion)
            );
            if (!chosen) return;
            const target = hasImageSuffix(chosen) ? chosen : `${chosen}.${exportFormat}`;
            await ExportTexture2DImage(filePath, target, exportFormat);
            message.success(t('Infos.success_save_as_file_colon') + target);
        } catch (err: any) {
            message.error(t('Errors.save_as_file_failed_colon') + (err?.message ?? err));
        }
    };

    /**
     * 快速导出同名文件：贴图 → 同目录同名图像，图像 → 同目录同名贴图
     * 不弹保存对话框，但目标已存在时先让用户确认，避免一个快捷键静默覆盖文件
     */
    const handleQuickExport = async () => {
        if (!filePath) {
            message.error(t('Errors.pls_open_file_first_new_file_use_save_as'));
            return;
        }
        const openedImage = isSourceImage(filePath);
        if (!openedImage && !info) {
            message.error(t('Texture2DEditor.no_texture_loaded'));
            return;
        }
        const target = siblingPath(filePath, exportFormat, openedImage);

        const run = async () => {
            try {
                if (openedImage) {
                    await ImportImageAsTexture2D(filePath, target);
                } else {
                    await ExportTexture2DImage(filePath, target, exportFormat);
                }
                message.success(t('Texture2DEditor.quick_export_done', {path: target}));
            } catch (err: any) {
                message.error(t('Texture2DEditor.quick_export_failed') + (err?.message ?? err));
            }
        };

        if (await FileExists(target)) {
            appModal.confirm({
                title: t('Texture2DEditor.overwrite_title'),
                content: t('Texture2DEditor.overwrite_tip', {path: target}),
                okText: t('Texture2DEditor.overwrite_ok'),
                cancelText: t('Common.cancel'),
                onOk: run,
            });
            return;
        }
        await run();
    };

    /** 写回贴图：把选好的替换图像重建进当前打开的贴图文件 */
    const handleWriteBack = async () => {
        if (!filePath) {
            message.error(t('Errors.pls_open_file_first_new_file_use_save_as'));
            return;
        }
        if (!pendingImage) {
            message.warning(t('Texture2DEditor.nothing_to_write_back'));
            return;
        }
        if (isSourceImage(filePath)) {
            // 打开的就是图像，覆盖写回会把图像换成贴图，得让用户明确选目标
            message.warning(t('Texture2DEditor.use_save_as_for_image'));
            return;
        }
        try {
            await ImportImageAsTexture2D(pendingImage, filePath);
            message.success(t('Infos.success_save_file'));
            setPendingImage(null);
            await loadFile(filePath);
        } catch (err: any) {
            message.error(t('Errors.save_file_failed_colon') + (err?.message ?? err));
        }
    };

    /** 另存为：目标是图像后缀就导出图像，否则写出贴图（无改动时原样复制以保住压缩格式） */
    const handleSaveAsFile = async () => {
        if (!filePath) {
            message.error(t('Errors.pls_open_file_first_new_file_use_save_as'));
            return;
        }
        try {
            const pattern = `*.tex;*.texture2d;*.${exportFormat}`;
            const suggestion = siblingPath(filePath, exportFormat, isSourceImage(filePath));
            const chosen = await SelectPathToSaveAs(
                pattern,
                t(`Formats.${props.format.key}`),
                directoryOf(suggestion),
                getFileName(suggestion)
            );
            if (!chosen) return;

            if (hasImageSuffix(chosen)) {
                if (!info) {
                    message.error(t('Texture2DEditor.no_texture_loaded'));
                    return;
                }
                const format = chosen.toLowerCase().endsWith(".dds") ? "dds" : "png";
                await ExportTexture2DImage(filePath, chosen, format);
                message.success(t('Infos.success_save_as_file_colon') + chosen);
                return;
            }

            const target = /\.[a-z0-9]+$/i.test(chosen) ? chosen : `${chosen}.tex`;
            if (pendingImage) {
                await ImportImageAsTexture2D(pendingImage, target);
            } else {
                await CopyTexture2DFile(filePath, target);
            }
            message.success(t('Infos.success_save_as_file_colon') + target);
        } catch (err: any) {
            message.error(t('Errors.save_as_file_failed_colon') + (err?.message ?? err));
        }
    };

    useImperativeHandle(ref, () => ({
        handleReadFile: async () => {
            setPendingImage(isSourceImage(filePath ?? "") ? filePath : null);
            await loadFile(filePath);
        },
        // Ctrl+S 走快速导出同名文件，与 COM3D2_MOD_EDITOR 的 TexEditor 一致；
        // 把替换图像写回原贴图是另一个动作（工具栏与提示条上的「写回贴图」）
        handleSaveFile: handleQuickExport,
        handleSaveAsFile,
    }));

    const canExport = !!info;
    const openedImage = isSourceImage(filePath ?? "");
    const quickTarget = filePath ? siblingPath(filePath, exportFormat, openedImage) : "";

    return (
        <div style={{padding: 10, textAlign: "left"}}>
            {magickReady === false && (
                <Alert
                    type="warning"
                    showIcon
                    style={{marginBottom: 8}}
                    title={t('Texture2DEditor.no_magick')}
                    description={t('Texture2DEditor.no_magick_tip')}
                />
            )}

            <Space wrap style={{marginBottom: 8}}>
                <Tooltip title={filePath
                    ? t('Texture2DEditor.quick_export_tip', {path: getFileName(quickTarget)})
                    : t('Texture2DEditor.quick_export_hint')}>
                    <Button type="primary" icon={<ThunderboltOutlined/>}
                            disabled={!filePath || (!openedImage && !canExport)}
                            onClick={handleQuickExport}>
                        {t('Texture2DEditor.quick_export')}
                    </Button>
                </Tooltip>
                <Tooltip title={t('Texture2DEditor.pick_image_tip')}>
                    <Button icon={<FileImageOutlined/>} onClick={handlePickImage}>
                        {t('Texture2DEditor.pick_image')}
                    </Button>
                </Tooltip>
                <Tooltip title={t('Texture2DEditor.write_back_tip')}>
                    <Button icon={<SaveOutlined/>} disabled={!pendingImage || openedImage}
                            onClick={handleWriteBack}>
                        {t('Texture2DEditor.write_back')}
                    </Button>
                </Tooltip>
                <Tooltip title={t('Texture2DEditor.export_format_tip')}>
                    <Radio.Group
                        size="small"
                        optionType="button"
                        buttonStyle="solid"
                        value={exportFormat}
                        options={[{label: "PNG", value: "png"}, {label: "DDS", value: "dds"}]}
                        onChange={(e) => {
                            setExportFormat(e.target.value);
                            localStorage.setItem(Texture2DExportFormatKey, e.target.value);
                        }}
                    />
                </Tooltip>
                <Button icon={<ExportOutlined/>} disabled={!canExport} onClick={handleExportImage}>
                    {t('Texture2DEditor.export_image')}
                </Button>
                <Button
                    icon={<ReloadOutlined/>}
                    disabled={!filePath}
                    onClick={() => {
                        setPendingImage(isSourceImage(filePath ?? "") ? filePath : null);
                        void loadFile(filePath);
                    }}
                >
                    {t('Texture2DEditor.reload')}
                </Button>
                {/* 「选择替换图像」这类按钮光看名字看不出用途，用途说明挂在这个问号上 */}
                <Tooltip title={<div style={{maxWidth: 420}}>{t('Texture2DEditor.usage')}</div>}>
                    <QuestionCircleOutlined style={{color: token.colorTextDescription, cursor: "help"}}/>
                </Tooltip>
            </Space>

            {pendingImage && (
                <Alert
                    type="info"
                    showIcon
                    icon={<SwapOutlined/>}
                    style={{marginBottom: 8}}
                    title={t('Texture2DEditor.pending_image')}
                    description={t('Texture2DEditor.pending_image_tip', {path: getFileName(pendingImage)})}
                    // Ctrl+S 是快速导出，写回原贴图得走这里，所以把动作直接放在提示条上
                    action={!openedImage && (
                        <Button size="small" type="primary" icon={<SaveOutlined/>} onClick={handleWriteBack}>
                            {t('Texture2DEditor.write_back')}
                        </Button>
                    )}
                />
            )}

            {info && (
                // 页面底色是固定的浅色渐变，深色主题下不铺底色标签会看不清；
                // 与资产列表、各 Table 一样用 colorBgContainer 打底
                <div style={{
                    marginBottom: 8,
                    padding: "8px 12px",
                    background: token.colorBgContainer,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    borderRadius: token.borderRadius,
                }}>
                    <Descriptions size="small" column={4} style={{marginBottom: -8}}>
                        <Descriptions.Item label={t('Texture2DEditor.asset_name')}>{info.name}</Descriptions.Item>
                        <Descriptions.Item label={t('Texture2DEditor.size')}>
                            {info.width} × {info.height}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('Texture2DEditor.format')}>{info.formatName}</Descriptions.Item>
                        <Descriptions.Item label={t('Texture2DEditor.mip_count')}>{info.mipCount}</Descriptions.Item>
                        <Descriptions.Item label={t('Texture2DEditor.inline_bytes')}>
                            {(info.inlineBytes / 1024).toFixed(2)} KB
                        </Descriptions.Item>
                        {info.streamPath && (
                            <Descriptions.Item label={t('Texture2DEditor.stream_data')} span={3}>
                                {info.streamPath} ({info.streamBytes} B)
                            </Descriptions.Item>
                        )}
                    </Descriptions>
                </div>
            )}

            {error && (
                <Alert type="error" showIcon style={{marginBottom: 8}}
                       title={t('Texture2DEditor.load_failed')} description={error}/>
            )}

            <Spin spinning={loading} description={t('Infos.loading_please_wait')}>
                <Card
                    style={{
                        minHeight: "calc(100vh - 260px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        // 贴图多为带透明通道的 PNG，铺一层棋盘格才看得出 alpha
                        backgroundColor: token.colorBgContainer,
                        backgroundImage:
                            `linear-gradient(45deg, ${token.colorFillSecondary} 25%, transparent 25%),` +
                            `linear-gradient(-45deg, ${token.colorFillSecondary} 25%, transparent 25%),` +
                            `linear-gradient(45deg, transparent 75%, ${token.colorFillSecondary} 75%),` +
                            `linear-gradient(-45deg, transparent 75%, ${token.colorFillSecondary} 75%)`,
                        backgroundSize: "20px 20px",
                        backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0",
                    }}
                >
                    {preview ? (
                        <Image src={preview} alt={info?.name ?? getFileName(filePath ?? "")}
                               style={{maxWidth: "100%", maxHeight: "calc(100vh - 320px)"}}/>
                    ) : (
                        <Empty
                            description={
                                <Space orientation="vertical">
                                    <Typography.Text type="secondary">
                                        {filePath
                                            ? t('Texture2DEditor.no_preview')
                                            : t('Texture2DEditor.select_to_preview')}
                                    </Typography.Text>
                                </Space>
                            }
                        />
                    )}
                </Card>
            </Spin>
        </div>
    );
});

export default Texture2DEditor;
