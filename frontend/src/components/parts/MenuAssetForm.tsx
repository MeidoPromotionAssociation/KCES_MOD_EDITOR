import React from "react";
import {AutoComplete, Collapse, CollapseProps, Flex, Space, Switch, Tooltip} from "antd";
import {useTranslation} from "react-i18next";
import {EnumAutoComplete, FlagsCascader, NullableStringInput, NumberField, Row} from "./formControls";
import BigIntInput from "../common/BigIntInput";
import MenuAdvancedForm from "./MenuAdvancedForm";
import MenuCommandsEditor from "./MenuCommandsEditor";
import {
    MenuAttributeBits,
    MenuDefineNameBits,
    MenuHaraYureLimitTypeNames,
    MenuTargetBodyTypeNames,
    MPNOptionsWithId
} from "../../utils/kcesEnums.ts";
import {QuestionCircleOutlined} from "@ant-design/icons";

/** DEFINE 标签的 i18n key（选项 value 保持枚举名，展示用对应语言翻译 + 位值） */
export const DEFINE_LABEL_KEYS: Record<string, string> = {
    COLOR_MAMA: "MenuAssetsEditor.define_color_mama",
    COLOR_MUGEN: "MenuAssetsEditor.define_color_mugen",
    COLOR_BUBUN: "MenuAssetsEditor.define_color_bubun",
    COLOR_GRADA: "MenuAssetsEditor.define_color_grada",
};

/** Menu.Attribute 标签的 i18n key */
const ATTRIBUTE_LABEL_KEYS: Record<string, string> = {
    None: "MenuAssetsEditor.attribute_none",
    WomanReccomend: "MenuAssetsEditor.attribute_woman_reccomend",
    ManReccomend: "MenuAssetsEditor.attribute_man_reccomend",
    ManSuits: "MenuAssetsEditor.attribute_man_suits",
    NoExpressionFace: "MenuAssetsEditor.attribute_no_expression_face",
    NoMoveTatooHokuro: "MenuAssetsEditor.attribute_no_move_tatoo_hokuro",
};

/** Menu.TargetBodyType 标签的 i18n key */
const BODY_TYPE_LABEL_KEYS: Record<string, string> = {
    None: "MenuAssetsEditor.body_type_none",
    Woman: "MenuAssetsEditor.body_type_woman",
    Man: "MenuAssetsEditor.body_type_man",
};

/** Menu.HaraYureLimitType 标签的 i18n key */
const HARA_LABEL_KEYS: Record<string, string> = {
    None: "MenuAssetsEditor.hara_none",
    YureAvailable: "MenuAssetsEditor.hara_yure_available",
    YureDisable: "MenuAssetsEditor.hara_yure_disable",
};

/**
 * MenuAssetForm 单个 Menu 资产的编辑表单
 * 基本信息 / 标识与标志位 / 命令编辑（复刻 COM3D2 MenuEditor 的树形缩进等文本模式）/ 高级字段
 */
