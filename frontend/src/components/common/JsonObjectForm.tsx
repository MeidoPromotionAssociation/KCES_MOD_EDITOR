import React from "react";
import {Button, Collapse, Empty, Input, InputNumber, Space, Switch, Tag, Tooltip, Typography} from "antd";
import {DeleteOutlined, PlusOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import {isBigNumber, losslessParse, losslessStringify} from "../../utils/losslessJson";
import BigIntInput from "./BigIntInput";

/**
 * JsonObjectForm 递归结构化表单
 * 将任意 JSON 对象渲染为 antd 表单控件（数字/布尔/字符串/数组/嵌套对象），
 * 用于没有专用表单的格式的样式1视图。
 * 超大数组会显示提示而不渲染（请使用 JSON 模式编辑），避免卡顿。
 * uint64 大整数以 LosslessNumber 表示，用文本输入编辑以保留精度。
 */

// 数组渲染上限，超过则提示使用 JSON 模式
const MaxArrayItems = 100;
// 内联渲染的原始值数组长度上限（如向量）
const InlineArrayItems = 16;

interface JsonObjectFormProps {
    value: any;
    onChange: (value: any) => void;
    /** 折叠面板默认展开层数 */
    defaultExpandDepth?: number;
}

function isPlainObject(value: any): value is Record<string, any> {
    return typeof value === "object" && value !== null && !Array.isArray(value) && !isBigNumber(value);
}

function clone(value: any): any {
    return value === undefined ? undefined : losslessParse(losslessStringify(value));
}

/** 为数组新增项创建模板：优先克隆末项，否则根据首项克隆，空数组返回 null 占位 */
function newArrayItem(array: any[]): any {
    if (array.length > 0) {
        return clone(array[array.length - 1]);
    }
    return null;
}

const ValueEditor: React.FC<{
    value: any;
    onChange: (value: any) => void;
    depth: number;
    defaultExpandDepth: number;
}> = ({value, onChange, depth, defaultExpandDepth}) => {
    const {t} = useTranslation();

    if (value === null || value === undefined) {
        return (
            <Tooltip title={t('JsonForm.null_value_tip')}>
                <Tag>null</Tag>
            </Tooltip>
        );
    }

    if (typeof value === "boolean") {
        return <Switch checked={value} onChange={(checked) => onChange(checked)}/>;
    }

    if (isBigNumber(value)) {
        return <BigIntInput value={value} onChange={onChange}/>;
    }

    if (typeof value === "number") {
        return (
            <InputNumber
                style={{width: "100%", maxWidth: 240}}
                value={value}
                step={Number.isInteger(value) ? 1 : 0.01}
                onChange={(newValue) => onChange(newValue ?? 0)}
            />
        );
    }

    if (typeof value === "string") {
        return <Input value={value} onChange={(e) => onChange(e.target.value)}/>;
    }

    if (Array.isArray(value)) {
        // 短的原始值数组（向量等）内联渲染
        const allPrimitive = value.every((item) => typeof item === "number" || typeof item === "string" || typeof item === "boolean" || isBigNumber(item));
        if (allPrimitive && value.length <= InlineArrayItems) {
            return (
                <Space wrap size={4}>
                    {value.map((item, index) => (
                        <span key={index}>
                            <ValueEditor
                                value={item}
                                onChange={(newValue) => {
                                    const next = [...value];
                                    next[index] = newValue;
                                    onChange(next);
                                }}
                                depth={depth + 1}
                                defaultExpandDepth={defaultExpandDepth}
                            />
                        </span>
                    ))}
                    <Button
                        size="small"
                        icon={<DeleteOutlined/>}
                        disabled={value.length === 0}
                        onClick={() => onChange(value.slice(0, -1))}
                    />
                    <Button
                        size="small"
                        icon={<PlusOutlined/>}
                        onClick={() => onChange([...value, newArrayItem(value)])}
                    />
                </Space>
            );
        }

        if (value.length > MaxArrayItems) {
            return (
                <Typography.Text type="secondary">
                    {t('JsonForm.array_too_large', {count: value.length})}
                </Typography.Text>
            );
        }

        if (value.length === 0) {
            return (
                <Space>
                    <Typography.Text type="secondary">{t('JsonForm.empty_array')}</Typography.Text>
                    <Button size="small" icon={<PlusOutlined/>} onClick={() => onChange([null])}/>
                </Space>
            );
        }

        return (
            <Collapse
                size="small"
                defaultActiveKey={depth < defaultExpandDepth ? value.map((_, index) => String(index)) : []}
                items={value.map((item, index) => ({
                    key: String(index),
                    label: (
                        <Space>
                            <span>#{index}</span>
                            <Button
                                size="small"
                                type="text"
                                danger
                                icon={<DeleteOutlined/>}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const next = [...value];
                                    next.splice(index, 1);
                                    onChange(next);
                                }}
                            />
                        </Space>
                    ),
                    children: (
                        <ValueEditor
                            value={item}
                            onChange={(newValue) => {
                                const next = [...value];
                                next[index] = newValue;
                                onChange(next);
                            }}
                            depth={depth + 1}
                            defaultExpandDepth={defaultExpandDepth}
                        />
                    ),
                }))}
            />
        ) as any;
    }

    if (isPlainObject(value)) {
        const keys = Object.keys(value);
        if (keys.length === 0) {
            return <Typography.Text type="secondary">{t('JsonForm.empty_object')}</Typography.Text>;
        }
        return (
            <div style={{display: "flex", flexDirection: "column", gap: 6}}>
                {keys.map((key) => {
                    const child = value[key];
                    const isNested = isPlainObject(child) || (Array.isArray(child) && !(child.length <= InlineArrayItems && child.every((item: any) => typeof item !== "object" || item === null || isBigNumber(item))));
                    if (isNested) {
                        return (
                            <Collapse
                                key={key}
                                size="small"
                                defaultActiveKey={depth < defaultExpandDepth ? [key] : []}
                                items={[{
                                    key,
                                    label: <Typography.Text strong>{key}</Typography.Text>,
                                    children: (
                                        <ValueEditor
                                            value={child}
                                            onChange={(newValue) => onChange({...value, [key]: newValue})}
                                            depth={depth + 1}
                                            defaultExpandDepth={defaultExpandDepth}
                                        />
                                    ),
                                }]}
                            />
                        );
                    }
                    return (
                        <div key={key} style={{display: "flex", alignItems: "center", gap: 8}}>
                            <Typography.Text
                                style={{minWidth: 220, maxWidth: 320, textAlign: "left", flexShrink: 0}}
                                ellipsis={{tooltip: key}}
                            >
                                {key}
                            </Typography.Text>
                            <div style={{flex: 1, textAlign: "left"}}>
                                <ValueEditor
                                    value={child}
                                    onChange={(newValue) => onChange({...value, [key]: newValue})}
                                    depth={depth + 1}
                                    defaultExpandDepth={defaultExpandDepth}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    return <Tag>{String(value)}</Tag>;
};

const JsonObjectForm: React.FC<JsonObjectFormProps> = ({value, onChange, defaultExpandDepth = 1}) => {
    const {t} = useTranslation();
    if (value === null || value === undefined) {
        return <Empty description={t('Infos.pls_open_file_first')}/>;
    }
    return (
        <div style={{padding: 4}}>
            <ValueEditor value={value} onChange={onChange} depth={0} defaultExpandDepth={defaultExpandDepth}/>
        </div>
    );
};

export default JsonObjectForm;
