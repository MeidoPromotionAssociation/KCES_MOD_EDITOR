import React from "react";
import {Alert, Input, Space, Tag, Typography} from "antd";
import {useTranslation} from "react-i18next";
import JsonObjectForm, {FieldMeta} from "../common/JsonObjectForm";
import PresetRecordTable, {RecordColumn} from "./PresetRecordTable";

/**
 * PresetTableView .preset 的表格视图（样式1）
 *
 * preset 的数组都是「记录型数组」，但 JsonObjectForm 的数组渲染上限是 100 项，
 * 而 maidData.propData.properties 实测 291 项 —— 也就是说这个主列表在表单里根本渲染不出来。
 * 所以这里单独做表格：关键列只读展示，点行展开后编辑整条记录；
 * 展开区里把嵌套的 materialProperties / base.subProperties 也做成子表格。
 *
 * 更深的层级（子属性里再嵌套的子属性）不再往下铺表格，仍交给 JsonObjectForm 的折叠面板，
 * 否则表格会无限套下去。
 */

/**
 * 展开行「其余字段」表单的译名与说明，路径相对 property（即 JsonObjectForm 收到的对象）。
 * 摘掉的两个数组（materialProperties / base.subProperties）由子表格负责，不在这里。
 */
const EXPANDED_FIELDS = [
    "signature",
    "version",
    "name",
    "defaultValue",
    "value",
    "tempValue",
    "fileNameRid",
    "enabled",
    "max",
    "min",
    "materialProperties",
    "base",
    "base.index",
    "base.type",
    "base.subType",
    "base.fileName",
    "base.fileNameRid",
    "base.beforeFileNameRid",
    "base.enabled",
    "base.defines",
    "base.noScale",
    "base.subPropertyIsTuftTexture",
    "base.shareInfinityColorData",
    "base.usePartHide",
    "base.savedTextureDataRid",
    "base.savedTextureDataDefines",
    "base.savedTextureData",
    "base.savedCutoutMaskRid",
    "base.savedCutoutMask",
    "base.savedPartHideRid",
    "base.savedPartHide",
    "base.savedAttachPositionRid",
    "base.savedAttachPositions",
    "base.savedHairLengthRid",
    "base.savedHairLengths",
    "base.editBaseData",
    "base.subProperties",
];

/** 沿路径不可变写回，只重建路径上的对象 */
function setAtPath(root: any, path: string[], next: any): any {
    if (path.length === 0) {
        return next;
    }
    const [head, ...rest] = path;
    return {...root, [head]: setAtPath(root?.[head], rest, next)};
}

/**
 * 展开区里由子表格负责的两个数组（相对 property 的路径）
 * JsonObjectForm 拿到的对象要把它们摘掉，改完再按原样合并回去，
 * 否则同一份数据会有两套编辑入口
 */
function omitTableArrays(record: any): any {
    const copy = {...(record ?? {})};
    delete copy.materialProperties;
    if (copy.base && typeof copy.base === "object") {
        copy.base = {...copy.base};
        delete copy.base.subProperties;
    }
    return copy;
}

function mergeTableArrays(edited: any, original: any): any {
    const merged = {...(edited ?? {})};
    if (original && "materialProperties" in original) {
        merged.materialProperties = original.materialProperties;
    }
    if (original?.base && typeof original.base === "object") {
        merged.base = {...(merged.base ?? {})};
        if ("subProperties" in original.base) {
            merged.base.subProperties = original.base.subProperties;
        }
    }
    return merged;
}

/** 深拷贝一条记录当新增模板：preset 的字段有固定集合，克隆现成记录比凭空造更安全 */
function cloneRecord(record: any): any {
    return JSON.parse(JSON.stringify(record));
}

const cell = (value: any) => (value === null || value === undefined ? "" : String(value));

