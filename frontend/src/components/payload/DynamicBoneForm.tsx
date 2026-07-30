import React from "react";
import {Collapse, InputNumber, Space, Typography} from "antd";
import {useTranslation} from "react-i18next";
import KeyframeEditorWithTable, {Keyframe} from "../common/KeyframeEditorWithTable";
import {NumberField, Row} from "../parts/formControls";

/**
 * DynamicBoneForm DynamicBoneStatus 专用表单（dbconf 等动态骨骼载荷）
 * 复刻 COM3D2 PhyEditor 的编辑体验：5 组参数各带基准值 + 关键帧曲线编辑器（可视化拖拽 + 表格）
 */

// 5 组曲线参数：基准值字段 + 关键帧数组字段
const CurveParams: Array<{ valueField: string; framesField: string }> = [
    {valueField: "damping", framesField: "dampingKeyFrames"},
    {valueField: "elasticity", framesField: "elasticityKeyFrames"},
    {valueField: "stiffness", framesField: "stiffnessKeyFrames"},
    {valueField: "inert", framesField: "inertKeyFrames"},
    {valueField: "radius", framesField: "radiusKeyFrames"},
];

// Vector3 三分量输入
const Vector3Field: React.FC<{
    value: any;
    onChange: (next: any) => void;
}> = ({value, onChange}) => (
    <Space size={4}>
        {(["x", "y", "z"] as const).map((axis) => (
            <InputNumber
                key={axis}
                size="small"
                style={{width: 90}}
                step={0.01}
                prefix={axis.toUpperCase()}
                value={value?.[axis] ?? 0}
                onChange={(v) => onChange({...value, [axis]: (v ?? 0) as number})}
            />
        ))}
    </Space>
);

const DynamicBoneForm: React.FC<{
    status: any;
    onChange: (next: any) => void;
}> = ({status, onChange}) => {
    const {t} = useTranslation();

    const set = (field: string, value: any) => onChange({...status, [field]: value});

    // 关键帧写回：原值为 null 且新值为空时保持 null，避免改变可空语义
    const setFrames = (field: string, frames: Keyframe[]) => {
        if (frames.length === 0 && (status[field] === null || status[field] === undefined)) {
            set(field, null);
            return;
        }
        set(field, frames);
    };

    const curveItems = CurveParams.map(({valueField, framesField}) => ({
        key: valueField,
        label: (
            <Space>
                <Typography.Text strong>{valueField}</Typography.Text>
                <Typography.Text type="secondary">
                    {t('PayloadEditor.curve_frames', {count: (status[framesField] ?? []).length})}
                </Typography.Text>
            </Space>
        ),
        children: (
            <div>
                <Row label={t('PayloadEditor.base_value')}>
                    <NumberField step={0.01} value={status[valueField]}
                                 onChange={(v) => set(valueField, v)}/>
                </Row>
                <KeyframeEditorWithTable
                    keyframes={(status[framesField] ?? []) as Keyframe[]}
                    onChange={(frames) => setFrames(framesField, frames)}
                />
            </div>
        ),
    }));

    return (
        <div style={{textAlign: "left"}}>
            <Collapse
                size="small"
                items={[
                    {
                        key: "general",
                        label: t('PayloadEditor.general_params'),
                        children: (
                            <div>
                                <Row label="version">
                                    <NumberField precision={0} value={status.version}
                                                 onChange={(v) => set("version", v)}/>
                                </Row>
                                <Row label="endLength">
                                    <NumberField step={0.01} value={status.endLength}
                                                 onChange={(v) => set("endLength", v)}/>
                                </Row>
                                <Row label="endOffset">
                                    <Vector3Field value={status.endOffset}
                                                  onChange={(v) => set("endOffset", v)}/>
                                </Row>
                                <Row label="gravity">
                                    <Vector3Field value={status.gravity}
                                                  onChange={(v) => set("gravity", v)}/>
                                </Row>
                                <Row label="force">
                                    <Vector3Field value={status.force}
                                                  onChange={(v) => set("force", v)}/>
                                </Row>
                                <Row label="freezeAxis">
                                    <NumberField precision={0} value={status.freezeAxis}
                                                 onChange={(v) => set("freezeAxis", v)}/>
                                </Row>
                            </div>
                        ),
                    },
                    ...curveItems,
                ]}
                defaultActiveKey={["general", "damping"]}
            />
        </div>
    );
};

export default DynamicBoneForm;
