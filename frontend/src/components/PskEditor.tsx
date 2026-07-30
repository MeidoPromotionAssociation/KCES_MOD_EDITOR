import {forwardRef} from "react";
import {Button, Collapse, InputNumber, Space, Typography} from "antd";
import {DeleteOutlined, PlusOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import BaseFormatEditor, {BaseFormatEditorProps, FormatEditorRef} from "./common/BaseFormatEditor";
import KeyframeEditorWithTable, {Keyframe} from "./common/KeyframeEditorWithTable";
import {NullableStringInput, NumberField, Row} from "./parts/formControls";

/**
 * PskEditor .psk 裙子物理专用编辑器（对标 COM3D2 PskEditor）
 * 样式1：裙撑参数 + 四条分布曲线（关键帧曲线编辑器）+ 骨骼半径分组；样式2：完整 JSON
 * .psk 是 COM3D2 共用格式，JSON 键为大写（Time/Value 等），与曲线编辑器的小写键互相转换
 */

// 大写关键帧 → 小写（曲线编辑器格式）
function toEditorFrames(curve: any): Keyframe[] {
    return (curve?.Keyframes ?? []).map((frame: any) => ({
        time: frame?.Time ?? 0,
        value: frame?.Value ?? 0,
        inTangent: frame?.InTangent ?? 0,
        outTangent: frame?.OutTangent ?? 0,
    }));
}

// 小写关键帧 → 大写（Psk JSON 格式）
function fromEditorFrames(frames: Keyframe[]): any {
    return {
        Keyframes: frames.map((frame) => ({
            Time: frame.time,
            Value: frame.value,
            InTangent: frame.inTangent,
            OutTangent: frame.outTangent,
        })),
    };
}

// 标量参数清单
const ScalarFields: Array<{ field: string; precision?: number }> = [
    {field: "PanierRadius"},
    {field: "PanierForce"},
    {field: "PanierStressForce"},
    {field: "StressDegreeMin"},
    {field: "StressDegreeMax"},
    {field: "StressMinScale"},
    {field: "ScaleEaseSpeed"},
    {field: "PanierForceDistanceThreshold"},
    {field: "CalcTime", precision: 0},
    {field: "VelocityForceRate"},
];

// 曲线参数清单
const CurveFields = ["PanierRadiusDistrib", "PanierForceDistrib", "VelocityForceRateDistrib", "GravityDistrib"];

const PskEditor = forwardRef<FormatEditorRef, Omit<BaseFormatEditorProps, "renderStyle1" | "renderHeader">>(
    (props, ref) => {
        const {t} = useTranslation();

        const renderStyle1 = (data: any, setData: (value: any) => void) => {
            const set = (field: string, value: any) => setData({...data, [field]: value});
            const groups: any[] = Array.isArray(data?.PanierRadiusDistribGroups) ? data.PanierRadiusDistribGroups : [];

            return (
                <div style={{textAlign: "left", height: "calc(100vh - 215px)", overflow: "auto"}}>
                    <Collapse
                        size="small"
                        defaultActiveKey={["scalars", "PanierRadiusDistrib"]}
                        items={[
                            {
                                key: "scalars",
                                label: t('PskEditor.panier_params'),
                                children: (
                                    <div>
                                        <Row label="Signature">
                                            <Typography.Text>{String(data?.Signature ?? "")}</Typography.Text>
                                        </Row>
                                        <Row label="Version">
                                            <NumberField precision={0} value={data?.Version}
                                                         onChange={(v) => set("Version", v)}/>
                                        </Row>
                                        {ScalarFields.map(({field, precision}) => (
                                            <Row key={field} label={field}>
                                                <NumberField step={0.01} precision={precision} value={data?.[field]}
                                                             onChange={(v) => set(field, v)}/>
                                            </Row>
                                        ))}
                                        <Row label="Gravity">
                                            <Space size={4}>
                                                {(["X", "Y", "Z"] as const).map((axis) => (
                                                    <InputNumber
                                                        key={axis} size="small" style={{width: 100}} step={0.01}
                                                        addonBefore={axis}
                                                        value={data?.Gravity?.[axis] ?? 0}
                                                        onChange={(v) => set("Gravity", {
                                                            ...data?.Gravity,
                                                            [axis]: (v ?? 0) as number
                                                        })}/>
                                                ))}
                                            </Space>
                                        </Row>
                                        <Row label="HardValues">
                                            <Space size={4}>
                                                {[0, 1, 2, 3].map((index) => (
                                                    <InputNumber
                                                        key={index} size="small" style={{width: 90}} step={0.01}
                                                        value={data?.HardValues?.[index] ?? 0}
                                                        onChange={(v) => {
                                                            const values = [...(data?.HardValues ?? [0, 0, 0, 0])];
                                                            values[index] = (v ?? 0) as number;
                                                            set("HardValues", values);
                                                        }}/>
                                                ))}
                                            </Space>
                                        </Row>
                                    </div>
                                ),
                            },
                            ...CurveFields.map((field) => ({
                                key: field,
                                label: (
                                    <Space>
                                        <Typography.Text strong>{field}</Typography.Text>
                                        <Typography.Text type="secondary">
                                            {t('PayloadEditor.curve_frames', {count: (data?.[field]?.Keyframes ?? []).length})}
                                        </Typography.Text>
                                    </Space>
                                ),
                                children: (
                                    <KeyframeEditorWithTable
                                        keyframes={toEditorFrames(data?.[field])}
                                        onChange={(frames) => set(field, fromEditorFrames(frames))}
                                    />
                                ),
                            })),
                            {
                                key: "groups",
                                label: `PanierRadiusDistribGroups (${groups.length})`,
                                children: (
                                    <div>
                                        <Button size="small" icon={<PlusOutlined/>} style={{marginBottom: 8}}
                                                onClick={() => set("PanierRadiusDistribGroups", [...groups, {
                                                    BoneName: "",
                                                    Radius: 0.1,
                                                    Curve: {Keyframes: []},
                                                }])}>
                                            {t('PskEditor.add_group')}
                                        </Button>
                                        <Collapse
                                            size="small"
                                            items={groups.map((group, index) => ({
                                                key: String(index),
                                                label: (
                                                    <Space>
                                                        <Typography.Text strong>
                                                            {group?.BoneName || `#${index}`}
                                                        </Typography.Text>
                                                        <Button size="small" type="text" danger
                                                                icon={<DeleteOutlined/>}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const list = [...groups];
                                                                    list.splice(index, 1);
                                                                    set("PanierRadiusDistribGroups", list);
                                                                }}/>
                                                    </Space>
                                                ),
                                                children: (
                                                    <div>
                                                        <Row label="BoneName">
                                                            <NullableStringInput
                                                                value={group?.BoneName}
                                                                onChange={(v) => {
                                                                    const list = [...groups];
                                                                    list[index] = {...group, BoneName: v ?? ""};
                                                                    set("PanierRadiusDistribGroups", list);
                                                                }}/>
                                                        </Row>
                                                        <Row label="Radius">
                                                            <NumberField step={0.01} value={group?.Radius}
                                                                         onChange={(v) => {
                                                                             const list = [...groups];
                                                                             list[index] = {...group, Radius: v};
                                                                             set("PanierRadiusDistribGroups", list);
                                                                         }}/>
                                                        </Row>
                                                        <KeyframeEditorWithTable
                                                            keyframes={toEditorFrames(group?.Curve)}
                                                            onChange={(frames) => {
                                                                const list = [...groups];
                                                                list[index] = {...group, Curve: fromEditorFrames(frames)};
                                                                set("PanierRadiusDistribGroups", list);
                                                            }}
                                                        />
                                                    </div>
                                                ),
                                            }))}
                                        />
                                    </div>
                                ),
                            },
                        ]}
                    />
                </div>
            );
        };

        return <BaseFormatEditor {...props} ref={ref} renderStyle1={renderStyle1}/>;
    }
);

export default PskEditor;
