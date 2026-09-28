import React from "react";
import {Button, Collapse, Flex, InputNumber, Select, Space, Switch, Table, Tooltip, Typography} from "antd";
import {DeleteOutlined, PlusOutlined, QuestionCircleOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import {NullableStringInput, NumberField, Row} from "../parts/formControls";
import JsonObjectForm from "../common/JsonObjectForm";

/**
 * 碰撞体载荷表单（dbcol/dslcol/ikcol/ikcol.bytes/limbcol）
 * 对标 COM3D2 ColEditor 的 Style1：碰撞体列表 + 按类型的专用字段编辑
 * union 类型：0=Plane, 1=Capsule, 2=Sphere, 3=MaidProp（对应游戏 ANativeColliderStatus 的 Union 标记）
 * 字段语义 / 默认值 / 枚举以游戏源码 kt.Physics.*ColliderStatus 为准
 */

// 碰撞体类型的 i18n 标签键（选项 value 保持数字枚举，展示用翻译名 + 编号）
const ColliderTypeLabelKeys: Record<number, string> = {
    0: "ColliderEditor.type_plane",
    1: "ColliderEditor.type_capsule",
    2: "ColliderEditor.type_sphere",
    3: "ColliderEditor.type_maidprop",
};

// 标签行 + 控件 + 右侧问号 tooltip；定义在组件外，避免每次渲染都生成新组件类型导致输入失焦
const LabeledRow: React.FC<{ label: string; tip: React.ReactNode; children: React.ReactNode }> = ({
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

// 各类型的新建模板（按游戏构造默认值）
function newCollider(type: number): any {
    const base = {
        version: 1000,
        parentName: "",
        selfName: "",
        localPosition: {x: 0, y: 0, z: 0},
        localRotation: {x: 0, y: 0, z: 0, w: 1},
        localScale: {x: 1, y: 1, z: 1},
        center: {x: 0, y: 0, z: 0},
        bound: 0,
    };
    switch (type) {
        case 0: // Plane
            return {...base, direction: 1, isDirectionInverse: false};
        case 2: // Sphere
            return {...base, radius: 0.5};
        case 3: // MaidProp（继承 Capsule，FixVersion 为 1002）
            return {
                ...base, version: 1002, direction: 1, isDirectionInverse: false,
                startRadius: 0.5, endRadius: 0.5, height: 0,
                centerMpnList: [], centerRateMax: {x: 0, y: 0, z: 0},
                startRadiusMpnList: [], maxStartRadius: 1,
                endRadiusMpnList: [], maxEndRadius: 1,
                centerMpnNameList: [], startRadiusMpnNameList: [], endRadiusMpnNameList: [],
            };
        case 1: // Capsule
        default:
            return {...base, direction: 1, isDirectionInverse: false, startRadius: 0.5, endRadius: 0.5, height: 0};
    }
}

// VectorFields 向量分量输入（xyz / xyzw）
const VectorFields: React.FC<{
    value: any;
    axes: string[];
    onChange: (next: any) => void;
}> = ({value, axes, onChange}) => (
    <Space size={4} wrap>
        {axes.map((axis) => (
            <InputNumber
                key={axis}
                size="small"
                style={{width: 92}}
                step={0.01}
                prefix={axis.toUpperCase()}
                value={value?.[axis] ?? 0}
                onChange={(v) => onChange({...value, [axis]: (v ?? 0) as number})}
            />
        ))}
    </Space>
);

/** ColliderFields 单个碰撞体对象的字段编辑（基类 + 类型专有） */
export const ColliderFields: React.FC<{
    type: number;
    collider: any;
    onChange: (next: any) => void;
}> = ({type, collider, onChange}) => {
    const {t} = useTranslation();
    const set = (field: string, value: any) => onChange({...collider, [field]: value});

    // MaidProp 的 MPN 列表等复杂字段回退通用表单
    const maidPropExtras = ["centerMpnList", "centerRateMax", "startRadiusMpnList", "maxStartRadius",
        "endRadiusMpnList", "maxEndRadius", "centerMpnNameList", "startRadiusMpnNameList", "endRadiusMpnNameList"];

    return (
        <div>
            <LabeledRow label={t('ColliderEditor.parentName')} tip={t('ColliderEditor.parentName_tip')}>
                <NullableStringInput value={collider.parentName} onChange={(v) => set("parentName", v)}/>
            </LabeledRow>
            <LabeledRow label={t('ColliderEditor.selfName')} tip={t('ColliderEditor.selfName_tip')}>
                <NullableStringInput value={collider.selfName} onChange={(v) => set("selfName", v)}/>
            </LabeledRow>
            <LabeledRow label={t('ColliderEditor.localPosition')} tip={t('ColliderEditor.localPosition_tip')}>
                <VectorFields value={collider.localPosition} axes={["x", "y", "z"]}
                              onChange={(v) => set("localPosition", v)}/>
            </LabeledRow>
            <LabeledRow label={t('ColliderEditor.localRotation')} tip={t('ColliderEditor.localRotation_tip')}>
                <VectorFields value={collider.localRotation} axes={["x", "y", "z", "w"]}
                              onChange={(v) => set("localRotation", v)}/>
            </LabeledRow>
            <LabeledRow label={t('ColliderEditor.localScale')} tip={t('ColliderEditor.localScale_tip')}>
                <VectorFields value={collider.localScale} axes={["x", "y", "z"]}
                              onChange={(v) => set("localScale", v)}/>
            </LabeledRow>
            <LabeledRow label={t('ColliderEditor.center')} tip={t('ColliderEditor.center_tip')}>
                <VectorFields value={collider.center} axes={["x", "y", "z"]}
                              onChange={(v) => set("center", v)}/>
            </LabeledRow>
            <LabeledRow label={t('ColliderEditor.bound')} tip={t('ColliderEditor.bound_tip')}>
                <Select
                    size="small"
                    style={{width: 160}}
                    value={collider.bound ?? 0}
                    options={[
                        {label: t('ColliderEditor.bound_outside'), value: 0},
                        {label: t('ColliderEditor.bound_inside'), value: 1},
                    ]}
                    onChange={(v) => set("bound", v)}
                />
            </LabeledRow>
            <LabeledRow label={t('ColliderEditor.version')} tip={t('ColliderEditor.version_tip')}>
                <NumberField precision={0} value={collider.version} onChange={(v) => set("version", v)}/>
            </LabeledRow>

            {(type === 0 || type === 1 || type === 3) && (
                <>
                    <LabeledRow label={t('ColliderEditor.direction')} tip={t('ColliderEditor.direction_tip')}>
                        <Select
                            size="small"
                            style={{width: 160}}
                            value={collider.direction ?? 1}
                            options={[
                                {label: t('ColliderEditor.direction_x'), value: 0},
                                {label: t('ColliderEditor.direction_y'), value: 1},
                                {label: t('ColliderEditor.direction_z'), value: 2},
                            ]}
                            onChange={(v) => set("direction", v)}
                        />
                    </LabeledRow>
                    <LabeledRow label={t('ColliderEditor.isDirectionInverse')}
                                tip={t('ColliderEditor.isDirectionInverse_tip')}>
                        <Switch size="small" checked={!!collider.isDirectionInverse}
                                onChange={(checked) => set("isDirectionInverse", checked)}/>
                    </LabeledRow>
                </>
            )}
            {(type === 1 || type === 3) && (
                <>
                    <LabeledRow label={t('ColliderEditor.startRadius')} tip={t('ColliderEditor.startRadius_tip')}>
                        <NumberField step={0.01} value={collider.startRadius}
                                     onChange={(v) => set("startRadius", v)}/>
                    </LabeledRow>
                    <LabeledRow label={t('ColliderEditor.endRadius')} tip={t('ColliderEditor.endRadius_tip')}>
                        <NumberField step={0.01} value={collider.endRadius}
                                     onChange={(v) => set("endRadius", v)}/>
                    </LabeledRow>
                    <LabeledRow label={t('ColliderEditor.height')} tip={t('ColliderEditor.height_tip')}>
                        <NumberField step={0.01} value={collider.height}
                                     onChange={(v) => set("height", v)}/>
                    </LabeledRow>
                </>
            )}
            {type === 2 && (
                <LabeledRow label={t('ColliderEditor.radius')} tip={t('ColliderEditor.radius_tip')}>
                    <NumberField step={0.01} value={collider.radius} onChange={(v) => set("radius", v)}/>
                </LabeledRow>
            )}
            {type === 3 && (
                <Collapse
                    size="small"
                    items={[{
                        key: "maidprop",
                        label: (
                            <Space>
                                {t('ColliderEditor.maidprop_extras')}
                                <Tooltip title={t('ColliderEditor.maidprop_extras_tip')}>
                                    <QuestionCircleOutlined/>
                                </Tooltip>
                            </Space>
                        ),
                        children: (
                            <JsonObjectForm
                                value={Object.fromEntries(maidPropExtras.map((key) => [key, collider[key] ?? null]))}
                                onChange={(next) => onChange({...collider, ...next})}
                                defaultExpandDepth={0}
                            />
                        ),
                    }]}
                />
            )}
        </div>
    );
};

/** ColliderRefList 碰撞体引用列表（{type, collider} 数组）编辑 */
export const ColliderRefList: React.FC<{
    colliders: any[];
    onChange: (next: any[]) => void;
}> = ({colliders, onChange}) => {
    const {t} = useTranslation();
    const [addType, setAddType] = React.useState(1);

    const items = (colliders ?? []).map((ref, index) => ({
        key: String(index),
        label: (
            <Space>
                <Typography.Text strong>
                    {ColliderTypeLabelKeys[ref?.type] ? t(ColliderTypeLabelKeys[ref?.type]) : `#${ref?.type}`}
                </Typography.Text>
                <Typography.Text type="secondary">
                    {ref?.collider?.selfName || ref?.collider?.parentName || `#${index}`}
                </Typography.Text>
                <Button
                    size="small" type="text" danger icon={<DeleteOutlined/>}
                    onClick={(e) => {
                        e.stopPropagation();
                        const next = [...colliders];
                        next.splice(index, 1);
                        onChange(next);
                    }}
                />
            </Space>
        ),
        children: (
            <ColliderFields
                type={ref?.type ?? 1}
                collider={ref?.collider ?? {}}
                onChange={(next) => {
                    const list = [...colliders];
                    list[index] = {...ref, collider: next};
                    onChange(list);
                }}
            />
        ),
    }));

    return (
        <div>
            <Space style={{marginBottom: 8}}>
                <Select
                    size="small"
                    style={{width: 200}}
                    value={addType}
                    options={Object.keys(ColliderTypeLabelKeys).map((value) => ({
                        label: t(ColliderTypeLabelKeys[Number(value)]),
                        value: Number(value),
                    }))}
                    onChange={setAddType}
                />
                <Button size="small" icon={<PlusOutlined/>}
                        onClick={() => onChange([...(colliders ?? []), {
                            type: addType,
                            collider: newCollider(addType)
                        }])}>
                    {t('ColliderEditor.add_collider')}
                </Button>
            </Space>
            {items.length > 0
                ? <Collapse size="small" items={items}/>
                : <Typography.Text type="secondary">{t('JsonForm.empty_array')}</Typography.Text>}
        </div>
    );
};

/** ColliderPackageForm 通用碰撞体包（dbcol/dslcol 的 colliderPackage 分支） */
export const ColliderPackageForm: React.FC<{
    value: any;
    onChange: (next: any) => void;
}> = ({value, onChange}) => {
    const {t} = useTranslation();
    const set = (field: string, fieldValue: any) => onChange({...value, [field]: fieldValue});

    const limbStates: any[] = value?.limbEnableList ?? [];

    // updateLimbState 按行号把补丁合并进原始条目，不经过表格行对象
    const updateLimbState = (index: number, patch: any) => {
        const next = [...limbStates];
        next[index] = {...next[index], ...patch};
        set("limbEnableList", next);
    };

    return (
        <div style={{textAlign: "left"}}>
            <LabeledRow label={t('ColliderEditor.version')} tip={t('ColliderEditor.version_tip')}>
                <NumberField precision={0} value={value?.version} onChange={(v) => set("version", v)}/>
            </LabeledRow>
            <Typography.Title level={5} style={{textAlign: "left"}}>
                {t('ColliderEditor.colliders_title', {count: (value?.colliders ?? []).length})}
            </Typography.Title>
            <ColliderRefList colliders={value?.colliders ?? []} onChange={(next) => set("colliders", next)}/>

            {value?.limbEnableList !== undefined && value?.limbEnableList !== null && (
                <>
                    <Typography.Title level={5} style={{textAlign: "left", marginTop: 12}}>
                        {t('ColliderEditor.limb_enable_list_title', {count: limbStates.length})}
                    </Typography.Title>
                    <Table
                        size="small"
                        // antd v6 起 rowKey 不再接受 index 参数，改由 dataSource 携带行号；
                        // 各列都按 index 读写 limbStates，行对象只承载这个键，不会被写回文件
                        rowKey="__rowKey"
                        pagination={false}
                        dataSource={limbStates.map((_, index) => ({__rowKey: index}))}
                        columns={[
                            {
                                title: (
                                    <Space>
                                        {t('ColliderEditor.limbType')}
                                        <Tooltip title={t('ColliderEditor.limbType_tip')}>
                                            <QuestionCircleOutlined/>
                                        </Tooltip>
                                    </Space>
                                ),
                                width: 120,
                                render: (_: any, __: any, index: number) => (
                                    <InputNumber size="small" precision={0} value={limbStates[index]?.limbType}
                                                 onChange={(v) => updateLimbState(index, {limbType: (v ?? 0) as number})}/>
                                ),
                            },
                            {
                                title: t('ColliderEditor.isEnable'),
                                width: 100,
                                render: (_: any, __: any, index: number) => (
                                    <Switch size="small" checked={!!limbStates[index]?.isEnable}
                                            onChange={(checked) => updateLimbState(index, {isEnable: checked})}/>
                                ),
                            },
                            {
                                title: t('ColliderEditor.version'),
                                width: 110,
                                render: (_: any, __: any, index: number) => (
                                    <InputNumber size="small" precision={0} value={limbStates[index]?.version}
                                                 onChange={(v) => updateLimbState(index, {version: (v ?? 0) as number})}/>
                                ),
                            },
                            {
                                title: t('Common.operate'),
                                width: 60,
                                render: (_: any, __: any, index: number) => (
                                    <Button size="small" type="text" danger icon={<DeleteOutlined/>}
                                            onClick={() => {
                                                const next = [...limbStates];
                                                next.splice(index, 1);
                                                set("limbEnableList", next);
                                            }}/>
                                ),
                            },
                        ] as any}
                        footer={() => (
                            <Button size="small" style={{width: "100%"}} icon={<PlusOutlined/>}
                                    onClick={() => set("limbEnableList", [...limbStates, {
                                        version: 1000,
                                        limbType: 0,
                                        isEnable: true
                                    }])}>
                                {t('ColliderEditor.add_state')}
                            </Button>
                        )}
                    />
                </>
            )}
        </div>
    );
};
