import React from "react";
import {ColorPicker, Tooltip} from "antd";
import type {AggregationColor} from "antd/es/color-picker/color";
import {useTranslation} from "react-i18next";
import {cssRgbToInfinityColor, infinityColorToCss, InfinityColorTriple} from "../../utils/infinityColor";
import {ColorTripleRef, readTriple, writeTriple} from "../../utils/colorShapes";

/**
 * InfinityColorPicker 无限色的色块选择器
 *
 * 无限色是「对源贴图做 HSL 调整」的参数而不是颜色值，色块只能按中性明度的源像素
 * 反推（换算与出处见 utils/infinityColor.ts），所以标题上写明是参考预览。
 * 取色只写回色相/彩度/明度三项，对比度与阴影阈值原样不动。
 *
 * 用 onChange 而不是 onChangeComplete：antd 的十六进制输入框只走 onChange
 * （见 color-picker/components/ColorHexInput.js），只听 onChangeComplete 的话
 * 用户手输颜色不会写回数据。与项目里既有的 ColorPickerSync 也保持一致。
 */
const InfinityColorPicker: React.FC<{
    value: Partial<InfinityColorTriple>;
    onChange: (next: InfinityColorTriple) => void;
    size?: "small" | "medium" | "large";
    showText?: boolean;
}> = ({value, onChange, size = "small", showText}) => {
    const {t} = useTranslation();

    const handleChange = (color: AggregationColor) => {
        const rgb = color.toRgb();
        onChange(cssRgbToInfinityColor(rgb.r, rgb.g, rgb.b));
    };

    return (
        <Tooltip title={t('FieldForm.color_preview_tip')}>
            <span>
                <ColorPicker
                    size={size}
                    disabledAlpha
                    showText={showText}
                    value={infinityColorToCss(value)}
                    onChange={handleChange}
                />
            </span>
        </Tooltip>
    );
};

/**
 * ObjectTriplePicker 直接作用在宿主对象上的选色器
 * 按 ColorTripleRef 读写指定的三个键，明度的表示差异由 readTriple / writeTriple 处理
 */
export const ObjectTriplePicker: React.FC<{
    object: any;
    triple: ColorTripleRef;
    onChange: (next: any) => void;
    showText?: boolean;
}> = ({object, triple, onChange, showText}) => (
    <InfinityColorPicker
        value={readTriple(object ?? {}, triple)}
        onChange={(next) => onChange(writeTriple(object ?? {}, triple, next))}
        showText={showText}
    />
);

export default InfinityColorPicker;
