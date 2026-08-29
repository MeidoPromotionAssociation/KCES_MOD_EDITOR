import React from "react";
import {Collapse, Input, InputNumber, Space, Switch, Tag, Tooltip, Typography} from "antd";
import {useTranslation} from "react-i18next";
import KeyframeEditorWithTable, {Keyframe} from "../common/KeyframeEditorWithTable";
import JsonObjectForm from "../common/JsonObjectForm";

/**
 * MagicaClothForm MagicaCloth2 序列化数据表单（.db2conf/.dsb2conf/.dsl2conf 的 JSON 载荷）
 * 按值形状递归渲染：
 * - Unity AnimationCurve（m_Curve 关键帧）接入关键帧曲线编辑器（保留权重/切线模式等附加字段）
 * - MagicaCloth CurveSerializeData（value/useCurve/curve）组合控件
 * - Vector3/标量/布尔用对应控件；场景对象引用（instanceID）只读展示
 */

// Unity 序列化关键帧 → 曲线编辑器格式（inSlope/outSlope ↔ inTangent/outTangent）
function toEditorFrames(curve: any): Keyframe[] {
    return (curve?.m_Curve ?? []).map((frame: any) => ({
        time: frame?.time ?? 0,
        value: frame?.value ?? 0,
        inTangent: frame?.inSlope ?? 0,
        outTangent: frame?.outSlope ?? 0,
    }));
}

// 曲线编辑器格式 → Unity 序列化关键帧，按索引保留原帧的附加字段（权重/切线模式等）
function fromEditorFrames(originalCurve: any, frames: Keyframe[]): any {
    const originals: any[] = originalCurve?.m_Curve ?? [];
    return {
        ...originalCurve,
        m_Curve: frames.map((frame, index) => ({
            inWeight: 0,
            outWeight: 0,
            tangentMode: 0,
            weightedMode: 0,
            serializedVersion: "3",
            ...(originals[index] ?? {}),
            time: frame.time,
            value: frame.value,
            inSlope: frame.inTangent,
            outSlope: frame.outTangent,
        })),
    };
}

function isUnityCurve(value: any): boolean {
    return typeof value === "object" && value !== null && !Array.isArray(value) && Array.isArray(value.m_Curve);
}

function isInstanceRef(value: any): boolean {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
    const keys = Object.keys(value);
    return keys.length === 1 && keys[0] === "instanceID";
}

function isVector(value: any): boolean {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
    const keys = Object.keys(value);
    return keys.length >= 2 && keys.length <= 4
        && keys.every((key) => ["x", "y", "z", "w"].includes(key) && typeof value[key] === "number");
}

const UnityCurveField: React.FC<{ value: any; onChange: (next: any) => void }> = ({value, onChange}) => (
    <KeyframeEditorWithTable
        keyframes={toEditorFrames(value)}
        onChange={(frames) => onChange(fromEditorFrames(value, frames))}
    />
);

