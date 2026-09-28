import React from "react";
import {Collapse, Flex, InputNumber, Radio, Space, Tooltip, Typography} from "antd";
import {QuestionCircleOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import KeyframeEditorWithTable, {Keyframe} from "../common/KeyframeEditorWithTable";
import {NumberField, Row} from "../parts/formControls";

/**
 * DynamicBoneForm DynamicBoneStatus 专用表单（dbconf 动态骨骼载荷，参数基于 .phy 的 DynamicBone）
 * 5 组曲线参数各带基准值 + 关键帧曲线编辑器；字段标签走 i18n，逐个字段带游戏 [Header] 说明的 tooltip；
 * freezeAxis 用单选。字段语义 / 默认值 / 范围以游戏源码 DynamicBoneStatus.cs 为准。
 */

// FreezeAxis 枚举：None=0, X=1, Y=2, Z=3（DynamicBoneStatus.FreezeAxis）
const FreezeAxisOptions: Array<{ value: number; label?: string; labelKey?: string }> = [
    {value: 0, labelKey: "DynamicBoneEditor.freezeAxis_none"},
    {value: 1, label: "X (1)"},
    {value: 2, label: "Y (2)"},
    {value: 3, label: "Z (3)"},
];

// 5 组曲线参数：基准值字段 + 关键帧数组字段（damping/elasticity/stiffness/inert 游戏声明 [Range(0,1)]，radius 无范围）
const CurveParams: Array<{ field: string; frames: string; min?: number; max?: number }> = [
    {field: "damping", frames: "dampingKeyFrames", min: 0, max: 1},
    {field: "elasticity", frames: "elasticityKeyFrames", min: 0, max: 1},
    {field: "stiffness", frames: "stiffnessKeyFrames", min: 0, max: 1},
    {field: "inert", frames: "inertKeyFrames", min: 0, max: 1},
    {field: "radius", frames: "radiusKeyFrames"},
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
// 标签行 + 控件 + 右侧问号 tooltip（沿用 MenuAssetForm 的 placement="left"）；
// 定义在组件外，避免每次渲染都生成新组件类型导致子树重挂、输入失焦
const FieldRow: React.FC<{ label: string; tip: React.ReactNode; children: React.ReactNode }> = ({
                                                                                                     label,
                                                                                                     tip,
                                                                                                     children
                                                                                                 }) => (
    <Row label={label}>
        <Flex gap="small" align="center">
            {children}
            <Tooltip placement="left" title={tip}>
                <QuestionCircleOutlined/>
            </Tooltip>
        </Flex>
    </Row>
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

    const curveItems = CurveParams.map(({field, frames, min, max}) => ({
        key: field,
        label: (
            <Space>
                <Typography.Text strong>{t(`DynamicBoneEditor.${field}`)}</Typography.Text>
                <Tooltip title={t(`DynamicBoneEditor.${field}_tip`)}>
                    <QuestionCircleOutlined/>
                </Tooltip>
                <Typography.Text type="secondary">
                    {t('PayloadEditor.curve_frames', {count: (status[frames] ?? []).length})}
                </Typography.Text>
            </Space>
        ),
        children: (
            <div>
                <Row label={t('PayloadEditor.base_value')}>
                    <NumberField step={0.01} min={min} max={max} value={status[field]}
                                 onChange={(v) => set(field, v)}/>
                </Row>
                <KeyframeEditorWithTable
                    keyframes={(status[frames] ?? []) as Keyframe[]}
                    onChange={(kf) => setFrames(frames, kf)}
                />
            </div>
        ),
    }));
    const tip = (field: string) => t(`DynamicBoneEditor.${field}_tip`);

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
                                <FieldRow label={t('DynamicBoneEditor.version')} tip={tip("version")}>
                                    <NumberField precision={0} value={status.version}
                                                 onChange={(v) => set("version", v)}/>
                                </FieldRow>
                                <FieldRow label={t('DynamicBoneEditor.endLength')} tip={tip("endLength")}>
                                    <NumberField step={0.01} value={status.endLength}
                                                 onChange={(v) => set("endLength", v)}/>
                                </FieldRow>
                                <FieldRow label={t('DynamicBoneEditor.endOffset')} tip={tip("endOffset")}>
                                    <Vector3Field value={status.endOffset}
                                                  onChange={(v) => set("endOffset", v)}/>
                                </FieldRow>
                                <FieldRow label={t('DynamicBoneEditor.gravity')} tip={tip("gravity")}>
                                    <Vector3Field value={status.gravity}
                                                  onChange={(v) => set("gravity", v)}/>
                                </FieldRow>
                                <FieldRow label={t('DynamicBoneEditor.force')} tip={tip("force")}>
                                    <Vector3Field value={status.force}
                                                  onChange={(v) => set("force", v)}/>
                                </FieldRow>
                                <FieldRow label={t('DynamicBoneEditor.freezeAxis')} tip={tip("freezeAxis")}>
                                    <Radio.Group
                                        value={status.freezeAxis ?? 0}
                                        onChange={(e) => set("freezeAxis", e.target.value)}
                                        options={FreezeAxisOptions.map((o) => ({
                                            value: o.value,
                                            label: o.label ?? t(o.labelKey as string),
                                        }))}
                                    />
                                </FieldRow>
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
