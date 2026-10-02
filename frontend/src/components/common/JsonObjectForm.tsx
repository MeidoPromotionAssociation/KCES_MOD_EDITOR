import React from "react";
import {Button, Collapse, Empty, Input, InputNumber, Space, Switch, Tag, Tooltip, Typography} from "antd";
import {DeleteOutlined, PlusOutlined, QuestionCircleOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import {isBigNumber, losslessParse, losslessStringify} from "../../utils/losslessJson";
import {detectInfinityColorTriples} from "../../utils/colorShapes";
import {ObjectTriplePicker} from "./InfinityColorPicker";
import BigIntInput from "./BigIntInput";

/**
 * JsonObjectForm 递归结构化表单
 * 将任意 JSON 对象渲染为 antd 表单控件（数字/布尔/字符串/数组/嵌套对象），
 * 用于没有专用表单的格式的样式1视图。
 * 超大数组会显示提示而不渲染（请使用 JSON 模式编辑），避免卡顿。
 * uint64 大整数以 LosslessNumber 表示，用文本输入编辑以保留精度。
 * 识别出无限色结构时额外挂一个色块选择器（见 utils/colorShapes.ts）。
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
    /**
     * 字段名 → 显示文案 / 说明，按路径索引（点分，如 maidData.colorData.signature）。
     *
     * 组件本身是通用的（.preset / .nei / .phy 等格式共用），所以「字段名 → 译文」的映射
     * 不能写死在组件里；不传就退化成原来的「直接显示原始 key」。
     *
     * 必须按路径而不是字段名索引：preset 里 signature / version 在
     * bodyData / colorData / propData 各有一份，同名但语义完全不同
     * （CM3D2_MAID_BODY vs CM3D2_MULTI_COL vs GP03_MPROP_LIST，版本号也各不相同）。
     * 用字段名当 key 会三处共用一份文案，必然写错。
     */
    fieldMeta?: Record<string, FieldMeta>;
}

/** 单个字段的展示文案：label 是译名（缺省回落原始 key），tip 是字段说明 */
export interface FieldMeta {
    label?: string;
    tip?: string;
}

/** 路径索引：a.b.c */
function metaAt(fieldMeta: Record<string, FieldMeta> | undefined, path: string): FieldMeta | undefined {
    return fieldMeta?.[path];
}

/**
 * 字段标签：译名（没有则原始 key）+ 问号图标说明
 *
 * 说明只能挂一个挂载点 —— 用 <Tooltip><QuestionCircleOutlined/></Tooltip> 显式挂，
 * 不能塞进 Typography.Text 的 ellipsis.tooltip：antd 的 EllipsisTooltip 是
 * disabled: !isEllipsis，短标签在 220~320px 的行里永不截断，说明就永远看不到。
 * ellipsis 里的 tooltip 保留原始 key，只在标签真的被截断时补全用。
 */
const FieldLabel: React.FC<{
    name: string;
    meta?: FieldMeta;
    /** 折叠面板用 strong，叶子字段用普通字重 */
    strong?: boolean;
    /** 标签最大宽度；折叠面板标题可用宽度更宽 */
    maxWidth?: number;
}> = ({name, meta, strong, maxWidth = 300}) => {
    const label = meta?.label ?? name;
    return (
        <Space size={4} align="center" style={{maxWidth, textAlign: "left"}}>
            <Typography.Text
                strong={strong}
                style={{maxWidth: meta?.tip ? maxWidth - 22 : maxWidth, textAlign: "left"}}
                ellipsis={{tooltip: name}}
            >
                {label}
            </Typography.Text>
            {meta?.tip && (
                <Tooltip title={meta.tip} styles={{root: {maxWidth: 400}}}>
                    <QuestionCircleOutlined style={{opacity: 0.55, cursor: "help", flexShrink: 0}}/>
                </Tooltip>
            )}
        </Space>
    );
};

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
    fieldMeta?: Record<string, FieldMeta>;
    /** 当前节点在字段树里的路径（点分），用于查 fieldMeta 的按路径索引 */
    path: string;
}> = ({value, onChange, depth, defaultExpandDepth, fieldMeta, path}) => {
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
                                fieldMeta={fieldMeta}
                                path={path}
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
                            fieldMeta={fieldMeta}
                            path={path}
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
        // 无限色结构（PartsColor / KCESPresetInfinityPartsColor / ColorPresetFreeColor）
        // 额外给一行色块选择器，数值字段仍照常渲染
        const triples = detectInfinityColorTriples(value);
        return (
            <div style={{display: "flex", flexDirection: "column", gap: 6}}>
                {triples.length > 0 && (
                    <div style={{display: "flex", alignItems: "center", gap: 8}}>
                        <Typography.Text
                            style={{minWidth: 220, maxWidth: 320, textAlign: "left", flexShrink: 0}}
                            type="secondary"
                        >
                            {t('FieldForm.color_preview')}
                        </Typography.Text>
                        <Space size={8} wrap style={{flex: 1}}>
                            {triples.map((triple) => (
                                <Space key={triple.group} size={4}>
                                    <Typography.Text type="secondary">
                                        {t(triple.group === "main" ? 'FieldForm.main_color' : 'FieldForm.shadow_color')}
                                    </Typography.Text>
                                    <ObjectTriplePicker object={value} triple={triple} onChange={onChange}/>
                                </Space>
                            ))}
                        </Space>
                    </div>
                )}
                {keys.map((key) => {
                    const child = value[key];
                    const childPath = path ? `${path}.${key}` : key;
                    const meta = metaAt(fieldMeta, childPath);
                    const isNested = isPlainObject(child) || (Array.isArray(child) && !(child.length <= InlineArrayItems && child.every((item: any) => typeof item !== "object" || item === null || isBigNumber(item))));
                    if (isNested) {
                        return (
                            <Collapse
                                key={key}
                                size="small"
                                defaultActiveKey={depth < defaultExpandDepth ? [key] : []}
                                items={[{
                                    key,
                                    label: <FieldLabel name={key} meta={meta} strong maxWidth={420}/>,
                                    children: (
                                        <ValueEditor
                                            value={child}
                                            onChange={(newValue) => onChange({...value, [key]: newValue})}
                                            depth={depth + 1}
                                            defaultExpandDepth={defaultExpandDepth}
                                            fieldMeta={fieldMeta}
                                            path={childPath}
                                        />
                                    ),
                                }]}
                            />
                        );
                    }
                    return (
                        <div key={key} style={{display: "flex", alignItems: "center", gap: 8}}>
                            <div style={{minWidth: 220, maxWidth: 320, flexShrink: 0}}>
                                <FieldLabel name={key} meta={meta} maxWidth={320}/>
                            </div>
                            <div style={{flex: 1, textAlign: "left"}}>
                                <ValueEditor
                                    value={child}
                                    onChange={(newValue) => onChange({...value, [key]: newValue})}
                                    depth={depth + 1}
                                    defaultExpandDepth={defaultExpandDepth}
                                    fieldMeta={fieldMeta}
                                    path={childPath}
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

const JsonObjectForm: React.FC<JsonObjectFormProps> = ({value, onChange, defaultExpandDepth = 1, fieldMeta}) => {
    const {t} = useTranslation();
    if (value === null || value === undefined) {
        return <Empty description={t('Infos.pls_open_file_first')}/>;
    }
    return (
        <div style={{padding: 4}}>
            <ValueEditor
                value={value}
                onChange={onChange}
                depth={0}
                defaultExpandDepth={defaultExpandDepth}
                fieldMeta={fieldMeta}
                path=""
            />
        </div>
    );
};

export default JsonObjectForm;
