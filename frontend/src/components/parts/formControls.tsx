import React from "react";
import {AutoComplete, Cascader, Input, InputNumber, Tooltip, Typography} from "antd";
import {numberToString} from "../../utils/losslessJson";

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
 *
 * 悬停提示走 tooltip 参数由组件内部包 Tooltip：Tooltip 要挂到真实的输入节点上，
 * 套在调用处时它拿到的是本组件而不是里面的 Input，提示不会出现
 */
export const NullableStringInput: React.FC<{
    value: string | null | undefined;
    onChange: (value: string | null) => void;
    textarea?: boolean;
    tooltip?: React.ReactNode;
}> = ({value, onChange, textarea, tooltip}) => {
    const handleChange = (text: string) => {
        if (text === "" && (value === null || value === undefined)) {
            onChange(null);
            return;
        }
        onChange(text);
    };
    const control = textarea ? (
        <Input.TextArea
            autoSize={{minRows: 1, maxRows: 4}}
            value={value ?? ""}
            onChange={(e) => handleChange(e.target.value)}
        />
    ) : (
        <Input
            value={value ?? ""}
            onChange={(e) => handleChange(e.target.value)}/>
    );
    return tooltip ? <Tooltip title={tooltip}>{control}</Tooltip> : control;
};

/**
 * NumberField 数值输入（int32/float32 安全范围）
 * tooltip 与 NullableStringInput 同理，由内部包 Tooltip
 */
export const NumberField: React.FC<{
    value: number | undefined;
    onChange: (value: number) => void;
    step?: number;
    precision?: number;
    width?: number;
    disabled?: boolean;
    tooltip?: React.ReactNode;
}> = ({value, onChange, step, precision, width, disabled, tooltip}) => {
    const control = (
        <InputNumber
            style={{width: width ?? 250}}
            value={value}
            step={step}
            precision={precision}
            disabled={disabled}
            onChange={(newValue) => onChange((newValue ?? 0) as number)}
        />
    );
    return tooltip ? <Tooltip title={tooltip}>{control}</Tooltip> : control;
};

/**
 * FlagsCascader [Flags] 枚举多选
 * 底层是 ulong（只有低位有定义），存储值为各标签按位或；options 的 value 是标签名，
 * 展示为 `标签（翻译名）[位值]`（位值为 0 的项如 NONE 不列入选项，什么都不选即 0）
 */
export const FlagsCascader: React.FC<{
    value: any; // number 或 LosslessNumber
    onChange: (value: number) => void;
    flags: Record<string, number>;
    labelOf?: (name: string) => string | null;
    width?: number;
}> = ({value, onChange, flags, labelOf, width}) => {
    const options = Object.keys(flags)
        .filter((name) => flags[name] !== 0)
        .map((name) => {
            const label = labelOf?.(name) ?? null;
            return {
                value: name,
                label: label ? `${name}（${label}）[${flags[name]}]` : `${name}[${flags[name]}]`,
            };
        });
    const num = typeof value === "number" ? value : Number(numberToString(value));
    const paths = options
        .filter((o) => (num & flags[o.value]) !== 0)
        .map((o) => [o.value]);
    return (
        <Cascader
            style={{width: width ?? 250}}
            multiple
            options={options}
            value={paths}
            onChange={(next) => {
                const sum = next.reduce(
                    (acc, path) => acc | (flags[String(path[path.length - 1])] ?? 0),
                    0,
                );
                onChange(sum);
            }}
        />
    );
};

/**
 * EnumAutoComplete 单选枚举文本选择
 * 存储数值编号（names 的下标即枚举数值），显示 `名字（翻译名）[数值]`；
 * 允许直接输入名字，也兼容纯数字编号
 */
export const EnumAutoComplete: React.FC<{
    value: number | undefined;
    names: string[];
    labelOf?: (name: string) => string | null;
    onChange: (value: number) => void;
    width?: number;
}> = ({value, names, labelOf, onChange, width}) => {
    const nameOf = (v: number | undefined) => (v === undefined ? "" : names[v] ?? "");
    const [text, setText] = React.useState(nameOf(value));

    React.useEffect(() => {
        setText(nameOf(value));
    }, [value, names]);

    return (
        <AutoComplete
            style={{width: width ?? 250}}
            allowClear
            value={text}
            options={names.map((name, idx) => {
                const label = labelOf?.(name) ?? null;
                return {
                    value: name,
                    label: label ? `${name}（${label}）[${idx}]` : `${name}[${idx}]`,
                };
            })}
            onChange={(t) => {
                setText(t);
                const idx = names.indexOf(t);
                if (idx >= 0) {
                    onChange(idx);
                } else if (/^\d+$/.test(t) && Number(t) < names.length) {
                    onChange(Number(t));
                }
                // 其他文本不提交，保留编辑中的样子，下次重算时回到有效值
            }}
        />
    );
};
