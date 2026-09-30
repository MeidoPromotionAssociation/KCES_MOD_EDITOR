import React from "react";
import type {CollapseProps} from "antd";
import {Button, Collapse, Flex, InputNumber, Select, Space, Switch, Table, Tag, Tooltip, Typography} from "antd";
import {DeleteOutlined, PlusOutlined, QuestionCircleOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import {EnumAutoComplete, NullableStringInput, NumberField, Row} from "../parts/formControls";
import {LimbTypeNames, MPNNumberOptions, mpnName} from "../../utils/kcesEnums";

/**
 * 碰撞体载荷表单（dbcol/dslcol/ikcol/ikcol.bytes/limbcol）
 * 对标 COM3D2 ColEditor 的 Style1：碰撞体列表 + 按类型的专用字段编辑
 * union 类型：0=Plane, 1=Capsule, 2=Sphere, 3=MaidProp（对应游戏 ANativeColliderStatus 的 Union 标记）
 * 字段语义 / 默认值 / 枚举以游戏源码 kt.Physics.*ColliderStatus 为准
 *
 * limbEnableList 是「本物体是否使用各肢体的预定义碰撞体」的开关表，不是碰撞体本身的定义：
 * 碰撞体由 TBody 上的 LimbColliderMgr 从 limbconf.limbcol 建好、挂在肢体骨骼上（长度按相邻骨骼距离
 * 自动算），DynamicYureBone.LimbColliderInfo 里的 collider 是 [IgnoreMember]，不写进文件
 * （DynamicYureBone.cs:1499-1521），加载时按 limbType 现取；isEnable 在粒子碰撞循环里被检查
 * （DynamicYureBone.cs:989-995），且只影响使用本文件的物体。游戏侧 limbType 是 [ReadOnly]，
 * 列表恒为 8 条、顺序即 LimbColliderMgr.LimbType 的声明顺序。
 */

// 碰撞体类型的 i18n 标签键（选项 value 保持数字枚举，展示用翻译名 + 编号）
const ColliderTypeLabelKeys: Record<number, string> = {
    0: "ColliderEditor.type_plane",
    1: "ColliderEditor.type_capsule",
    2: "ColliderEditor.type_sphere",
    3: "ColliderEditor.type_maidprop",
};

// LimbColliderMgr.LimbType 枚举名的 i18n 标签键（下标即枚举值，见 kcesEnums.LimbTypeNames）
const LimbTypeLabelKeys: Record<string, string> = {
    UpperArm_L: "ColliderEditor.limb_type_upperarm_l",
    Forearm_L: "ColliderEditor.limb_type_forearm_l",
    UpperArm_R: "ColliderEditor.limb_type_upperarm_r",
    Forearm_R: "ColliderEditor.limb_type_forearm_r",
    Thigh_L: "ColliderEditor.limb_type_thigh_l",
    Calf_L: "ColliderEditor.limb_type_calf_l",
    Thigh_R: "ColliderEditor.limb_type_thigh_r",
    Calf_R: "ColliderEditor.limb_type_calf_r",
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

/**
 * MaidProp 扩展字段的三组「滑条 → 尺寸」参数（ColliderMaidProp 的 Key 16-24）
 *
 * 游戏侧语义（NativeMaidPropCollider.cs:40-88）：把列表里每个 MPN 滑条按
 * InverseLerp(min, max, value) 归一化到 0..1，取其中**最大值**当插值系数 t，于是
 *   中心   = Vector3.Lerp(center, centerRateMax, t)
 *   起点半径 = Mathf.Lerp(startRadius, maxStartRadius, t)
 *   终点半径 = Mathf.Lerp(endRadius, maxEndRadius, t)
 * 列表为空或滑条都是 0 时 t=0，退化成 center / startRadius / endRadius。
 */
const MaidPropGroups: Array<{
    /** 驱动插值的 MPN 枚举列表 */
    list: string;
    /** 滑条拉满时的目标值 */
    max: string;
    /** 目标值是向量（中心点）还是标量（半径） */
    maxIsVector: boolean;
    /** 枚举列表的名称镜像，游戏保存时自动生成 */
    nameList: string;
}> = [
    {list: "centerMpnList", max: "centerRateMax", maxIsVector: true, nameList: "centerMpnNameList"},
    {list: "startRadiusMpnList", max: "maxStartRadius", maxIsVector: false, nameList: "startRadiusMpnNameList"},
    {list: "endRadiusMpnList", max: "maxEndRadius", maxIsVector: false, nameList: "endRadiusMpnNameList"},
];

/** MaidPropExtrasFields MaidProp 碰撞体的 MPN 插值参数（Key 16-24） */
const MaidPropExtrasFields: React.FC<{
    collider: any;
    onChange: (next: any) => void;
}> = ({collider, onChange}) => {
    const {t} = useTranslation();

    // 枚举列表与名称列表必须一起改：游戏在 version >= 1002 时用 centerMpnNameList 反推
    // centerMpnList（起点/终点两个仍读枚举列表，见 NativeMaidPropColliderStatus.cs:39-58），
    // 只改一边会让改动被忽略、或留下两份不一致的数据。
    // 旧文件（version <= 1001）根本没有名称列表字段（线格式宽度 22），保持 null 不动，
    // 否则会把线格式撑成 25 宽的布局。
    const setMpnList = (group: (typeof MaidPropGroups)[number], values: number[]) => {
        const next: any = {...collider, [group.list]: values};
        const names = collider[group.nameList];
        if (names !== null && names !== undefined) {
            next[group.nameList] = values.map((value) => mpnName(value));
        }
        onChange(next);
    };

    return (
        <div>
            {MaidPropGroups.map((group) => {
                const values: number[] = Array.isArray(collider[group.list]) ? collider[group.list] : [];
                const names = collider[group.nameList];
                return (
                    <React.Fragment key={group.list}>
                        <LabeledRow label={t(`ColliderEditor.${group.list}`)}
                                    tip={t(`ColliderEditor.${group.list}_tip`)}>
                            <Select
                                size="small"
                                mode="multiple"
                                style={{width: 420}}
                                value={values}
                                options={MPNNumberOptions}
                                showSearch={{optionFilterProp: "label"}}
                                styles={{popup: {root: {textAlign: "left"}}}}
                                onChange={(next: number[]) => setMpnList(group, next)}
                            />
                        </LabeledRow>
                        <LabeledRow label={t(`ColliderEditor.${group.max}`)}
                                    tip={t(`ColliderEditor.${group.max}_tip`)}>
                            {group.maxIsVector ? (
                                <VectorFields value={collider[group.max]} axes={["x", "y", "z"]}
                                              onChange={(v) => onChange({...collider, [group.max]: v})}/>
                            ) : (
                                <NumberField step={0.001} value={collider[group.max]}
                                             onChange={(v) => onChange({...collider, [group.max]: v})}/>
                            )}
                        </LabeledRow>
                        <LabeledRow label={t(`ColliderEditor.${group.nameList}`)}
                                    tip={t('ColliderEditor.mpn_name_list_tip')}>
                            <Space size={4} wrap>
                                {names === null || names === undefined
                                    ? <Typography.Text type="secondary">
                                        {t('ColliderEditor.mpn_name_list_absent')}
                                    </Typography.Text>
                                    : names.length === 0
                                        ? <Typography.Text type="secondary">{t('JsonForm.empty_array')}</Typography.Text>
                                        : names.map((name: string, index: number) => (
                                            <Tag key={index}>{name}</Tag>
                                        ))}
                            </Space>
                        </LabeledRow>
                    </React.Fragment>
                );
            })}
        </div>
    );
};

/** ColliderFields 单个碰撞体对象的字段编辑（基类 + 类型专有） */
export const ColliderFields: React.FC<{
    type: number;
    collider: any;
    onChange: (next: any) => void;
}> = ({type, collider, onChange}) => {
    const {t} = useTranslation();
    const set = (field: string, value: any) => onChange({...collider, [field]: value});

    return (
        <div>
            <LabeledRow label={t('ColliderEditor.version')} tip={t('ColliderEditor.version_tip')}>
                <NumberField precision={0} value={collider.version} onChange={(v) => set("version", v)}/>
            </LabeledRow>
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
                        children: <MaidPropExtrasFields collider={collider} onChange={onChange}/>,
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
                ? <Collapse size="small" items={items}/> : null}
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

    /** 枚举名 → 对应语言翻译，无翻译时返回 null（选项格式由控件拼装） */
    const limbTypeLabelOf = (name: string): string | null =>
        t(LimbTypeLabelKeys[name] ?? "", {defaultValue: ""}) || null;

    // updateLimbState 按行号把补丁合并进原始条目，不经过表格行对象
    const updateLimbState = (index: number, patch: any) => {
        const next = [...limbStates];
        next[index] = {...next[index], ...patch};
        set("limbEnableList", next);
    };

    // 顶层成员按用途分组进折叠面板，与 DynamicBoneForm / MagicaClothForm 的版式一致
    const items: NonNullable<CollapseProps["items"]> = [
        {
            key: "colliders",
            label: (
                <Typography.Text strong>
                    {t('ColliderEditor.colliders_title', {count: (value?.colliders ?? []).length})}
                </Typography.Text>
            ),
            children: (
                <ColliderRefList colliders={value?.colliders ?? []} onChange={(next) => set("colliders", next)}/>
            ),
        }
    ];

    // limbEnableList 在旧文件里可能是 null（或字段缺失），此时不显示这个面板
    if (value?.limbEnableList !== undefined && value?.limbEnableList !== null) {
        items.push({
            key: "limb",
            label: (
                <Typography.Text strong>
                    {t('ColliderEditor.limb_enable_list_title', {count: limbStates.length})}
                </Typography.Text>
            ),
            children: (
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
                            width: 220,
                            render: (_: any, __: any, index: number) => (
                                <EnumAutoComplete
                                    size="small"
                                    width={200}
                                    value={limbStates[index]?.limbType}
                                    names={LimbTypeNames}
                                    labelOf={limbTypeLabelOf}
                                    onChange={(v) => updateLimbState(index, {limbType: v})}
                                />
                            ),
                        },
                        {
                            title: (
                                <Space>
                                    {t('ColliderEditor.isEnable')}
                                    <Tooltip title={t('ColliderEditor.isEnable_tip')}>
                                        <QuestionCircleOutlined/>
                                    </Tooltip>
                                </Space>
                            ),
                            width: 130,
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
            ),
        });
    }

    items.push(
        {
            key: "general",
            label:
                <Typography.Text strong>{t('PayloadEditor.general_params')}</Typography.Text>,
            children:
                (
                    <LabeledRow label={t('ColliderEditor.version')} tip={t('ColliderEditor.version_tip')}>
                        <NumberField precision={0} value={value?.version} onChange={(v) => set("version", v)}/>
                    </LabeledRow>
                ),
        })


    return (
        <div style={{textAlign: "left"}}>
            <Collapse size="small" defaultActiveKey={["colliders", "limb"]} items={items}/>
        </div>
    );
};
