import React from "react";
import {InputNumber, Space, Switch, Tooltip, Typography} from "antd";
import {useTranslation} from "react-i18next";

/**
 * BezierParamField MagicaCloth BezierParam 曲线参数控件
 * 结构：startValue / endValue / useEndValue / curveValue / useCurveValue
 * 提供紧凑行内编辑 + 迷你曲线预览（按 MagicaCloth 的 start→end 曲线语义近似绘制）
 *
 * 五个子字段都是 BezierParam 自己的成员，不属于 ClothParams 的顶层字段，
 * 所以文案用独立的 ClothParamsEditor.bezier_* 键；说明里带上原始字段名方便对着源码看
 */

// 迷你预览尺寸
const PreviewWidth = 72;
const PreviewHeight = 28;

// bezierPreview 用 curveValue 弯曲 start→end 的近似预览曲线
function bezierPreview(item: any) {
    const start = Number(item?.startValue) || 0;
    const end = item?.useEndValue ? (Number(item?.endValue) || 0) : start;
    // 与游戏一致：CurveValue 要 useEndValue 和 useCurveValue 同时为真才有值
    const curve = (item?.useEndValue && item?.useCurveValue) ? (Number(item?.curveValue) || 0) : 0;

    // 归一化到 0-1 显示（取两端的 min/max，避免数值范围差异过大）
    const low = Math.min(start, end);
    const high = Math.max(start, end);
    const span = high - low || 1;
    const normalize = (v: number) => 1 - (v - low) / span;

    const y0 = normalize(start) * (PreviewHeight - 8) + 4;
    const y1 = normalize(end) * (PreviewHeight - 8) + 4;
    // curveValue -1..1 控制中点偏移
    const midY = (y0 + y1) / 2 - curve * (PreviewHeight / 2 - 4);

    return (
        <svg width={PreviewWidth} height={PreviewHeight}
             style={{background: "rgba(128,128,128,0.08)", borderRadius: 4, flexShrink: 0}}>
            <path
                d={`M 2 ${y0} Q ${PreviewWidth / 2} ${midY}, ${PreviewWidth - 2} ${y1}`}
                fill="none"
                stroke="#1890ff"
                strokeWidth="1.5"
            />
        </svg>
    );
}

const BezierParamField: React.FC<{
    value: any;
    onChange: (next: any) => void;
}> = ({value, onChange}) => {
    const {t} = useTranslation();
    const set = (field: string, fieldValue: any) => onChange({...value, [field]: fieldValue});

    const label = (field: string) => t(`ClothParamsEditor.bezier_${field}`, {defaultValue: field});
    const tip = (field: string) => t(`ClothParamsEditor.bezier_${field}_tip`, {defaultValue: field});

    // 数值框：标签 + 输入框整组挂 tooltip，悬停标签或框都能看到说明
    const numberBox = (field: string, disabled: boolean) => (
        <Tooltip title={tip(field)} styles={{root: {maxWidth: 380}}}>
            <Space size={4}>
                <Typography.Text type="secondary">{label(field)}</Typography.Text>
                <InputNumber
                    size="small"
                    style={{width: 86}}
                    step={0.01}
                    disabled={disabled}
                    value={value?.[field]}
                    onChange={(v) => set(field, (v ?? 0) as number)}
                />
            </Space>
        </Tooltip>
    );

    const switchBox = (field: string) => (
        <Tooltip title={tip(field)} styles={{root: {maxWidth: 380}}}>
            <Space size={4}>
                <Typography.Text type="secondary">{label(field)}</Typography.Text>
                <Switch size="small" checked={!!value?.[field]}
                        onChange={(checked) => set(field, checked)}/>
            </Space>
        </Tooltip>
    );

    return (
        <Space wrap size={6} align="center">
            {bezierPreview(value)}
            {numberBox("startValue", false)}
            <span style={{color: "#888"}}>→</span>
            {numberBox("endValue", !value?.useEndValue)}
            {switchBox("useEndValue")}
            {/* 游戏侧 CurveValue 要求 useCurveValue 与 useEndValue 同时为真，否则取 0，
                所以这里两个开关任一关掉都要置灰，不然用户改了个不生效的值 */}
            {numberBox("curveValue", !value?.useEndValue || !value?.useCurveValue)}
            {switchBox("useCurveValue")}
        </Space>
    );
};

/** 判断值是否为 BezierParam 形状 */
export function isBezierParam(value: any): boolean {
    return typeof value === "object" && value !== null && !Array.isArray(value)
        && "startValue" in value && "useEndValue" in value;
}

export default BezierParamField;