const PresetTableView: React.FC<{
    data: any;
    setData: (next: any) => void;
}> = ({data, setData}) => {
    const {t} = useTranslation();

    /** 展开行「其余字段」的字段文案：按路径取自 PresetField 段，缺失时回落原始 key */
    const expandedFieldMeta = React.useMemo(() => {
        const meta: Record<string, FieldMeta> = {};
        for (const p of EXPANDED_FIELDS) {
            const key = p.replace(/\./g, "_");
            meta[p] = {
                label: t(`PresetField.${key}`, {defaultValue: ""}),
                tip: t(`PresetField.${key}_tip`, {defaultValue: ""}),
            };
        }
        return meta;
    }, [t]);

    const set = (path: string[], next: any) => setData(setAtPath(data, path, next));

    const properties: any[] = Array.isArray(data?.maidData?.propData?.properties)
        ? data.maidData.propData.properties : [];
    const partNames: string[] = Array.isArray(data?.maidData?.colorData?.partNames)
        ? data.maidData.colorData.partNames : [];

    const enabledTag = (on: boolean) => (
        <Tag color={on ? "green" : undefined} style={{marginInlineEnd: 0}}>
            {on ? t('PresetEditor.enabled_on') : t('PresetEditor.enabled_off')}
        </Tag>
    );

    /**
     * 主表列：都是只读展示，编辑在展开行里做
     *
     * value 是「排序/筛选用的原始值」——单元格里放的是 Tag、图标这类节点时，
     * 直接比 render 结果没有意义，所以单独给取值器。
     * sortable / filterable 只在有 value 时才生效。
     */
    const propertyColumns: RecordColumn[] = [
        {
            key: "key",
            title: t('PresetEditor.col_key'),
            titleTip: t('PresetEditor.col_key_tip'),
            width: 210,
            render: (r) => cell(r?.key),
            value: (r) => r?.key,
            sortable: true,
            filterable: true,
            // 主键列不允许隐藏，否则表里认不出是哪条记录
            alwaysVisible: true,
        },
        {
            key: "name",
            title: t('PresetEditor.col_name'),
            titleTip: t('PresetEditor.col_name_tip'),
            width: 210,
            render: (r) => cell(r?.property?.name),
            value: (r) => r?.property?.name,
            sortable: true,
            filterable: true,
        },
        {
            key: "value",
            title: t('PresetEditor.col_value'),
            titleTip: t('PresetEditor.col_value_tip'),
            width: 90,
            render: (r) => cell(r?.property?.value),
            value: (r) => r?.property?.value,
            // 数值列排序 + 按值筛选（当前值往往只有几档，筛选很实用）
            sortable: true,
            filterable: true,
        },
        {
            key: "defaultValue",
            title: t('PresetEditor.col_default_value'),
            titleTip: t('PresetEditor.col_default_value_tip'),
            width: 90,
            render: (r) => cell(r?.property?.defaultValue),
            value: (r) => r?.property?.defaultValue,
            sortable: true,
            // 默认收起：平时排查用不到，展开行里也能看到
            defaultHidden: true,
        },
        {
            key: "min",
            title: t('PresetEditor.col_min'),
            titleTip: t('PresetEditor.col_min_tip'),
            width: 90,
            render: (r) => cell(r?.property?.min),
            value: (r) => r?.property?.min,
            sortable: true,
        },
        {
            key: "max",
            title: t('PresetEditor.col_max'),
            titleTip: t('PresetEditor.col_max_tip'),
            width: 110,
            render: (r) => cell(r?.property?.max),
            value: (r) => r?.property?.max,
            sortable: true,
        },
        {
            key: "enabled",
            title: t('PresetEditor.col_enabled'),
            titleTip: t('PresetEditor.col_enabled_tip'),
            width: 80,
            render: (r) => enabledTag(!!r?.property?.enabled),
            value: (r) => !!r?.property?.enabled,
            sortable: true,
            filterable: true,
        },
        {
            key: "type",
            title: t('PresetEditor.col_type'),
            titleTip: t('PresetEditor.col_type_tip'),
            width: 110,
            render: (r) => cell(r?.property?.base?.type),
            value: (r) => r?.property?.base?.type,
            sortable: true,
            filterable: true,
        },
        {
            key: "subType",
            title: t('PresetEditor.col_sub_type'),
            titleTip: t('PresetEditor.col_sub_type_tip'),
            width: 110,
            render: (r) => cell(r?.property?.base?.subType),
            value: (r) => r?.property?.base?.subType,
            sortable: true,
            filterable: true,
        },
        {
            key: "fileName",
            title: t('Common.file_name'),
            titleTip: t('PresetEditor.col_file_name_tip'),
            width: 200,
            render: (r) => cell(r?.property?.base?.fileName),
            value: (r) => r?.property?.base?.fileName,
            sortable: true,
            filterable: true,
            // 默认收起：文件名又长又少用，占 200px
            defaultHidden: true,
        },
        {
            key: "nested",
            title: t('PresetEditor.col_nested'),
            titleTip: t('PresetEditor.col_nested_tip'),
            width: 90,
            render: (r) => {
                const material = r?.property?.materialProperties?.length ?? 0;
                const sub = r?.property?.base?.subProperties?.length ?? 0;
                return material || sub
                    ? <Space size={4}>
                        {material
                            ? <Tag color="blue" style={{marginInlineEnd: 0}}>
                                {t('PresetEditor.nested_material_count', {count: material})}
                            </Tag>
                            : null}
                        {sub
                            ? <Tag color="purple" style={{marginInlineEnd: 0}}>
                                {t('PresetEditor.nested_sub_count', {count: sub})}
                            </Tag>
                            : null}
                    </Space>
                    : "";
            },
            // 「有没有嵌套」比个数更有用，直接按布尔值筛
            value: (r) => ((r?.property?.materialProperties?.length ?? 0) + (r?.property?.base?.subProperties?.length ?? 0)) > 0,
            sortable: true,
            filterable: true,
            filterLabel: (v) => (v ? t('PresetEditor.nested_yes') : t('PresetEditor.nested_no')),
        },
    ];

    /** 材质属性（slot）列 */
    const materialColumns: RecordColumn[] = [
        {
            key: "slotId",
            title: t('PresetEditor.col_slot_id'),
            titleTip: t('PresetEditor.col_slot_id_tip'),
            width: 160,
            render: (r) => cell(r?.slotId),
            value: (r) => r?.slotId,
            sortable: true,
            filterable: true,
        },
        {
            key: "slotValue",
            title: t('PresetEditor.col_slot_value'),
            titleTip: t('PresetEditor.col_slot_value_tip'),
            width: 100,
            render: (r) => cell(r?.slotValue),
            value: (r) => r?.slotValue,
            sortable: true,
        },
        {
            key: "count",
            title: t('PresetEditor.col_material_count'),
            titleTip: t('PresetEditor.col_material_count_tip'),
            width: 90,
            render: (r) => `${r?.properties?.length ?? 0}`,
            value: (r) => r?.properties?.length ?? 0,
            sortable: true,
        },
    ];

    /** 材质属性里的具体项 */
    const materialEntryColumns: RecordColumn[] = [
        {
            key: "key",
            title: t('PresetEditor.col_key'),
            titleTip: t('PresetEditor.col_key_tip'),
            width: 200,
            render: (r) => cell(r?.key),
            value: (r) => r?.key,
            sortable: true,
            filterable: true,
        },
        {
            key: "propertyName",
            title: t('PresetEditor.col_property_name'),
            titleTip: t('PresetEditor.col_property_name_tip'),
            width: 220,
            render: (r) => cell(r?.property?.propertyName),
            value: (r) => r?.property?.propertyName,
            sortable: true,
            filterable: true,
        },
        {
            key: "typeName",
            title: t('PresetEditor.col_type_name'),
            titleTip: t('PresetEditor.col_type_name_tip'),
            width: 280,
            render: (r) => cell(r?.property?.typeName),
            value: (r) => r?.property?.typeName,
            sortable: true,
        },
        {
            key: "materialNumber",
            title: t('PresetEditor.col_material_number'),
            titleTip: t('PresetEditor.col_material_number_tip'),
            width: 100,
            render: (r) => cell(r?.property?.materialNumber),
            value: (r) => r?.property?.materialNumber,
            sortable: true,
        },
        {
            key: "value",
            title: t('PresetEditor.col_value'),
            titleTip: t('PresetEditor.col_value_tip'),
            width: 100,
            render: (r) => cell(r?.property?.value),
            value: (r) => r?.property?.value,
            sortable: true,
        },
    ];

    /** 子属性列 */
    const subPropertyColumns: RecordColumn[] = [
        {
            key: "number",
            title: t('PresetEditor.col_index'),
            titleTip: t('PresetEditor.col_index_tip'),
            width: 80,
            render: (r) => cell(r?.number),
            value: (r) => r?.number,
            sortable: true,
        },
        {
            key: "type",
            title: t('PresetEditor.col_type'),
            titleTip: t('PresetEditor.col_type_tip'),
            width: 110,
            render: (r) => cell(r?.base?.type),
            value: (r) => r?.base?.type,
            sortable: true,
            filterable: true,
        },
        {
            key: "subType",
            title: t('PresetEditor.col_sub_type'),
            titleTip: t('PresetEditor.col_sub_type_tip'),
            width: 110,
            render: (r) => cell(r?.base?.subType),
            value: (r) => r?.base?.subType,
            sortable: true,
            filterable: true,
        },
        {
            key: "fileName",
            title: t('Common.file_name'),
            titleTip: t('PresetEditor.col_file_name_tip'),
            width: 200,
            render: (r) => cell(r?.base?.fileName),
            value: (r) => r?.base?.fileName,
            sortable: true,
        },
        {
            key: "enabled",
            title: t('PresetEditor.col_enabled'),
            titleTip: t('PresetEditor.col_enabled_tip'),
            width: 80,
            render: (r) => enabledTag(!!r?.base?.enabled),
            value: (r) => !!r?.base?.enabled,
            sortable: true,
            filterable: true,
        },
        {
            key: "nested",
            title: t('PresetEditor.col_sub_count'),
            titleTip: t('PresetEditor.col_sub_count_tip'),
            width: 90,
            render: (r) => (r?.base?.subProperties?.length ? `${r.base.subProperties.length}` : ""),
            value: (r) => r?.base?.subProperties?.length ?? 0,
            sortable: true,
        },
    ];

    /** 展开行：两条子表格 + 其余字段的表单 */
    const renderPropertyExpanded = (record: any, update: (next: any) => void) => {
        const property = record?.property ?? {};
        const materialProperties: any[] = Array.isArray(property.materialProperties) ? property.materialProperties : [];
        const subProperties: any[] = Array.isArray(property.base?.subProperties) ? property.base.subProperties : [];

        const setProperty = (patch: any) => update({...record, property: patch});

        return (
            <div style={{display: "flex", flexDirection: "column", gap: 14, textAlign: "left"}}>
                {materialProperties.length > 0 && (
                    <PresetRecordTable
                        title={t('PresetEditor.material_properties_title')}
                        items={materialProperties}
                        columns={materialColumns}
                        addLabel={t('PresetEditor.add_material_property')}
                        newItem={() => cloneRecord(materialProperties[materialProperties.length - 1])}
                        onChange={(next) => setProperty({...property, materialProperties: next})}
                        renderExpanded={(slot, updateSlot) => {
                            const entries: any[] = Array.isArray(slot?.properties) ? slot.properties : [];
                            return (
                                <PresetRecordTable
                                    title={t('PresetEditor.material_entries_title')}
                                    items={entries}
                                    columns={materialEntryColumns}
                                    addLabel={t('PresetEditor.add_material_entry')}
                                    newItem={() => cloneRecord(entries[entries.length - 1])}
                                    onChange={(next) => updateSlot({...slot, properties: next})}
                                />
                            );
                        }}
                    />
                )}
                {subProperties.length > 0 && (
                    <PresetRecordTable
                        title={t('PresetEditor.sub_properties_title')}
                        items={subProperties}
                        columns={subPropertyColumns}
                        addLabel={t('PresetEditor.add_sub_property')}
                        newItem={() => cloneRecord(subProperties[subProperties.length - 1])}
                        onChange={(next) => setProperty({
                            ...property,
                            base: {...(property.base ?? {}), subProperties: next},
                        })}
                    />
                )}
                <div>
                    <Typography.Text strong>{t('PresetEditor.record_fields_title')}</Typography.Text>
                    <div style={{marginTop: 6}}>
                        <JsonObjectForm
                            value={omitTableArrays(property)}
                            onChange={(next: any) => setProperty(mergeTableArrays(next, property))}
                            defaultExpandDepth={1}
                            fieldMeta={expandedFieldMeta}
                        />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div style={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            // 表格外层是折叠栏（见 PresetRecordTable），header 自带留白，
            // 所以间距给 8 就够，16 会显得松散
            gap: 8,
        }}>
            {properties.length > 0 ? (
                <PresetRecordTable
                    title={t('PresetEditor.properties_title')}
                    items={properties}
                    columns={propertyColumns}
                    addLabel={t('PresetEditor.add_property')}
                    newItem={() => cloneRecord(properties[properties.length - 1])}
                    onChange={(next) => set(['maidData', 'propData', 'properties'], next)}
                    renderExpanded={renderPropertyExpanded}
                    // 实测 291 行：非虚拟表格的行节点有 1500 个左右，展开一行会整表重渲染，明显卡顿。
                    // 切 virtual 后只渲染视口内的行，行节点降到 ~86。
                    // 之前担心「虚拟滚动 + 展开行高度算不准」——读 @rc-component/table 源码后确认不成立：
                    // VirtualTable/BodyLine.js 把行节点和展开行包在同一个 <div ref> 里，
                    // 由虚拟列表的 useHeights 按 offsetHeight 实测（支持动态高度）。
                    // 代价是 scroll.x / scroll.y 必须传数值，组件内部已按列宽求和算好。
                    virtual
                    maxHeight={560}
                />
            ) : (
                <Alert type="warning" showIcon title={t('PresetEditor.no_properties')}/>
            )}

            {partNames.length > 0 && (
                <PresetRecordTable
                    title={t('PresetEditor.part_names_title')}
                    items={partNames.map((name) => ({name}))}
                    columns={[{
                        key: "name",
                        title: t('PresetEditor.col_name'),
                        titleTip: t('PresetEditor.col_part_name_tip'),
                        width: 240,
                        // 有了 value 才能被搜索框检索到（也可排序）
                        value: (record: any) => record.name,
                        sortable: true,
                        render: (record, index, update) => (
                            <Input
                                size="small"
                                value={record.name}
                                onChange={(e) => update({name: e.target.value})}
                            />
                        ),
                    }]}
                    addLabel={t('PresetEditor.add_part_name')}
                    newItem={() => ({name: ""})}
                    onChange={(next) => set(
                        ['maidData', 'colorData', 'partNames'],
                        next.map((item) => item.name),
                    )}
                />
            )}
        </div>
    );
};

export default PresetTableView;
