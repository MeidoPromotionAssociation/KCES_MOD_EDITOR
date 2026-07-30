import React from "react";
import {ColorPicker} from "antd";
import type {AggregationColor} from "antd/es/color-picker/color";

/**
 * ColorPickerSync 颜色选择器（复刻自 COM3D2_MOD_EDITOR MateEditor）
 * KCES 颜色分量为 0-1 浮点，与 antd ColorPicker 的 0-255 RGB 互相换算
 */
const ColorPickerSync: React.FC<{
    r: number;
    g: number;
    b: number;
    a: number;
    onChange: (r: number, g: number, b: number, a: number) => void;
}> = ({r, g, b, a, onChange}) => {
    const clamp01 = (v: number) => Math.min(1, Math.max(0, Number(v) || 0));
    const to255 = (v: number) => Math.round(clamp01(v) * 255);

    const value = `rgba(${to255(r)},${to255(g)},${to255(b)},${clamp01(a)})`;

    const handleChange = (color: AggregationColor) => {
        const rgb = color.toRgb();
        // 换算回 0-1 浮点，保留 4 位精度避免长尾小数
        const to01 = (v: number) => Math.round((v / 255) * 10000) / 10000;
        onChange(to01(rgb.r), to01(rgb.g), to01(rgb.b), Math.round(rgb.a * 10000) / 10000);
    };

    return <ColorPicker value={value} onChange={handleChange} showText/>;
};

export default ColorPickerSync;
