import React from "react";
import {Button, Select, Space, Tooltip} from "antd";
import {DeleteOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import {materialPropOptions} from "../../utils/kcesEnums";
import {NullableStringInput, NumberField, Row} from "./formControls";
import ColorPickerSync from "./ColorPickerSync";

/**
 * MaterialPropertyItem 单条材质属性编辑（复刻 COM3D2 MateEditor 的两种表单布局）
 * - compact：一行式紧凑布局（对应 MatePropertyItemType1 风格）
 * - labeled：标签竖排布局（对应 MatePropertyItemType2 风格）
 * 属性名为 Material.PropertType 枚举，通过 Select 选择（未知值以 #数字 显示）
 */

export type MaterialPropKind = "tex" | "col" | "vec" | "f";

export type MaterialFormLayout = "compact" | "labeled";

// propNameSelect 属性名选择器，未知枚举值动态补一个选项
function propNameSelect(kind: MaterialPropKind, type: number, onChange: (type: number) => void, width: number) {
    const options = [...materialPropOptions(kind)];
    if (!options.some((option) => option.value === type)) {
        options.push({label: `#${type}`, value: type});
    }
    return (
        <Select
            showSearch={{optionFilterProp: "label"}}
            size="small"
            style={{width}}
            styles={{popup: {root: {textAlign: "left"}}}}
            value={type}
            options={options}
            onChange={(value) => onChange(value)}
        />
    );
}

const MaterialPropertyItem: React.FC<{
    kind: MaterialPropKind;
    item: any;
    layout: MaterialFormLayout;
    onChange: (next: any) => void;
    onRemove: () => void;
}> = ({kind, item, layout, onChange, onRemove}) => {
    const {t} = useTranslation();

    const set = (field: string, value: any) => onChange({...item, [field]: value});

    const numberBox = (field: string, label: string, step = 0.01, width = 90) => (
        <Tooltip title={label} key={field}>
            <span>
                <NumberField width={width} step={step} value={item[field]}
                             onChange={(v) => set(field, v)}/>
            </span>
        </Tooltip>
    );

    const colorPicker = (
        <ColorPickerSync
            r={item.r ?? 1} g={item.g ?? 1} b={item.b ?? 1} a={item.a ?? 1}
            onChange={(r, g, b, a) => onChange({...item, r, g, b, a})}
        />
    );

    if (layout === "compact") {
        return (
            <div style={{display: "flex", gap: 6, alignItems: "center", marginBottom: 6}}>
                {propNameSelect(kind, item.type ?? 0, (type) => set("type", type), 200)}
                <div style={{flex: 1, minWidth: 0}}>
                    {kind === "tex" && (
                        <Space wrap size={4}>
                            <NullableStringInput value={item.fileName} onChange={(v) => set("fileName", v)}/>
                            {numberBox("ox", t('MaterialAssetsEditor.offsetX'))}
                            {numberBox("oy", t('MaterialAssetsEditor.offsetY'))}
                            {numberBox("sx", t('MaterialAssetsEditor.scaleX'))}
                            {numberBox("sy", t('MaterialAssetsEditor.scaleY'))}
                        </Space>
                    )}
                    {kind === "col" && (
                        <Space wrap size={4}>
                            {colorPicker}
                            {numberBox("r", "R")}
                            {numberBox("g", "G")}
                            {numberBox("b", "B")}
                            {numberBox("a", "A")}
                        </Space>
                    )}
                    {kind === "vec" && (
                        <Space wrap size={4}>
                            {numberBox("x", "X")}
                            {numberBox("y", "Y")}
                            {numberBox("z", "Z")}
                            {numberBox("w", "W")}
                        </Space>
                    )}
                    {kind === "f" && numberBox("v", t('MaterialAssetsEditor.number'), 0.01, 140)}
                </div>
                <Button size="small" type="text" danger icon={<DeleteOutlined/>} onClick={onRemove}/>
            </div>
        );
    }

    // labeled：标签竖排布局
    return (
        <div style={{
            marginBottom: 8,
            padding: 8,
            borderRadius: 6,
            border: "1px solid rgba(128,128,128,0.25)",
            textAlign: "left",
        }}>
            <Row label={t('MaterialAssetsEditor.property_name')}>
                <Space>
                    {propNameSelect(kind, item.type ?? 0, (type) => set("type", type), 240)}
                    <Button size="small" type="text" danger icon={<DeleteOutlined/>} onClick={onRemove}/>
                </Space>
            </Row>
            {kind === "tex" && (
                <>
                    <Row label={t('MaterialAssetsEditor.texture_file')}>
                        <NullableStringInput value={item.fileName} onChange={(v) => set("fileName", v)}/>
                    </Row>
                    <Row label={t('MaterialAssetsEditor.offset_scale')}>
                        <Space wrap size={4}>
                            {numberBox("ox", t('MaterialAssetsEditor.offsetX'))}
                            {numberBox("oy", t('MaterialAssetsEditor.offsetY'))}
                            {numberBox("sx", t('MaterialAssetsEditor.scaleX'))}
                            {numberBox("sy", t('MaterialAssetsEditor.scaleY'))}
                        </Space>
                    </Row>
                </>
            )}
            {kind === "col" && (
                <>
                    <Row label="RGBA">
                        <Space wrap size={4}>
                            {numberBox("r", "R")}
                            {numberBox("g", "G")}
                            {numberBox("b", "B")}
                            {numberBox("a", "A")}
                        </Space>
                    </Row>
                    <Row label={t('MaterialAssetsEditor.color_picker')}>
                        {colorPicker}
                    </Row>
                </>
            )}
            {kind === "vec" && (
                <Row label="XYZW">
                    <Space wrap size={4}>
                        {numberBox("x", "X")}
                        {numberBox("y", "Y")}
                        {numberBox("z", "Z")}
                        {numberBox("w", "W")}
                    </Space>
                </Row>
            )}
            {kind === "f" && (
                <Row label={t('MaterialAssetsEditor.number')}>
                    {numberBox("v", t('MaterialAssetsEditor.number'), 0.01, 140)}
                </Row>
            )}
        </div>
    );
};

export default MaterialPropertyItem;
