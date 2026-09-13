import React from "react";
import {Button, InputNumber, Slider, Space, Switch, theme, Tooltip, Typography} from "antd";
import {QuestionCircleOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import KeyframeEditorWithTable, {Keyframe} from "../common/KeyframeEditorWithTable";
import {defaultStep, NumberMeta, snapToStep} from "../../utils/magicaClothMeta.ts";

/**
 * MagicaCloth2 载荷的共用控件
 *
 * - RangedNumber：带拖动条的数值输入，范围取自游戏 DataValidate 的 clamp 边界
 * - UnityCurveField：Unity AnimationCurve（m_Curve）关键帧编辑
 * - CurveDataField：CurveSerializeData（value + useCurve + curve）组合控件
 * - ToggleValueField：CheckSliderSerializeData（value + use）组合控件
 * - Vector3Field / InstanceRefTag：向量与场景对象引用
 */

/* -----------------------------
 * Unity 关键帧 ↔ 曲线编辑器
 * ----------------------------- */

/** Unity 序列化关键帧 → 曲线编辑器格式（inSlope/outSlope ↔ inTangent/outTangent） */
export function toEditorFrames(curve: any): Keyframe[] {
    return (curve?.m_Curve ?? []).map((frame: any) => ({
        time: frame?.time ?? 0,
        value: frame?.value ?? 0,
        inTangent: frame?.inSlope ?? 0,
        outTangent: frame?.outSlope ?? 0,
    }));
}

/**
 * 曲线编辑器格式 → Unity 序列化关键帧
 * 按索引保留原帧的附加字段（tangentMode / weightedMode / 权重），新帧才补 Unity 的默认值；
 * 曲线容器自身的 m_PreInfinity 等成员一并保留，不改变原文件写出的成员集合
 */
export function fromEditorFrames(originalCurve: any, frames: Keyframe[]): any {
    const originals: any[] = originalCurve?.m_Curve ?? [];
    return {
        ...originalCurve,
        m_Curve: frames.map((frame, index) => ({
            serializedVersion: "3",
            tangentMode: 0,
            weightedMode: 0,
            inWeight: 0,
            outWeight: 0,
            ...(originals[index] ?? {}),
            time: frame.time,
            value: frame.value,
            inSlope: frame.inTangent,
            outSlope: frame.outTangent,
        })),
    };
}

export function isUnityCurve(value: any): boolean {
    return typeof value === "object" && value !== null && !Array.isArray(value) && Array.isArray(value.m_Curve);
}

/** CurveSerializeData：value + useCurve + curve 三件套 */
export function isCurveData(value: any): boolean {
    return typeof value === "object" && value !== null && !Array.isArray(value)
        && "value" in value && "useCurve" in value && isUnityCurve(value.curve);
}

/** CheckSliderSerializeData：value + use */
export function isToggleValue(value: any): boolean {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
    const keys = Object.keys(value);
    return keys.length === 2 && keys.includes("value") && keys.includes("use");
}

export function isInstanceRef(value: any): boolean {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
    const keys = Object.keys(value);
    return keys.length === 1 && keys[0] === "instanceID";
}

export function isVector(value: any): boolean {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
    const keys = Object.keys(value);
    return keys.length >= 2 && keys.length <= 4
        && keys.every((key) => ["x", "y", "z", "w"].includes(key) && typeof value[key] === "number");
}

/* -----------------------------
 * 控件
 * ----------------------------- */

/**
 * RangedNumber 带拖动条的数值输入
 * 有上下界时给拖动条 + 数字框，只有单边界时只给数字框；
 * 数字框不设 min/max 而只给提示：游戏 clamp 是加载时做的，编辑器把越界值改掉会掩盖文件原状
 *
 * 拖动期间只更新本地值，松手（onChangeComplete）才写回文档：写回要重渲染整棵表单
 * （几十个受控控件加若干曲线编辑器），按 mousemove 的频率写会明显掉帧
 */
export const RangedNumber: React.FC<{
    value: number | undefined;
    meta?: NumberMeta;
    onChange: (next: number) => void;
}> = ({value, meta, onChange}) => {
    const {t} = useTranslation();
    const committed = typeof value === "number" ? value : 0;
    const [dragging, setDragging] = React.useState<number | null>(null);
    const current = dragging ?? committed;

    // 文档里的值从外部变了（提交完成、切换文件）就丢掉本地拖动值
    React.useEffect(() => setDragging(null), [committed]);

    const step = meta?.step ?? (meta?.min !== undefined && meta?.max !== undefined
        ? defaultStep(meta.min, meta.max) : (Number.isInteger(committed) ? 1 : 0.01));

    const sliderMin = meta?.sliderMin ?? meta?.min;
    const sliderMax = meta?.sliderMax ?? meta?.max;
    const hasSlider = sliderMin !== undefined && sliderMax !== undefined;

    // 越界只提示不纠正，避免编辑器悄悄改掉文件里的原值
    const outOfRange = (meta?.min !== undefined && current < meta.min)
        || (meta?.max !== undefined && current > meta.max);

    const rangeHint = meta === undefined ? undefined : t('MagicaClothEditor.range_hint', {
        min: meta.min ?? "-∞",
        max: meta.max ?? "∞",
        def: meta.def ?? "-",
    });

    const number = (
        <InputNumber
            size="small"
            style={{width: hasSlider ? 96 : 160}}
            step={step}
            precision={meta?.integer ? 0 : undefined}
            status={outOfRange ? "warning" : undefined}
            value={current}
            onChange={(next) => {
                setDragging(null);
                onChange((next ?? 0) as number);
            }}
        />
    );

    if (!hasSlider) {
        return rangeHint ? <Tooltip title={rangeHint}>{number}</Tooltip> : number;
    }

    return (
        <Tooltip title={rangeHint}>
            <Space size={8} style={{width: "100%", maxWidth: 420}}>
                <Slider
                    style={{flex: 1, minWidth: 120, margin: 0}}
                    min={sliderMin}
                    max={sliderMax}
                    step={step}
                    // 越界值先按边界显示，实际值仍由右边的数字框呈现
                    value={Math.min(sliderMax, Math.max(sliderMin, current))}
                    tooltip={{formatter: (v) => String(v ?? "")}}
                    onChange={(next) => setDragging(snapToStep(next as number, step))}
                    onChangeComplete={(next) => {
                        setDragging(null);
                        onChange(snapToStep(next as number, step));
                    }}
                />
                {number}
            </Space>
        </Tooltip>
    );
};

/** UnityCurveField Unity AnimationCurve 的关键帧编辑 */
export const UnityCurveField: React.FC<{
    value: any;
    onChange: (next: any) => void;
}> = ({value, onChange}) => (
    <KeyframeEditorWithTable
        keyframes={toEditorFrames(value)}
        onChange={(frames) => onChange(fromEditorFrames(value, frames))}
    />
);

/**
 * CurveDataField CurveSerializeData 组合控件
 * useCurve 关掉时游戏只取 value（CurveSerializeData.Evaluate），所以曲线默认折起来，
 * 打开 useCurve 才展开；曲线值是 value 的乘数（Evaluate 返回 curve.Evaluate(t) * value）
 */
export const CurveDataField: React.FC<{
    value: any;
    meta?: NumberMeta;
    onChange: (next: any) => void;
}> = ({value, meta, onChange}) => {
    const {t} = useTranslation();
    const useCurve = !!value?.useCurve;
    const [expanded, setExpanded] = React.useState(useCurve);

    return (
        <div>
            <Space size={12} wrap style={{marginBottom: expanded ? 8 : 0}}>
                <RangedNumber value={value?.value} meta={meta}
                              onChange={(next) => onChange({...value, value: next})}/>
                <Space size={4}>
                    <Typography.Text type="secondary">useCurve</Typography.Text>
                    <Switch
                        size="small"
                        checked={useCurve}
                        onChange={(checked) => {
                            onChange({...value, useCurve: checked});
                            if (checked) setExpanded(true);
                        }}
                    />
                    <Tooltip title={t('MagicaClothEditor.use_curve_tip')}>
                        <QuestionCircleOutlined style={{opacity: 0.55, cursor: "help"}}/>
                    </Tooltip>
                </Space>
                <Button size="small" type="link" onClick={() => setExpanded((prev) => !prev)}>
                    {expanded ? t('MagicaClothEditor.hide_curve') : t('MagicaClothEditor.show_curve')}
                </Button>
                {!useCurve && (
                    <Typography.Text type="secondary">{t('MagicaClothEditor.curve_unused')}</Typography.Text>
                )}
            </Space>
            {expanded && (
                <UnityCurveField value={value?.curve} onChange={(next) => onChange({...value, curve: next})}/>
            )}
        </div>
    );
};

/**
 * ToggleValueField CheckSliderSerializeData 组合控件
 * use 关掉时游戏取调用方给的默认值（CheckSliderSerializeData.GetValue），所以数值仍可编辑但置灰提示
 */
export const ToggleValueField: React.FC<{
    value: any;
    meta?: NumberMeta;
    onChange: (next: any) => void;
}> = ({value, meta, onChange}) => {
    const {t} = useTranslation();
    const inUse = !!value?.use;
    return (
        <Space size={12} wrap>
            <Space size={4}>
                <Switch size="small" checked={inUse} onChange={(checked) => onChange({...value, use: checked})}/>
                <Typography.Text type="secondary">
                    {inUse ? t('MagicaClothEditor.limit_on') : t('MagicaClothEditor.limit_off')}
                </Typography.Text>
            </Space>
            <RangedNumber value={value?.value} meta={meta}
                          onChange={(next) => onChange({...value, value: next})}/>
        </Space>
    );
};

/** Vector3Field 向量字段（gravityDirection 等） */
export const Vector3Field: React.FC<{
    value: any;
    onChange: (next: any) => void;
}> = ({value, onChange}) => (
    <Space size={4} wrap>
        {Object.keys(value ?? {}).map((axis) => (
            <InputNumber
                key={axis}
                size="small"
                style={{width: 96}}
                step={0.01}
                prefix={<span style={{opacity: 0.55}}>{axis.toUpperCase()}</span>}
                value={value[axis]}
                onChange={(next) => onChange({...value, [axis]: (next ?? 0) as number})}
            />
        ))}
    </Space>
);

/**
 * InstanceRefTag 场景对象引用
 * instanceID 是 Unity 运行时实例 ID，跨会话没有稳定含义，也不由文件决定，只展示不编辑
 */
export const InstanceRefTag: React.FC<{ value: any }> = ({value}) => {
    const {t} = useTranslation();
    const {token} = theme.useToken();
    const id = value?.instanceID ?? 0;
    return (
        <Tooltip title={t('MagicaClothEditor.instance_ref_tip')}>
            <Typography.Text type="secondary" style={{fontFamily: token.fontFamilyCode}}>
                {id === 0 ? t('MagicaClothEditor.instance_ref_none') : `instanceID: ${id}`}
            </Typography.Text>
        </Tooltip>
    );
};

/** InstanceRefList 场景对象引用数组 */
export const InstanceRefList: React.FC<{ value: any[] }> = ({value}) => {
    const {t} = useTranslation();
    return (
        <Tooltip title={t('MagicaClothEditor.instance_ref_tip')}>
            <Typography.Text type="secondary">
                {t('MagicaClothEditor.instance_ref_list', {count: value.length})}
            </Typography.Text>
        </Tooltip>
    );
};
