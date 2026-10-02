import React from "react";
import {Button, Image, Space, theme, Tooltip, Typography} from "antd";
import {QuestionCircleOutlined, ReloadOutlined, ZoomInOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import {appMessage as message} from "../../utils/feedback";

/**
 * PresetThumbnail .preset 的缩略图
 *
 * thumbnail 字段是裸 base64（没有 data: 前缀），内容是一张 PNG
 * （实测样本以 iVBORw0KGgo 开头，即 PNG 的魔数），这里按魔数嗅探 MIME 再解码显示。
 * 替换走本地图片文件：FileReader 读成 data URL 后只取逗号之后的部分写回，
 * 保持与游戏写出的格式一致（不带前缀）。
 *
 * 预览图用 antd 的 Image 渲染，点击即可放大（与 Texture2DEditor 的预览一致）。
 */

/** 按 base64 头部判断图片类型：PNG 是 iVBORw0KGgo，JPEG 是 /9j/ */
function sniffMime(base64: string): string {
    if (base64.startsWith("iVBORw0KGgo")) {
        return "image/png";
    }
    if (base64.startsWith("/9j/")) {
        return "image/jpeg";
    }
    if (base64.startsWith("R0lGOD")) {
        return "image/gif";
    }
    if (base64.startsWith("UklGR")) {
        return "image/webp";
    }
    return "image/png";
}

/** base64 长度 → 原始字节数（按 padding 修正） */
function decodedBytes(base64: string): number {
    const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
    return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

/** 人类可读的字节数 */
function formatBytes(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

const PresetThumbnail: React.FC<{
    /** 裸 base64，空串表示没有缩略图 */
    value: string;
    onChange: (next: string) => void;
}> = ({value, onChange}) => {
    const {t} = useTranslation();
    const {token} = theme.useToken();
    const fileRef = React.useRef<HTMLInputElement | null>(null);
    const [size, setSize] = React.useState<{width: number; height: number} | null>(null);

    const base64 = typeof value === "string" ? value : "";
    const src = base64 ? `data:${sniffMime(base64)};base64,${base64}` : "";

    // 尺寸不能用 antd Image 的 onLoad 去量：rc-image 内部把 onLoad 透传给外层 div，
    // 而 img 上挂的是它自己的 onLoad（只做 setStatus），事件里拿不到 naturalWidth，
    // 结果会显示成 undefined × undefined。这里用独立的 Image 对象加载图片来量。
    React.useEffect(() => {
        setSize(null);
        if (!src) {
            return;
        }
        let alive = true;
        const probe = new window.Image();
        probe.onload = () => {
            if (alive) {
                setSize({width: probe.naturalWidth, height: probe.naturalHeight});
            }
        };
        probe.src = src;
        return () => {
            alive = false;
        };
    }, [src]);

    const handlePick = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        // 清掉 input 的值，否则连续选同一个文件不会再触发 change
        event.target.value = "";
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const result = typeof reader.result === "string" ? reader.result : "";
            const comma = result.indexOf(",");
            if (comma < 0) {
                message.error(t('PresetEditor.thumbnail_read_failed'));
                return;
            }
            // 只保留逗号之后的裸 base64，和游戏写出的字段格式一致
            onChange(result.slice(comma + 1));
            message.success(t('PresetEditor.thumbnail_replaced'));
        };
        reader.onerror = () => message.error(t('PresetEditor.thumbnail_read_failed'));
        reader.readAsDataURL(file);
    };

    return (
        <div style={{display: "flex", alignItems: "flex-start", gap: 12}}>
            <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{display: "none"}}
                onChange={handlePick}
            />
            <div
                style={{
                    width: 96,
                    height: 144,
                    flexShrink: 0,
                    borderRadius: token.borderRadius,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    background: token.colorFillQuaternary,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                }}
            >
                {src ? (
                    <Image
                        src={src}
                        alt={t('PresetEditor.thumbnail')}
                        style={{maxWidth: "100%", maxHeight: "100%", objectFit: "contain", cursor: "zoom-in"}}
                        // 鼠标移上去给一层遮罩提示可点击，点开后由 antd 的大图预览接管
                        preview={{
                            mask: (
                                <Space orientation="vertical" size={2}>
                                    <ZoomInOutlined/>
                                    <Typography.Text style={{fontSize: 12}}>
                                        {t('PresetEditor.thumbnail_zoom')}
                                    </Typography.Text>
                                </Space>
                            ),
                        }}
                    />
                ) : (
                    <Typography.Text type="secondary" style={{fontSize: 12}}>
                        {t('PresetEditor.thumbnail_empty')}
                    </Typography.Text>
                )}
            </div>
            <div style={{flex: 1, minWidth: 0, textAlign: "left"}}>
                <Space size={4} align="center">
                    <Typography.Text strong>{t('PresetEditor.thumbnail')}</Typography.Text>
                    <Tooltip title={t('PresetEditor.thumbnail_tip')}>
                        <QuestionCircleOutlined style={{color: "#aaa"}}/>
                    </Tooltip>
                </Space>
                <div style={{marginTop: 4}}>
                    <Typography.Text type="secondary" style={{fontSize: 12}}>
                        {size
                            ? `${size.width} × ${size.height} · ${formatBytes(decodedBytes(base64))}`
                            : base64
                                ? formatBytes(decodedBytes(base64))
                                : t('PresetEditor.thumbnail_empty')}
                    </Typography.Text>
                </div>
                <div style={{marginTop: 8}}>
                    <Button size="small" icon={<ReloadOutlined/>} onClick={() => fileRef.current?.click()}>
                        {t('PresetEditor.thumbnail_replace')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default PresetThumbnail;
