import React from "react";
import {Collapse, Space, Typography} from "antd";
import {useTranslation} from "react-i18next";
import {MapTable, NullToggle, ObjectFields} from "../common/SpecFields";
import {NullableStringInput, Row} from "./formControls";
import {
    colvariSpec,
    newColvari,
    newPartsVer,
    newPreMulTexData,
    partsVerSpec,
    preMulTexDataSpec,
} from "./menuAdvancedSpecs";

/**
 * MenuAdvancedForm .menuassets 的高级字段编辑
 *
 * 这四个字段原先只有一个通用 JSON 树形表单，颜色变体等结构层层折叠很难看清。
 * 这里改成：同构记录列表（colvariDatas、preMulTexDatas 等）用表格逐行编辑，
 * 标量走带枚举下拉的表单，深层嵌套结构收在表格的展开行里。
 *
 * 面板顺序按 parts.menuassets 真实样本里的使用率排（1839 项中 colvariInfo 1244、
 * colvariFileNameExp 227、preMulTexDatas 10、partsVer 0），不按结构体字段顺序。
 */

/** 新建映射项时的占位键：这个键是菜单命令（ほくろ合成 等）里引用的哈希值，编辑器无从推算，给个不冲突的占位让用户自己填 */
function placeholderKey(map: Record<string, any> | null): string {
    let candidate = 0;
    while (map && Object.prototype.hasOwnProperty.call(map, String(candidate))) {
        candidate++;
    }
    return String(candidate);
}

const MenuAdvancedForm: React.FC<{
    asset: any;
    onChange: (next: any) => void;
}> = ({asset, onChange}) => {
    const {t} = useTranslation();

    const set = (field: string, value: any) => onChange({...asset, [field]: value});

    const colvariInfo = asset.colvariInfo ?? null;
    const partsVer = asset.partsVer ?? null;
    const preMulTexDatas = asset.preMulTexDatas ?? null;

    const items = [
        {
            key: "colvariInfo",
            label: (
                <Space>
                    <Typography.Text strong>colvariInfo</Typography.Text>
                    <Typography.Text type="secondary">
                        {colvariInfo
                            ? t('FieldForm.row_count', {count: colvariInfo.colvariDatas?.length ?? 0})
                            : t('FieldForm.unset')}
                    </Typography.Text>
                </Space>
            ),
            children: (
                <div>
                    <div style={{marginBottom: 8}}>
                        <NullToggle isSet={!!colvariInfo}
                                    onToggle={(enabled) => set("colvariInfo", enabled ? newColvari() : null)}/>
                    </div>
                    {colvariInfo && (
                        <ObjectFields value={colvariInfo} spec={colvariSpec()}
                                      onChange={(next) => set("colvariInfo", next)}/>
                    )}
                </div>
            ),
        },
        {
            key: "colvariFileNameExp",
            label: (
                <Space>
                    <Typography.Text strong>colvariFileNameExp</Typography.Text>
                    <Typography.Text type="secondary">
                        {asset.colvariFileNameExp ? asset.colvariFileNameExp : t('FieldForm.unset')}
                    </Typography.Text>
                </Space>
            ),
            children: (
                <Row label="colvariFileNameExp">
                    <NullableStringInput value={asset.colvariFileNameExp}
                                         onChange={(v) => set("colvariFileNameExp", v)}/>
                </Row>
            ),
        },
        {
            key: "preMulTexDatas",
            label: (
                <Space>
                    <Typography.Text strong>preMulTexDatas</Typography.Text>
                    <Typography.Text type="secondary">
                        {preMulTexDatas
                            ? t('FieldForm.row_count', {count: Object.keys(preMulTexDatas).length})
                            : t('FieldForm.unset')}
                    </Typography.Text>
                </Space>
            ),
            children: (
                <MapTable
                    map={preMulTexDatas}
                    spec={preMulTexDataSpec()}
                    newItem={newPreMulTexData}
                    newKey={() => placeholderKey(preMulTexDatas)}
                    onChange={(next) => set("preMulTexDatas", next)}
                />
            ),
        },
        {
            key: "partsVer",
            label: (
                <Space>
                    <Typography.Text strong>partsVer</Typography.Text>
                    <Typography.Text type="secondary">
                        {partsVer ? `${partsVer.item1 ?? ""} / ${partsVer.item2 ?? 0}` : t('FieldForm.unset')}
                    </Typography.Text>
                </Space>
            ),
            children: (
                <div>
                    <div style={{marginBottom: 8}}>
                        <NullToggle isSet={!!partsVer}
                                    onToggle={(enabled) => set("partsVer", enabled ? newPartsVer() : null)}/>
                    </div>
                    {partsVer && (
                        <ObjectFields value={partsVer} spec={partsVerSpec()}
                                      onChange={(next) => set("partsVer", next)}/>
                    )}
                </div>
            ),
        },
    ];

    return <Collapse size="small" items={items}/>;
};

export default MenuAdvancedForm;
