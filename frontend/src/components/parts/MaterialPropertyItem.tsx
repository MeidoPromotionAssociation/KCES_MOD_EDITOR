import React, {useEffect, useState} from "react";
import {AutoComplete, Button, Space, Switch, Tooltip, Typography} from "antd";
import {DeleteOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import {MaterialPropKind, materialPropName, materialPropOptions, materialPropValue} from "../../utils/kcesEnums";
import {NullableStringInput, NumberField, Row} from "./formControls";
import ColorPickerSync from "./ColorPickerSync";

/**
 * MaterialPropertyItem 单条材质属性编辑（复刻 COM3D2 MateEditor 的属性项表单）
 * - compact：一行式紧凑布局（对应 MatePropertyItemType1 风格）
 * - labeled：标签竖排布局（对应 MatePropertyItemType2 风格）
 * 属性名走 AutoComplete：提示 Material.PropertType 的枚举名，也允许自由输入数字
 */

export type {MaterialPropKind};

/**
 * 表单布局：compact / labeled 是属性项自身的排布，sidebar 是外层「分栏 + 可搜索列表」
 * 布局（MaterialPropertyBrowser），此时属性项仍按 labeled 渲染
 */
export type MaterialFormLayout = "compact" | "labeled" | "sidebar";

/** 各属性类别对应的数组字段与新建模板（属性名取该类别枚举的首项） */
export const PropKinds: Array<{
    kind: MaterialPropKind;
    field: string;
    newItem: () => any;
}> = [
    {kind: "tex", field: "textureProps", newItem: () => ({type: 0, fileName: "", ox: 0, oy: 0, sx: 1, sy: 1})},
    {kind: "col", field: "colorProps", newItem: () => ({type: 100, r: 1, g: 1, b: 1, a: 1})},
    {kind: "vec", field: "vectorProps", newItem: () => ({type: 0, x: 0, y: 0, z: 0, w: 0})},
    {kind: "f", field: "floatProps", newItem: () => ({type: 200, v: 0})},
    {kind: "kw", field: "keywordProps", newItem: () => ({type: 300, value: true})},
];

/** 类别 → 该类别在文档里的数组字段名（PropKinds 是固定表，按类别写回单项时用它定位） */
export const fieldOf = (kind: MaterialPropKind) => PropKinds.find((prop) => prop.kind === kind)?.field;

/**
 * PropNameInput 属性名输入
 * 枚举名（忽略大小写，与游戏侧 Enum.TryParse(ignoreCase: true) 一致）或 `#数字` / 纯数字会被提交；
 * 认不出的文本留在框里不提交，免得把数据改成没意义的取值
 */
const PropNameInput: React.FC<{
    kind: MaterialPropKind;
    type: number;
    onChange: (type: number) => void;
    width: number;
}> = ({kind, type, onChange, width}) => {
    const nameOf = (value: number) => materialPropName(kind, value);
    const [text, setText] = useState(nameOf(type));
    const {t} = useTranslation();

    useEffect(() => {
        setText(nameOf(type));
    }, [kind, type]);

    return (
        <Tooltip title={t('MaterialAssetsEditor.property_name')}>
            <AutoComplete
                style={{width}}
                allowClear
                value={text}
                options={materialPropOptions(kind)}
                onChange={(next) => {
                    setText(next);
                    const named = materialPropValue(kind, next);
                    if (named !== null) {
                        onChange(named);
                        return;
                    }
                    const trimmed = next.trim();
                    if (/^#?\d+$/.test(trimmed)) {
                        onChange(Number(trimmed.replace(/^#/, "")));
                    }
                }}
            />
        </Tooltip>
    );
};

const MaterialPropertyItem: React.FC<{
    kind: MaterialPropKind;
    /** 在本类别数组里的下标。回调按「类别 + 下标」定位，父组件的回调才能保持稳定引用 */
    index: number;
    item: any;
    layout: MaterialFormLayout;
    /** 稳定引用：改本项（由父组件按类别与下标写回） */
    onChange: (kind: MaterialPropKind, index: number, next: any) => void;
    /** 稳定引用：删本项 */
    onRemove: (kind: MaterialPropKind, index: number) => void;
}> = ({kind, index, item, layout, onChange, onRemove}) => {
    const {t} = useTranslation();

    const set = (field: string, value: any) => onChange(kind, index, {...item, [field]: value});
    const remove = () => onRemove(kind, index);

    const numberBox = (field: string, label: string, step = 0.01, width = 90) => (
        <NumberField key={field} tooltip={label} width={width} step={step} value={item[field]}
                     onChange={(v) => set(field, v)}/>
    );

    const colorPicker = (
        <ColorPickerSync
            r={item.r ?? 1} g={item.g ?? 1} b={item.b ?? 1} a={item.a ?? 1}
            onChange={(r, g, b, a) => onChange(kind, index, {...item, r, g, b, a})}
        />
    );

    // 关键字属性只有「名字 + 开关」两项
    const keywordSwitch = (
        <Tooltip title={t('MaterialAssetsEditor.keyword_enabled_tip')}>
            <Switch size="small" checked={!!item.value} onChange={(v) => set("value", v)}/>
        </Tooltip>
    );

    if (layout === "compact") {
        return (
            <div style={{display: "flex", gap: 6, alignItems: "center", marginBottom: 6}}>
                <PropNameInput kind={kind} type={item.type ?? 0} onChange={(type) => set("type", type)} width={200}/>
                <div style={{flex: 1, minWidth: 0}}>
                    {kind === "tex" && (
                        <Space wrap size={4}>
                            <NullableStringInput value={item.fileName} onChange={(v) => set("fileName", v)}
                                                 tooltip={t('MaterialAssetsEditor.texture_file')}/>
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
                    {kind === "kw" && keywordSwitch}
                </div>
                <Button size="small" type="text" danger icon={<DeleteOutlined/>} onClick={remove}/>
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
                    <PropNameInput kind={kind} type={item.type ?? 0} onChange={(type) => set("type", type)}
                                   width={240}/>
                    <Button size="small" type="text" danger icon={<DeleteOutlined/>} onClick={remove}/>
                </Space>
            </Row>
            {kind === "tex" && (
                <>
                    <Row label={t('MaterialAssetsEditor.texture_file')}>
                        <NullableStringInput value={item.fileName} tooltip={t('MaterialAssetsEditor.texture_file')}
                                             onChange={(v) => set("fileName", v)}/>
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
                <>
                    <Typography.Text type="secondary" style={{fontSize: 12, display: "block", marginBottom: 6}}>
                        {t('MaterialAssetsEditor.vector_name_tip')}
                    </Typography.Text>
                    <Row label="XYZW">
                        <Space wrap size={4}>
                            {numberBox("x", "X")}
                            {numberBox("y", "Y")}
                            {numberBox("z", "Z")}
                            {numberBox("w", "W")}
                        </Space>
                    </Row>
                </>
            )}
            {kind === "f" && (
                <Row label={t('MaterialAssetsEditor.number')}>
                    {numberBox("v", t('MaterialAssetsEditor.number'), 0.01, 140)}
                </Row>
            )}
            {kind === "kw" && (
                <Row label={t('MaterialAssetsEditor.keyword_enabled')}>
                    <Space size={6}>
                        {keywordSwitch}
                        <span>{item.value ? t('MaterialAssetsEditor.keyword_on') : t('MaterialAssetsEditor.keyword_off')}</span>
                    </Space>
                </Row>
            )}
        </div>
    );
};

/**
 * memo：属性项动辄几十条，回填一次颜色要重建整个表单，若每条都跟着重渲染会明显掉帧。
 * 配合父组件按「类别 + 下标」传的稳定回调，未改动的项整支跳过渲染。
 */
export default React.memo(MaterialPropertyItem);