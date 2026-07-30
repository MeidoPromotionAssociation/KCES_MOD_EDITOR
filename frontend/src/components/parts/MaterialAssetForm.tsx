import React, {useState} from "react";
import {Button, Collapse, Radio, Space} from "antd";
import {PlusOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import {NullableStringInput, NumberField, Row} from "./formControls";
import BigIntInput from "../common/BigIntInput";
import MaterialPropertyItem, {MaterialFormLayout, MaterialPropKind} from "./MaterialPropertyItem";

/**
 * MaterialAssetForm 单个 Material 资产的编辑表单
 * 复刻 COM3D2 MateEditor 的两种表单布局（紧凑行内 / 标签竖排），
 * 属性名使用 Material.PropertType 枚举，颜色属性带颜色选择器
 */

const MaterialFormLayoutKey = "MaterialAssetsFormLayout";

// 各属性类别对应的数组字段与新建模板
const PropKinds: Array<{
    kind: MaterialPropKind;
    field: string;
    newItem: () => any;
}> = [
    {kind: "tex", field: "textureProps", newItem: () => ({type: 0, fileName: "", ox: 0, oy: 0, sx: 1, sy: 1})},
    {kind: "col", field: "colorProps", newItem: () => ({type: 100, r: 1, g: 1, b: 1, a: 1})},
    {kind: "vec", field: "vectorProps", newItem: () => ({type: 0, x: 0, y: 0, z: 0, w: 0})},
    {kind: "f", field: "floatProps", newItem: () => ({type: 200, v: 0})},
];

const MaterialAssetForm: React.FC<{
    asset: any;
    onChange: (next: any) => void;
}> = ({asset, onChange}) => {
    const {t} = useTranslation();

    const [layout, setLayout] = useState<MaterialFormLayout>(
        () => (localStorage.getItem(MaterialFormLayoutKey) as MaterialFormLayout) || "compact"
    );

    const set = (field: string, value: any) => onChange({...asset, [field]: value});

    const propSection = (kind: MaterialPropKind, field: string, newItem: () => any) => {
        const items: any[] = asset[field] ?? [];
        return {
            key: field,
            label: `${t(`MaterialAssetsEditor.${kind}`)} (${items.length})`,
            children: (
                <div>
                    <Button size="small" icon={<PlusOutlined/>} style={{marginBottom: 8}}
                            onClick={() => set(field, [...items, newItem()])}>
                        {t('MaterialAssetsEditor.add_prop')}
                    </Button>
                    {items.map((item, index) => (
                        <MaterialPropertyItem
                            key={index}
                            kind={kind}
                            item={item}
                            layout={layout}
                            onChange={(next) => {
                                const list = [...items];
                                list[index] = next;
                                set(field, list);
                            }}
                            onRemove={() => {
                                const list = [...items];
                                list.splice(index, 1);
                                set(field, list);
                            }}
                        />
                    ))}
                </div>
            ),
        };
    };

    const items = [
        {
            key: "basic",
            label: t('MaterialAssetsEditor.basic_info'),
            children: (
                <div>
                    <Row label="fileName">
                        <NullableStringInput value={asset.fileName} onChange={(v) => set("fileName", v)}/>
                    </Row>
                    <Row label="shaderName">
                        <NullableStringInput value={asset.shaderName} onChange={(v) => set("shaderName", v)}/>
                    </Row>
                    <Row label="id">
                        <BigIntInput value={asset.id} onChange={(v) => set("id", v)}/>
                    </Row>
                    <Row label="version">
                        <NumberField value={asset.version} precision={0} onChange={(v) => set("version", v)}/>
                    </Row>
                </div>
            ),
        },
        ...PropKinds.map(({kind, field, newItem}) => propSection(kind, field, newItem)),
    ];

    return (
        <div>
            <Space style={{marginBottom: 8}}>
                <Radio.Group
                    size="small"
                    optionType="button"
                    buttonStyle="solid"
                    value={layout}
                    onChange={(e) => {
                        setLayout(e.target.value);
                        localStorage.setItem(MaterialFormLayoutKey, e.target.value);
                    }}
                    options={[
                        {label: t('MaterialAssetsEditor.layout_compact'), value: 'compact'},
                        {label: t('MaterialAssetsEditor.layout_labeled'), value: 'labeled'},
                    ]}
                />
            </Space>
            <Collapse size="small" defaultActiveKey={["basic", "textureProps", "colorProps"]} items={items}/>
        </div>
    );
};

export default MaterialAssetForm;
