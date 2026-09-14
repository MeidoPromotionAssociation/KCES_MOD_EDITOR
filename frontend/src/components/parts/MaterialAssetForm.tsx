import React, {useState} from "react";
import {Alert, Button, Collapse, Radio, Space, Typography} from "antd";
import {PlusOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import {NullableStringInput, NumberField, Row} from "./formControls";
import BigIntInput from "../common/BigIntInput";
import MaterialPropertyItem, {MaterialFormLayout, MaterialPropKind, PropKinds} from "./MaterialPropertyItem";
import MaterialPropertyBrowser from "./MaterialPropertyBrowser";

/**
 * MaterialAssetForm 单个 Material 资产的编辑表单
 * 复刻 COM3D2 MateEditor 的表单布局（紧凑行内 / 标签竖排 / 分栏可搜索），
 * 属性名使用 Material.PropertType 枚举，颜色属性带颜色选择器
 *
 * keywordProps 与 renderQueue 是 KCES2 追加的槽 8/9，KCES（8 槽）布局的材质放不下：
 * 库写入宽度之外的槽有非零值时直接报错，所以 8 槽时这两项置灰，只能先升级布局。
 */

const MaterialFormLayoutKey = "MaterialAssetsFormLayout";

/** KCES2 追加的 10 槽布局；缺省（indexedArrayWidth 为空或 8）按库的规则就是 KCES 8 槽 */
const Kces2SlotWidth = 10;
const KcesLegacySlotWidth = 8;

const MaterialAssetForm: React.FC<{
    asset: any;
    onChange: (next: any) => void;
}> = ({asset, onChange}) => {
    const {t} = useTranslation();

    const [layout, setLayout] = useState<MaterialFormLayout>(
        () => (localStorage.getItem(MaterialFormLayoutKey) as MaterialFormLayout) || "compact"
    );

    const set = (field: string, value: any) => onChange({...asset, [field]: value});

    // 8 槽（KCES）布局放不下槽 8/9，这两项必须置灰；10 槽（KCES2）才可编辑
    const storedWidth = asset.indexedArrayWidth || KcesLegacySlotWidth;
    const isLegacy = storedWidth < Kces2SlotWidth;
    const keywords: any[] = asset.keywordProps ?? [];
    const canDowngrade = !isLegacy && keywords.length === 0 && !asset.renderQueue;
    const upgradeLayout = () => set("indexedArrayWidth", Kces2SlotWidth);

    const propSection = (kind: MaterialPropKind, field: string, newItem: () => any) => {
        const items: any[] = asset[field] ?? [];
        const locked = isLegacy && kind === "kw";
        return {
            key: field,
            label: `${t(`MaterialAssetsEditor.${kind}`)} (${items.length})`,
            children: (
                <div>
                    {locked ? (
                        <Alert
                            type="info"
                            showIcon
                            style={{marginBottom: 8}}
                            title={t('MaterialAssetsEditor.layout_legacy_tip')}
                            action={
                                <Button size="small" type="primary" onClick={upgradeLayout}>
                                    {t('MaterialAssetsEditor.layout_upgrade')}
                                </Button>
                            }
                        />
                    ) : (
                        <Button size="small" icon={<PlusOutlined/>} style={{marginBottom: 8}}
                                onClick={() => set(field, [...items, newItem()])}>
                            {t('MaterialAssetsEditor.add_prop')}
                        </Button>
                    )}
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
                    <Row label="renderQueue">
                        <Space size={8}>
                            <NumberField width={140} precision={0} disabled={isLegacy}
                                         value={asset.renderQueue}
                                         onChange={(v) => set("renderQueue", v)}/>
                            <Typography.Text type="secondary">
                                {t('MaterialAssetsEditor.render_queue_tip')}
                            </Typography.Text>
                        </Space>
                    </Row>
                    <Row label="indexedArrayWidth">
                        <Space size={8}>
                            <Typography.Text>
                                {isLegacy
                                    ? t('MaterialAssetsEditor.layout_legacy')
                                    : t('MaterialAssetsEditor.layout_kces2')}
                            </Typography.Text>
                            {isLegacy ? (
                                <Button size="small" onClick={upgradeLayout}>
                                    {t('MaterialAssetsEditor.layout_upgrade')}
                                </Button>
                            ) : (
                                <Button size="small" disabled={!canDowngrade}
                                        onClick={() => set("indexedArrayWidth", KcesLegacySlotWidth)}>
                                    {t('MaterialAssetsEditor.layout_downgrade')}
                                </Button>
                            )}
                        </Space>
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
                        {label: t('MaterialAssetsEditor.layout_sidebar'), value: 'sidebar'},
                    ]}
                />
            </Space>
            {layout === "sidebar" ? (
                <MaterialPropertyBrowser
                    asset={asset}
                    set={set}
                    isLegacy={isLegacy}
                    onUpgradeLayout={upgradeLayout}
                />
            ) : (
                <Collapse size="small" defaultActiveKey={["basic", "textureProps", "colorProps"]} items={items}/>
            )}
        </div>
    );
};

export default MaterialAssetForm;
