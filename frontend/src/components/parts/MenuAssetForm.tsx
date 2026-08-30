import React from "react";
import {Collapse, Space, Switch} from "antd";
import {useTranslation} from "react-i18next";
import {NullableStringInput, NumberField, Row} from "./formControls";
import BigIntInput from "../common/BigIntInput";
import MenuAdvancedForm from "./MenuAdvancedForm";
import MenuCommandsEditor from "./MenuCommandsEditor";

/**
 * MenuAssetForm 单个 Menu 资产的编辑表单
 * 基本信息 / 标识与标志位 / 命令编辑（复刻 COM3D2 MenuEditor 的树形缩进等文本模式）/ 高级字段
 */
const MenuAssetForm: React.FC<{
    asset: any;
    onChange: (next: any) => void;
}> = ({asset, onChange}) => {
    const {t} = useTranslation();

    const set = (field: string, value: any) => onChange({...asset, [field]: value});

    const commands: any[] = Array.isArray(asset.commandList) ? asset.commandList : [];

    const items = [
        {
            key: "basic",
            label: t('MenuAssetsEditor.basic_info'),
            children: (
                <div>
                    <Row label="fileName">
                        <NullableStringInput value={asset.fileName} onChange={(v) => set("fileName", v)}/>
                    </Row>
                    <Row label="itemName">
                        <NullableStringInput value={asset.itemName} onChange={(v) => set("itemName", v)}/>
                    </Row>
                    <Row label="iconFileName">
                        <NullableStringInput value={asset.iconFileName} onChange={(v) => set("iconFileName", v)}/>
                    </Row>
                    <Row label="infoText">
                        <NullableStringInput textarea value={asset.infoText} onChange={(v) => set("infoText", v)}/>
                    </Row>
                    <Row label="categoryText">
                        <NullableStringInput value={asset.categoryText} onChange={(v) => set("categoryText", v)}/>
                    </Row>
                    <Row label="colorSetText">
                        <NullableStringInput value={asset.colorSetText} onChange={(v) => set("colorSetText", v)}/>
                    </Row>
                    <Row label="priority">
                        <NumberField value={asset.priority} precision={0} onChange={(v) => set("priority", v)}/>
                    </Row>
                    <Row label="version">
                        <NumberField value={asset.version} precision={0} onChange={(v) => set("version", v)}/>
                    </Row>
                    <Row label={t('MenuAssetsEditor.switches')}>
                        <Space wrap>
                            {(["isMan", "isDiff", "isDelete", "isRecommendMan", "hideInEdit"] as const).map((field) => (
                                <Space key={field} size={4}>
                                    <span>{field}</span>
                                    <Switch size="small" checked={!!asset[field]}
                                            onChange={(checked) => set(field, checked)}/>
                                </Space>
                            ))}
                        </Space>
                    </Row>
                </div>
            ),
        },
        {
            key: "ids",
            label: t('MenuAssetsEditor.ids_and_flags'),
            children: (
                <div>
                    <Row label="guid">
                        <BigIntInput value={asset.guid} onChange={(v) => set("guid", v)}/>
                    </Row>
                    <Row label="id">
                        <BigIntInput value={asset.id} onChange={(v) => set("id", v)}/>
                    </Row>
                    <Row label="parentId">
                        <BigIntInput value={asset.parentId} onChange={(v) => set("parentId", v)}/>
                    </Row>
                    <Row label="defineTagNames">
                        <BigIntInput value={asset.defineTagNames} onChange={(v) => set("defineTagNames", v)}/>
                    </Row>
                    <Row label="defineFirst">
                        <BigIntInput value={asset.defineFirst} onChange={(v) => set("defineFirst", v)}/>
                    </Row>
                    <Row label="attribute">
                        <BigIntInput value={asset.attribute} onChange={(v) => set("attribute", v)}/>
                    </Row>
                    <Row label="srcFileHashCRC32">
                        <BigIntInput value={asset.srcFileHashCRC32} onChange={(v) => set("srcFileHashCRC32", v)}/>
                    </Row>
                    <Row label="targetBodyType">
                        <NumberField value={asset.targetBodyType} precision={0} onChange={(v) => set("targetBodyType", v)}/>
                    </Row>
                    <Row label="isHarayureAvailable">
                        <NumberField value={asset.isHarayureAvailable} precision={0}
                                     onChange={(v) => set("isHarayureAvailable", v)}/>
                    </Row>
                    <Row label="skirt_phys">
                        <NumberField value={asset.skirt_phys} precision={0} onChange={(v) => set("skirt_phys", v)}/>
                    </Row>
                    <Row label="toeLockSlotId">
                        <NullableStringInput value={asset.toeLockSlotId} onChange={(v) => set("toeLockSlotId", v)}/>
                    </Row>
                    <Row label="exportModelFormTextureName">
                        <NullableStringInput value={asset.exportModelFormTextureName}
                                             onChange={(v) => set("exportModelFormTextureName", v)}/>
                    </Row>
                </div>
            ),
        },
        {
            key: "commands",
            label: `${t('MenuAssetsEditor.command_list')} (${commands.length})`,
            children: (
                <MenuCommandsEditor
                    commands={commands}
                    onChange={(next) => set("commandList", next)}
                />
            ),
        },
        {
            key: "advanced",
            label: t('MenuAssetsEditor.advanced_fields'),
            children: <MenuAdvancedForm asset={asset} onChange={onChange}/>,
        },
    ];

    return <Collapse size="small" defaultActiveKey={["basic", "commands"]} items={items}/>;
};

export default MenuAssetForm;
