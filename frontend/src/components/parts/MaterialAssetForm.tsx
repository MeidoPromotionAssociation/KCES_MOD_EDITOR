import React, {useCallback, useRef} from "react";
import {Alert, Button, Collapse, Flex, Space, Tooltip, Typography} from "antd";
import {PlusOutlined, QuestionCircleOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import {NullableStringInput, NumberField, Row} from "./formControls";
import BigIntInput from "../common/BigIntInput";
import MaterialPropertyItem, {fieldOf, MaterialFormLayout, MaterialPropKind, PropKinds} from "./MaterialPropertyItem";
import MaterialPropertyBrowser from "./MaterialPropertyBrowser";

/**
 * MaterialAssetForm 单个 Material 资产的编辑表单
 * 复刻 COM3D2 MateEditor 的表单布局（紧凑行内 / 标签竖排 / 分栏可搜索），
 * 属性名使用 Material.PropertType 枚举，颜色属性带颜色选择器
 *
 * 版式由父组件（MaterialAssetsEditor）决定：选择器渲染在资产工具栏（克隆/删除那一栏），不在表单里，
 * 表单只按传入的 layout 排版。
 *
 * keywordProps 与 renderQueue 是 KCES2 追加的槽 8/9，KCES（8 槽）布局的材质放不下：
 * 库写入宽度之外的槽有非零值时直接报错，所以 8 槽时这两项置灰，只能先升级布局。
 */

/** KCES2 追加的 10 槽布局；缺省（indexedArrayWidth 为空或 8）按库的规则就是 KCES 8 槽 */
const Kces2SlotWidth = 10;
const KcesLegacySlotWidth = 8;

const MaterialAssetForm: React.FC<{
    asset: any;
    onChange: (next: any) => void;
    /** 表单版式，由父组件（MaterialAssetsEditor）的版式选择器控制 */
    layout: MaterialFormLayout;
}> = ({asset, onChange, layout}) => {
    const {t} = useTranslation();

    const set = (field: string, value: any) => onChange({...asset, [field]: value});

    // 属性项交给 memo 过的 MaterialPropertyItem，回调必须是稳定引用，否则每次回填都会让
    // 所有属性项一起重渲染（属性一多就卡）。所以定位改成「类别 + 下标」写回单项，
    // 文档与回调从 ref 里取最新的，回调本身只建一次；写回时只有被改的那一项换新对象。
    const latest = useRef({asset, onChange});
    latest.current = {asset, onChange};

    const changeItem = useCallback((kind: MaterialPropKind, index: number, next: any) => {
        const field = fieldOf(kind);
        if (!field) return;
        const items = [...(latest.current.asset[field] ?? [])];
        items[index] = next;
        latest.current.onChange({...latest.current.asset, [field]: items});
    }, []);

    const removeItem = useCallback((kind: MaterialPropKind, index: number) => {
        const field = fieldOf(kind);
        if (!field) return;
        const items = [...(latest.current.asset[field] ?? [])];
        items.splice(index, 1);
        latest.current.onChange({...latest.current.asset, [field]: items});
    }, []);

    // 8 槽（KCES1）布局放不下槽 8/9，这两项必须置灰；10 槽（KCES2）才可编辑
    const storedWidth = asset.indexedArrayWidth || KcesLegacySlotWidth;
    const isLegacy = storedWidth < Kces2SlotWidth;
    const keywords: any[] = asset.keywordProps ?? [];
    const canDowngrade = !isLegacy && keywords.length === 0 && !asset.renderQueue;
    const upgradeLayout = () => set("indexedArrayWidth", Kces2SlotWidth);

    const propSection = (kind: MaterialPropKind, field: string, newItem: () => any) => {
        const items: any[] = asset[field] ?? [];
        const locked = isLegacy && kind === "kw";
        let addButton: boolean;
        return {
            key: field,
            label: `${t(`MaterialAssetsEditor.${kind}`)} (${items.length})`,
            children: (
                <div>
                    {locked ? (
                        <>
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
                            {addButton = false}
                        </>
                    ) : (
                        addButton = true
                    )}
                    {items.map((item, index) => (
                        <MaterialPropertyItem
                            key={index}
                            kind={kind}
                            index={index}
                            item={item}
                            layout={layout}
                            onChange={changeItem}
                            onRemove={removeItem}
                        />
                    ))}
                    {addButton ? (
                        <Button size="small" icon={<PlusOutlined/>} style={{marginTop: 8}}
                                onClick={() => set(field, [...items, newItem()])}>
                            {t('MaterialAssetsEditor.add_prop')}
                        </Button>
                    ) : null}
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
                    <Row label={t('Common.file_name')}>
                        <Flex gap="small">
                            <NullableStringInput value={asset.fileName} onChange={(v) => set("fileName", v)}/>
                            <Tooltip title={t('Common.file_name_tooltip')}>
                                <QuestionCircleOutlined/>
                            </Tooltip>
                        </Flex>
                    </Row>
                    <Row label={t('MaterialAssetsEditor.shader_name')}>
                        <Flex gap="small">
                            <NullableStringInput value={asset.shaderName} onChange={(v) => set("shaderName", v)}/>
                            <Tooltip title={t('MaterialAssetsEditor.shader_name_tooltip')}>
                                <QuestionCircleOutlined/>
                            </Tooltip>
                        </Flex>
                    </Row>
                    <Row label={t('Common.id')}>
                        <Flex gap="small">
                            <BigIntInput value={asset.id} onChange={(v) => set("id", v)}/>
                            <Tooltip title={t('Common.id_tooltip')}>
                                <QuestionCircleOutlined/>
                            </Tooltip>
                        </Flex>
                    </Row>
                    <Row label={t('Common.version')}>
                        <Flex gap="small">
                            <NumberField value={asset.version} precision={0} onChange={(v) => set("version", v)}/>
                            <Tooltip title={t('Common.version_tooltip')}>
                                <QuestionCircleOutlined/>
                            </Tooltip>
                        </Flex>
                    </Row>
                    <Row label={t('MaterialAssetsEditor.render_queue')}>
                        <Flex gap="small">
                            <NumberField width={250} precision={0} disabled={isLegacy}
                                         value={asset.renderQueue}
                                         onChange={(v) => set("renderQueue", v)}/>
                            <Tooltip title={t('MaterialAssetsEditor.render_queue_tooltip')}>
                                <QuestionCircleOutlined/>
                            </Tooltip>
                        </Flex>
                    </Row>
                    <Row label={t('MaterialAssetsEditor.indexedArrayWidth')}>
                        <Space size={8}>
                            <Typography.Text>
                                {isLegacy
                                    ? t('MaterialAssetsEditor.layout_legacy')
                                    : t('MaterialAssetsEditor.layout_kces2')}
                            </Typography.Text>
                            <Tooltip title={t('MaterialAssetsEditor.indexedArrayWidth_tooltip')}>
                                <QuestionCircleOutlined/>
                            </Tooltip>
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
