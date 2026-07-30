import React from "react";
import {Button, Collapse, InputNumber, Select, Space, Switch, Table, Typography} from "antd";
import {DeleteOutlined, PlusOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import {NullableStringInput, NumberField, Row} from "../parts/formControls";
import JsonObjectForm from "../common/JsonObjectForm";

/**
 * 碰撞体载荷表单（dbcol/dslcol/ikcol/ikcol.bytes/limbcol）
 * 对标 COM3D2 ColEditor 的 Style1：碰撞体列表 + 按类型的专用字段编辑
 * union 类型：0=Plane, 1=Capsule, 2=Sphere, 3=MaidProp（对应游戏 ANativeColliderStatus 的 Union 标记）
 */

const ColliderTypeNames: Record<number, string> = {
    0: "Plane",
    1: "Capsule",
    2: "Sphere",
    3: "MaidProp",
};

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
        case 0:
            return {...base, direction: 1, isDirectionInverse: false};
        case 2:
            return {...base, radius: 0.1};
        case 3:
            return {
                ...base, direction: 0, isDirectionInverse: false,
                startRadius: 0.1, endRadius: 0.1, height: 0.2,
                centerMpnList: [], centerRateMax: {x: 0, y: 0, z: 0},
                startRadiusMpnList: [], maxStartRadius: 1,
                endRadiusMpnList: [], maxEndRadius: 1,
                centerMpnNameList: [], startRadiusMpnNameList: [], endRadiusMpnNameList: [],
            };
        case 1:
        default:
            return {...base, direction: 0, isDirectionInverse: false, startRadius: 0.1, endRadius: 0.1, height: 0.2};
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
                addonBefore={axis.toUpperCase()}
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
            <Row label="parentName">
                <NullableStringInput value={collider.parentName} onChange={(v) => set("parentName", v)}/>
            </Row>
            <Row label="selfName">
                <NullableStringInput value={collider.selfName} onChange={(v) => set("selfName", v)}/>
            </Row>
            <Row label="localPosition">
                <VectorFields value={collider.localPosition} axes={["x", "y", "z"]}
                              onChange={(v) => set("localPosition", v)}/>
            </Row>
            <Row label="localRotation">
                <VectorFields value={collider.localRotation} axes={["x", "y", "z", "w"]}
                              onChange={(v) => set("localRotation", v)}/>
            </Row>
            <Row label="localScale">
                <VectorFields value={collider.localScale} axes={["x", "y", "z"]}
                              onChange={(v) => set("localScale", v)}/>
            </Row>
            <Row label="center">
                <VectorFields value={collider.center} axes={["x", "y", "z"]}
                              onChange={(v) => set("center", v)}/>
            </Row>
            <Row label={t('ColliderEditor.bound')}>
                <Select
                    size="small"
                    style={{width: 160}}
                    value={collider.bound ?? 0}
                    options={[{label: "Outside (0)", value: 0}, {label: "Inside (1)", value: 1}]}
                    onChange={(v) => set("bound", v)}
                />
            </Row>
            <Row label="version">
                <NumberField precision={0} value={collider.version} onChange={(v) => set("version", v)}/>
            </Row>

            {(type === 0 || type === 1 || type === 3) && (
                <Row label="direction">
                    <Space>
                        <NumberField precision={0} width={90} value={collider.direction}
                                     onChange={(v) => set("direction", v)}/>
                        <span>isDirectionInverse</span>
                        <Switch size="small" checked={!!collider.isDirectionInverse}
                                onChange={(checked) => set("isDirectionInverse", checked)}/>
                    </Space>
                </Row>
            )}
            {(type === 1 || type === 3) && (
                <Row label={t('ColliderEditor.capsule_size')}>
                    <Space size={4} wrap>
                        <InputNumber size="small" style={{width: 130}} step={0.01} addonBefore="start"
                                     value={collider.startRadius}
                                     onChange={(v) => set("startRadius", (v ?? 0) as number)}/>
                        <InputNumber size="small" style={{width: 130}} step={0.01} addonBefore="end"
                                     value={collider.endRadius}
                                     onChange={(v) => set("endRadius", (v ?? 0) as number)}/>
                        <InputNumber size="small" style={{width: 140}} step={0.01} addonBefore="height"
                                     value={collider.height}
                                     onChange={(v) => set("height", (v ?? 0) as number)}/>
                    </Space>
                </Row>
            )}
            {type === 2 && (
                <Row label="radius">
                    <NumberField step={0.01} value={collider.radius} onChange={(v) => set("radius", v)}/>
                </Row>
            )}
            {type === 3 && (
                <Collapse
                    size="small"
                    items={[{
                        key: "maidprop",
                        label: t('ColliderEditor.maidprop_extras'),
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
                    {ColliderTypeNames[ref?.type] ?? `#${ref?.type}`}
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
                    style={{width: 140}}
                    value={addType}
                    options={Object.entries(ColliderTypeNames).map(([value, label]) => ({
                        label: `${label} (${value})`,
                        value: Number(value),
                    }))}
                    onChange={setAddType}
                />
                <Button size="small" icon={<PlusOutlined/>}
                        onClick={() => onChange([...(colliders ?? []), {type: addType, collider: newCollider(addType)}])}>
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

    return (
        <div style={{textAlign: "left"}}>
            <Row label="version">
                <NumberField precision={0} value={value?.version} onChange={(v) => set("version", v)}/>
            </Row>
            <Typography.Title level={5} style={{textAlign: "left"}}>
                colliders ({(value?.colliders ?? []).length})
            </Typography.Title>
            <ColliderRefList colliders={value?.colliders ?? []} onChange={(next) => set("colliders", next)}/>

            {value?.limbEnableList !== undefined && value?.limbEnableList !== null && (
                <>
                    <Typography.Title level={5} style={{textAlign: "left", marginTop: 12}}>
                        limbEnableList ({limbStates.length})
                    </Typography.Title>
                    <Table
                        size="small"
                        rowKey={(_, index) => String(index)}
                        pagination={false}
                        dataSource={limbStates}
                        columns={[
                            {
                                title: "limbType",
                                width: 120,
                                render: (_: any, record: any, index: number) => (
                                    <InputNumber size="small" precision={0} value={record?.limbType}
                                                 onChange={(v) => {
                                                     const next = [...limbStates];
                                                     next[index] = {...record, limbType: (v ?? 0) as number};
                                                     set("limbEnableList", next);
                                                 }}/>
                                ),
                            },
                            {
                                title: "isEnable",
                                width: 100,
                                render: (_: any, record: any, index: number) => (
                                    <Switch size="small" checked={!!record?.isEnable}
                                            onChange={(checked) => {
                                                const next = [...limbStates];
                                                next[index] = {...record, isEnable: checked};
                                                set("limbEnableList", next);
                                            }}/>
                                ),
                            },
                            {
                                title: "version",
                                width: 110,
                                render: (_: any, record: any, index: number) => (
                                    <InputNumber size="small" precision={0} value={record?.version}
                                                 onChange={(v) => {
                                                     const next = [...limbStates];
                                                     next[index] = {...record, version: (v ?? 0) as number};
                                                     set("limbEnableList", next);
                                                 }}/>
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

/** LimbColliderForm limbcol 的 limbColliderPackage 分支 */
export const LimbColliderForm: React.FC<{
    value: any;
    onChange: (next: any) => void;
}> = ({value, onChange}) => {
    const {t} = useTranslation();
    const set = (field: string, fieldValue: any) => onChange({...value, [field]: fieldValue});
    const items: any[] = value?.items ?? [];

    return (
        <div style={{textAlign: "left"}}>
            <Row label="version">
                <NumberField precision={0} value={value?.version} onChange={(v) => set("version", v)}/>
            </Row>
            <Typography.Title level={5} style={{textAlign: "left"}}>items ({items.length})</Typography.Title>
            <Collapse
                size="small"
                items={items.map((item, index) => ({
                    key: String(index),
                    label: (
                        <Space>
                            <Typography.Text strong>target = {String(item?.target ?? 0)}</Typography.Text>
                            <Typography.Text type="secondary">
                                {item?.collider?.selfName || `#${index}`}
                            </Typography.Text>
                        </Space>
                    ),
                    children: (
                        <div>
                            <Row label="target">
                                <NumberField precision={0} value={item?.target}
                                             onChange={(v) => {
                                                 const next = [...items];
                                                 next[index] = {...item, target: v};
                                                 set("items", next);
                                             }}/>
                            </Row>
                            <ColliderFields
                                type={3}
                                collider={item?.collider ?? {}}
                                onChange={(next) => {
                                    const list = [...items];
                                    list[index] = {...item, collider: next};
                                    set("items", list);
                                }}
                            />
                        </div>
                    ),
                }))}
            />
            {items.length === 0 && <Typography.Text type="secondary">{t('JsonForm.empty_array')}</Typography.Text>}
        </div>
    );
};

/** IKColliderForm ikcol/ikcol.bytes 的 ikColliderPackage 分支 */
export const IKColliderForm: React.FC<{
    value: any;
    onChange: (next: any) => void;
}> = ({value, onChange}) => {
    const set = (field: string, fieldValue: any) => onChange({...value, [field]: fieldValue});
    const groups: any[] = value?.groups ?? [];

    return (
        <div style={{textAlign: "left"}}>
            <Row label="version">
                <NumberField precision={0} value={value?.version} onChange={(v) => set("version", v)}/>
            </Row>
            <Typography.Title level={5} style={{textAlign: "left"}}>groups ({groups.length})</Typography.Title>
            <Collapse
                size="small"
                items={groups.map((group, index) => ({
                    key: String(index),
                    label: (
                        <Typography.Text strong>
                            target = {String(group?.target ?? 0)} · colliders ({(group?.colliders ?? []).length})
                        </Typography.Text>
                    ),
                    children: (
                        <div>
                            <Row label="target">
                                <NumberField precision={0} value={group?.target}
                                             onChange={(v) => {
                                                 const next = [...groups];
                                                 next[index] = {...group, target: v};
                                                 set("groups", next);
                                             }}/>
                            </Row>
                            <ColliderRefList
                                colliders={group?.colliders ?? []}
                                onChange={(next) => {
                                    const list = [...groups];
                                    list[index] = {...group, colliders: next};
                                    set("groups", list);
                                }}
                            />
                        </div>
                    ),
                }))}
            />
        </div>
    );
};
