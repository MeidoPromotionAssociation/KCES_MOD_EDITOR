import React from "react";
import {InputNumber, Space, Switch, Tooltip} from "antd";

/**
 * BezierParamField MagicaCloth BezierParam 曲线参数控件
 * 结构：startValue / endValue / useEndValue / curveValue / useCurveValue
 * 提供紧凑行内编辑 + 迷你曲线预览（按 MagicaCloth 的 start→end 曲线语义近似绘制）
 */

// 迷你预览尺寸
const PreviewWidth = 72;
const PreviewHeight = 28;

// bezierPreview 用 curveValue 弯曲 start→end 的近似预览曲线
function bezierPreview(item: any) {
    const start = Number(item?.startValue) || 0;
    const end = item?.useEndValue ? (Number(item?.endValue) || 0) : start;
    const curve = item?.useCurveValue ? (Number(item?.curveValue) || 0) : 0;

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
    const set = (field: string, fieldValue: any) => onChange({...value, [field]: fieldValue});

    const numberBox = (field: string, disabled: boolean, tip: string) => (
        <Tooltip title={tip}>
            <span>
                <InputNumber
                    size="small"
                    style={{width: 86}}
                    step={0.01}
                    disabled={disabled}
                    value={value?.[field]}
                    onChange={(v) => set(field, (v ?? 0) as number)}
                />
            </span>
        </Tooltip>
    );

    return (
        <Space wrap size={6} align="center">
            {bezierPreview(value)}
            {numberBox("startValue", false, "startValue")}
            <span style={{color: "#888"}}>→</span>
            {numberBox("endValue", !value?.useEndValue, "endValue")}
            <Tooltip title="useEndValue">
                <Switch size="small" checked={!!value?.useEndValue}
                        onChange={(checked) => set("useEndValue", checked)}/>
            </Tooltip>
            {numberBox("curveValue", !value?.useCurveValue, "curveValue")}
            <Tooltip title="useCurveValue">
                <Switch size="small" checked={!!value?.useCurveValue}
                        onChange={(checked) => set("useCurveValue", checked)}/>
            </Tooltip>
        </Space>
    );
};

/** 判断值是否为 BezierParam 形状 */
export function isBezierParam(value: any): boolean {
    return typeof value === "object" && value !== null && !Array.isArray(value)
        && "startValue" in value && "useEndValue" in value;
}

export default BezierParamField;
