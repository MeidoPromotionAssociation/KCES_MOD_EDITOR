import React from "react";
import {Input, InputNumber, Typography} from "antd";

/**
 * 服装部件表单共用的小控件：标签行、可空字符串输入、数值输入
 */

/** Row 标签 + 控件的一行 */
export const Row: React.FC<{ label: string; children: React.ReactNode }> = ({label, children}) => (
    <div style={{display: "flex", alignItems: "center", gap: 8, marginBottom: 6}}>
        <Typography.Text style={{width: 180, flexShrink: 0, textAlign: "left"}} ellipsis={{tooltip: label}}>
            {label}
        </Typography.Text>
        <div style={{flex: 1, minWidth: 0, textAlign: "left"}}>{children}</div>
    </div>
);

/**
 * NullableStringInput 可空字符串输入
 * 原值为 null 且清空时保持 null，避免把可空字段意外改成空字符串
 */
export const NullableStringInput: React.FC<{
    value: string | null | undefined;
    onChange: (value: string | null) => void;
    textarea?: boolean;
}> = ({value, onChange, textarea}) => {
    const handleChange = (text: string) => {
        if (text === "" && (value === null || value === undefined)) {
            onChange(null);
            return;
        }
        onChange(text);
    };
    if (textarea) {
        return (
            <Input.TextArea
                autoSize={{minRows: 1, maxRows: 4}}
                value={value ?? ""}
                onChange={(e) => handleChange(e.target.value)}
            />
        );
    }
    return <Input value={value ?? ""} onChange={(e) => handleChange(e.target.value)}/>;
};

/** NumberField 数值输入（int32/float32 安全范围） */
export const NumberField: React.FC<{
    value: number | undefined;
    onChange: (value: number) => void;
    step?: number;
    precision?: number;
    width?: number;
}> = ({value, onChange, step, precision, width}) => (
    <InputNumber
        style={{width: width ?? 160}}
        value={value}
        step={step}
        precision={precision}
        onChange={(newValue) => onChange((newValue ?? 0) as number)}
    />
);
