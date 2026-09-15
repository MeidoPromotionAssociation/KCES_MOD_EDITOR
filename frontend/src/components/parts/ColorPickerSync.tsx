import React, {useEffect, useRef} from "react";
import {ColorPicker} from "antd";
import type {AggregationColor} from "antd/es/color-picker/color";

/**
 * ColorPickerSync 颜色选择器（复刻自 COM3D2_MOD_EDITOR MateEditor）
 * KCES 颜色分量为 0-1 浮点，与 antd ColorPicker 的 0-255 RGB 互相换算
 *
 * 拖动色板时 onChange 每次移动都触发，每次都回填会让整个材质表单重建（属性多时拖起来发涩），
 * 所以拖动中按 CommitInterval 节流回填，松手（onChangeComplete）再立刻补上最后一次。
 * 不能只听 onChangeComplete：十六进制输入框只走 onChange，那样手输颜色不会写回数据。
 */
const CommitInterval = 200;

/** 0-1 浮点与 0-255 整数互转，回填保留 4 位精度避免长尾小数 */
const clamp01 = (v: number) => Math.min(1, Math.max(0, Number(v) || 0));
const to255 = (v: number) => Math.round(clamp01(v) * 255);
const to01 = (v: number) => Math.round((v / 255) * 10000) / 10000;

const ColorPickerSync: React.FC<{
    r: number;
    g: number;
    b: number;
    a: number;
    onChange: (r: number, g: number, b: number, a: number) => void;
}> = ({r, g, b, a, onChange}) => {
    const value = `rgba(${to255(r)},${to255(g)},${to255(b)},${clamp01(a)})`;

    // 节流状态：上次回填的时刻、等着回填的值、以及它的兜底定时器
    const lastCommit = useRef(0);
    const pending = useRef<[number, number, number, number] | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const readColor = (color: AggregationColor): [number, number, number, number] => {
        const rgb = color.toRgb();
        return [to01(rgb.r), to01(rgb.g), to01(rgb.b), Math.round(rgb.a * 10000) / 10000];
    };

    const commit = (next: [number, number, number, number]) => {
        if (timer.current !== null) {
            clearTimeout(timer.current);
            timer.current = null;
        }
        pending.current = null;
        lastCommit.current = Date.now();
        onChange(next[0], next[1], next[2], next[3]);
    };

    const handleChange = (color: AggregationColor) => {
        const next = readColor(color);
        const elapsed = Date.now() - lastCommit.current;
        if (elapsed >= CommitInterval) {
            commit(next);
            return;
        }
        // 间隔内的连续变化只留最后一次，到点回填；定时器兜底保证尾值不会丢
        pending.current = next;
        if (timer.current === null) {
            timer.current = setTimeout(() => {
                timer.current = null;
                if (pending.current) commit(pending.current);
            }, CommitInterval - elapsed);
        }
    };

    // 松开色板时把尾值立刻落下去，不必再等定时器
    const handleComplete = (color: AggregationColor) => commit(readColor(color));

    useEffect(() => () => {
        if (timer.current !== null) clearTimeout(timer.current);
    }, []);

    return (
        <ColorPicker
            value={value}
            onChange={handleChange}
            onChangeComplete={handleComplete}
            showText
        />
    );
};

export default ColorPickerSync;