const ValueControl: React.FC<{
    value: any;
    onChange: (next: any) => void;
    depth: number;
}> = ({value, onChange, depth}) => {
    const {t} = useTranslation();

    if (value === null || value === undefined) {
        return (
            <Tooltip title={t('JsonForm.null_value_tip')}>
                <Tag>null</Tag>
            </Tooltip>
        );
    }
    if (typeof value === "boolean") {
        return <Switch size="small" checked={value} onChange={(checked) => onChange(checked)}/>;
    }
    if (typeof value === "number") {
        return (
            <InputNumber size="small" style={{width: 160}} step={Number.isInteger(value) ? 1 : 0.01}
                         value={value} onChange={(v) => onChange((v ?? 0) as number)}/>
        );
    }
    if (typeof value === "string") {
        return <Input size="small" style={{maxWidth: 280}} value={value}
                      onChange={(e) => onChange(e.target.value)}/>;
    }
    if (isInstanceRef(value)) {
        return (
            <Tooltip title={t('MagicaClothEditor.instance_ref_tip')}>
                <Tag>instanceID: {String(value.instanceID)}</Tag>
            </Tooltip>
        );
    }
    if (isVector(value)) {
        return (
            <Space size={4}>
                {Object.keys(value).map((axis) => (
                    <InputNumber key={axis} size="small" style={{width: 96}} step={0.01}
                                 prefix={axis.toUpperCase()}
                                 value={value[axis]}
                                 onChange={(v) => onChange({...value, [axis]: (v ?? 0) as number})}/>
                ))}
            </Space>
        );
    }
    if (isUnityCurve(value)) {
        return <UnityCurveField value={value} onChange={onChange}/>;
    }
    if (isUnityCurve(value?.curve)) {
        // MagicaCloth CurveSerializeData：value / useCurve / curve
        return (
            <div>
                <Space size={8} style={{marginBottom: 6}} wrap>
                    {"value" in value && (
                        <InputNumber size="small" style={{width: 140}} step={0.01} prefix="value"
                                     value={value.value}
                                     onChange={(v) => onChange({...value, value: (v ?? 0) as number})}/>
                    )}
                    {"useCurve" in value && (
                        <Space size={4}>
                            <span>useCurve</span>
                            <Switch size="small" checked={!!value.useCurve}
                                    onChange={(checked) => onChange({...value, useCurve: checked})}/>
                        </Space>
                    )}
                </Space>
                <UnityCurveField value={value.curve} onChange={(next) => onChange({...value, curve: next})}/>
            </div>
        );
    }
    if (Array.isArray(value)) {
        if (value.length === 0) {
            return <Typography.Text type="secondary">{t('JsonForm.empty_array')}</Typography.Text>;
        }
        if (value.every(isInstanceRef)) {
            return (
                <Tooltip title={t('MagicaClothEditor.instance_ref_tip')}>
                    <Typography.Text type="secondary">
                        {t('MagicaClothEditor.instance_ref_list', {count: value.length})}
                    </Typography.Text>
                </Tooltip>
            );
        }
        return <JsonObjectForm value={value} onChange={onChange} defaultExpandDepth={0}/>;
    }
    if (typeof value === "object") {
        // 嵌套对象：按字段递归渲染
        return <FieldList value={value} onChange={onChange} depth={depth + 1}/>;
    }
    return <Tag>{String(value)}</Tag>;
};

const FieldList: React.FC<{
    value: Record<string, any>;
    onChange: (next: any) => void;
    depth: number;
}> = ({value, onChange, depth}) => {
    const keys = Object.keys(value ?? {});
    const labelWidth = depth === 0 ? 240 : 190;

    return (
        <div style={{display: "flex", flexDirection: "column", gap: 4}}>
            {keys.map((key) => {
                const child = value[key];
                const isHeavy = (typeof child === "object" && child !== null && !isInstanceRef(child)
                    && !isVector(child) && !Array.isArray(child)) || isUnityCurve(child) || isUnityCurve(child?.curve);

                if (isHeavy && depth === 0) {
                    // 顶层的复杂字段用折叠面板承载
                    return (
                        <Collapse
                            key={key}
                            size="small"
                            items={[{
                                key,
                                label: <Typography.Text strong>{key}</Typography.Text>,
                                children: (
                                    <ValueControl value={child} onChange={(next) => onChange({...value, [key]: next})}
                                                  depth={depth}/>
                                ),
                            }]}
                        />
                    );
                }

                return (
                    <div key={key} style={{display: "flex", alignItems: "flex-start", gap: 8, minHeight: 26}}>
                        <Typography.Text
                            style={{width: labelWidth, flexShrink: 0, textAlign: "left", paddingTop: 3}}
                            ellipsis={{tooltip: key}}
                        >
                            {key}
                        </Typography.Text>
                        <div style={{flex: 1, minWidth: 0, textAlign: "left"}}>
                            <ValueControl value={child} onChange={(next) => onChange({...value, [key]: next})}
                                          depth={depth}/>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const MagicaClothForm: React.FC<{
    params: any;
    onChange: (next: any) => void;
}> = ({params, onChange}) => {
    const {t} = useTranslation();

    if (typeof params !== "object" || params === null || Array.isArray(params)) {
        return <Typography.Text type="secondary">{t('Infos.payload_no_structured_root')}</Typography.Text>;
    }

    // 新建的空载荷没有字段可显示：提示从现有文件复制数据（JSON 模式粘贴）
    if (Object.keys(params).length === 0) {
        return (
            <Typography.Text type="secondary">
                {t('MagicaClothEditor.empty_payload_hint')}
            </Typography.Text>
        );
    }

    return (
        <div style={{textAlign: "left"}}>
            <FieldList value={params} onChange={onChange} depth={0}/>
        </div>
    );
};

export default MagicaClothForm;