const MenuAssetForm: React.FC<{
    asset: any;
    onChange: (next: any) => void;
}> = ({asset, onChange}) => {
    const {t} = useTranslation();

    // 命令面板展开时整个 Collapse 才撑满剩余高度；折叠时保持内容高度，
    // 否则没有任何子元素会伸展，Collapse 会留下一大片和标题栏同色的空白
    const [activeKeys, setActiveKeys] = React.useState<string[]>(["basic", "commands"]);
    const commandsOpen = activeKeys.includes("commands");

    const set = (field: string, value: any) => onChange({...asset, [field]: value});

    const commands: any[] = Array.isArray(asset.commandList) ? asset.commandList : [];

    /** 枚举名 → 对应语言翻译，无翻译时返回 null（选项格式由控件拼装） */
    const labelOf = (keys: Record<string, string>) => (name: string): string | null =>
        t(keys[name] ?? "", {defaultValue: ""}) || null;

    const subItems: CollapseProps['items'] = [
        {
            key: '1',
            label: t('MenuAssetsEditor.advanced_fields'),
            children: <div>
                <Row label={t('Common.version')}>
                    <Flex gap="small">
                        <NumberField value={asset.version} precision={0} onChange={(v) => set("version", v)}/>
                        <Tooltip title={t('Common.version_tooltip')}>
                            <QuestionCircleOutlined/>
                        </Tooltip>
                    </Flex>
                </Row>
                <Row label={t('MenuAssetsEditor.guid')}>
                    <Flex gap="small">
                        <BigIntInput value={asset.guid} onChange={(v) => set("guid", v)}/>
                        <Tooltip title={t('MenuAssetsEditor.guid_tooltip')}>
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
                <Row label={t('MenuAssetsEditor.parentId')}>
                    <Flex gap="small">
                        <BigIntInput value={asset.parentId} onChange={(v) => set("parentId", v)}/>
                        <Tooltip title={t('MenuAssetsEditor.parentId_tooltip')}>
                            <QuestionCircleOutlined/>
                        </Tooltip>
                    </Flex>
                </Row>
                <Row label={t('MenuAssetsEditor.defineTagNames')}>
                    <Flex gap="small">
                        <FlagsCascader
                            value={asset.defineTagNames}
                            flags={MenuDefineNameBits}
                            labelOf={labelOf(DEFINE_LABEL_KEYS)}
                            onChange={(v) => set("defineTagNames", v)}
                        />
                        <Tooltip title={t('MenuAssetsEditor.defineTagNames_tooltip')}>
                            <QuestionCircleOutlined/>
                        </Tooltip>
                    </Flex>
                </Row>
                <Row label={t('MenuAssetsEditor.attribute')}>
                    <Flex gap="small">
                        <FlagsCascader value={asset.attribute} flags={MenuAttributeBits}
                                       labelOf={labelOf(ATTRIBUTE_LABEL_KEYS)}
                                       onChange={(v) => set("attribute", v)}/>
                        <Tooltip title={t('MenuAssetsEditor.attribute_tooltip')}>
                            <QuestionCircleOutlined/>
                        </Tooltip>
                    </Flex>
                </Row>
                <Row label={t('MenuAssetsEditor.targetBodyType')}>
                    <Flex gap="small">
                        <EnumAutoComplete value={asset.targetBodyType} names={MenuTargetBodyTypeNames}
                                          labelOf={labelOf(BODY_TYPE_LABEL_KEYS)}
                                          onChange={(v) => set("targetBodyType", v)}/>
                        <Tooltip title={t('MenuAssetsEditor.targetBodyType_tooltip')}>
                            <QuestionCircleOutlined/>
                        </Tooltip>
                    </Flex>
                </Row>
                <Row label={t('MenuAssetsEditor.isHarayureAvailable')}>
                    <Flex gap="small">
                        <EnumAutoComplete value={asset.isHarayureAvailable} names={MenuHaraYureLimitTypeNames}
                                          labelOf={labelOf(HARA_LABEL_KEYS)}
                                          onChange={(v) => set("isHarayureAvailable", v)}/>
                        <Tooltip title={t('MenuAssetsEditor.isHarayureAvailable_tooltip')}>
                            <QuestionCircleOutlined/>
                        </Tooltip>
                    </Flex>
                </Row>
                <Row label={t('MenuAssetsEditor.skirt_phys')}>
                    <Flex gap="small">
                        <NumberField value={asset.skirt_phys} precision={0} onChange={(v) => set("skirt_phys", v)}/>
                        <Tooltip title={t('MenuAssetsEditor.skirt_phys_tooltip')}>
                            <QuestionCircleOutlined/>
                        </Tooltip>
                    </Flex>
                </Row>
                <Row label={t('MenuAssetsEditor.srcFileHashCRC32')}>
                    <Flex gap="small">
                        <BigIntInput value={asset.srcFileHashCRC32} onChange={(v) => set("srcFileHashCRC32", v)}/>
                        <Tooltip title={t('MenuAssetsEditor.srcFileHashCRC32_tooltip')}>
                            <QuestionCircleOutlined/>
                        </Tooltip>
                    </Flex>
                </Row>
                <Row label={t('MenuAssetsEditor.defineFirst')}>
                    <Flex gap="small">
                        <BigIntInput value={asset.defineFirst} onChange={(v) => set("defineFirst", v)}/>
                        <Tooltip title={t('MenuAssetsEditor.defineFirst_tooltip')}>
                            <QuestionCircleOutlined/>
                        </Tooltip>
                    </Flex>
                </Row>
                <Row label={t('MenuAssetsEditor.toeLockSlotId')}>
                    <Flex gap="small">
                        <NullableStringInput value={asset.toeLockSlotId} onChange={(v) => set("toeLockSlotId", v)}/>
                        <Tooltip title={t('MenuAssetsEditor.toeLockSlotId_tooltip')}>
                            <QuestionCircleOutlined/>
                        </Tooltip>
                    </Flex>
                </Row>
                <Row label={t('MenuAssetsEditor.exportModelFormTextureName')}>
                    <Flex gap="small">
                        <NullableStringInput value={asset.exportModelFormTextureName}
                                             onChange={(v) => set("exportModelFormTextureName", v)}/>
                        <Tooltip title={t('MenuAssetsEditor.exportModelFormTextureName_tooltip')}>
                            <QuestionCircleOutlined/>
                        </Tooltip>
                    </Flex>
                </Row>
                <MenuAdvancedForm asset={asset} onChange={onChange}/>
            </div>,
        }
    ];

    const items: CollapseProps['items'] = [
        {
            key: "basic",
            label: t('MenuAssetsEditor.basic_info'),
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
                    <Row label={t('MenuAssetsEditor.item_name')}>
                        <Flex gap="small">
                            <NullableStringInput value={asset.itemName} onChange={(v) => set("itemName", v)}/>
                            <Tooltip title={t('MenuAssetsEditor.item_name_tooltip')}>
                                <QuestionCircleOutlined/>
                            </Tooltip>
                        </Flex>
                    </Row>
                    <Row label={t('MenuAssetsEditor.icon_file_name')}>
                        <Flex gap="small">
                            <NullableStringInput value={asset.iconFileName} onChange={(v) => set("iconFileName", v)}/>
                            <Tooltip title={t('MenuAssetsEditor.icon_file_name_tooltip')}>
                                <QuestionCircleOutlined/>
                            </Tooltip>
                        </Flex>
                    </Row>
                    <Row label={t('MenuAssetsEditor.info_text')}>
                        <Flex gap="small">
                            <NullableStringInput textarea value={asset.infoText} onChange={(v) => set("infoText", v)}/>
                            <Tooltip title={t('MenuAssetsEditor.info_text_tooltip')}>
                                <QuestionCircleOutlined/>
                            </Tooltip>
                        </Flex>
                    </Row>
                    <Row label={t('MenuAssetsEditor.category_text')}>
                        <Flex gap="small">
                            <AutoComplete
                                style={{width: 250}}
                                value={asset.categoryText}
                                onChange={(v) => set("categoryText", v)}
                                options={MPNOptionsWithId}
                                allowClear
                            />
                            <Tooltip title={t('MenuAssetsEditor.category_text_tooltip')}>
                                <QuestionCircleOutlined/>
                            </Tooltip>
                        </Flex>
                    </Row>
                    <Row label={t('MenuAssetsEditor.color_set_text')}>
                        <Flex gap="small">
                            <AutoComplete
                                style={{width: 250}}
                                value={asset.colorSetText}
                                onChange={(v) => set("colorSetText", v)}
                                options={MPNOptionsWithId}
                                allowClear
                            />
                            <Tooltip title={t('MenuAssetsEditor.color_set_text_tooltip')}>
                                <QuestionCircleOutlined/>
                            </Tooltip>
                        </Flex>
                    </Row>
                    <Row label={t('MenuAssetsEditor.priority')}>
                        <Flex gap="small">
                            <NumberField value={asset.priority} precision={0} onChange={(v) => set("priority", v)}/>
                            <Tooltip title={t('MenuAssetsEditor.priority_tooltip')}>
                                <QuestionCircleOutlined/>
                            </Tooltip>
                        </Flex>
                    </Row>
                    <Row label={t('MenuAssetsEditor.switches')}>
                        <Space wrap>
                            <Space key={"isMan"} size={4}>
                                <Tooltip title={t('MenuAssetsEditor.is_man_tooltip')}>
                                    <span>{t('MenuAssetsEditor.is_man')}</span>
                                    <Switch size="small" checked={!!asset["isMan"]}
                                            onChange={(checked) => set("isMan", checked)}/>
                                </Tooltip>
                            </Space>

                            <Space key={"isDiff"} size={4}>
                                <Tooltip title={t('MenuAssetsEditor.is_diff_tooltip')}>
                                    <span>{t('MenuAssetsEditor.is_diff')}</span>
                                    <Switch size="small" checked={!!asset["isDiff"]}
                                            onChange={(checked) => set("isDiff", checked)}/>
                                </Tooltip>
                            </Space>

                            <Space key={"isDelete"} size={4}>
                                <Tooltip title={t('MenuAssetsEditor.is_delete_tooltip')}>
                                    <span>{t('MenuAssetsEditor.is_delete')}</span>
                                    <Switch size="small" checked={!!asset["isDelete"]}
                                            onChange={(checked) => set("isDelete", checked)}/>
                                </Tooltip>
                            </Space>

                            <Space key={"isRecommendMan"} size={4}>
                                <Tooltip title={t('MenuAssetsEditor.is_recommend_man_tooltip')}>
                                    <span>{t('MenuAssetsEditor.is_recommend_man')}</span>
                                    <Switch size="small" checked={!!asset["isRecommendMan"]}
                                            onChange={(checked) => set("isRecommendMan", checked)}/>
                                </Tooltip>
                            </Space>

                            <Space key={"hideInEdit"} size={4}>
                                <Tooltip title={t('MenuAssetsEditor.hide_in_edit_tooltip')}>
                                    <span>{t('MenuAssetsEditor.hide_in_edit')}</span>
                                    <Switch size="small" checked={!!asset["hideInEdit"]}
                                            onChange={(checked) => set("hideInEdit", checked)}/>
                                </Tooltip>
                            </Space>
                        </Space>
                    </Row>
                    <Collapse size="small" defaultActiveKey={[]} items={subItems}/>
                </div>
            ),
        },
        {
            key: "commands",
            label: `${t('MenuAssetsEditor.command_list')} (${commands.length})`,
            // 命令编辑器要吃掉折叠面板的剩余高度，这一条链上的每层都得能伸缩，
            // 中间的 .ant-collapse-panel 由 CSSMotion 控高、没有语义化入口，只能靠 CSS 类接上
            className: "menu-commands-collapse-item",
            styles: {body: {display: "flex", flexDirection: "column", flex: 1, minHeight: 0}},
            children: (
                <MenuCommandsEditor
                    commands={commands}
                    onChange={(next) => set("commandList", next)}
                />
            ),
        },
    ];

    return (
        <Collapse
            size="small"
            activeKey={activeKeys}
            onChange={(keys) => setActiveKeys(keys as string[])}
            items={items}
            className={commandsOpen ? "menu-asset-collapse-fill" : undefined}
        />
    );
};

export default MenuAssetForm;
