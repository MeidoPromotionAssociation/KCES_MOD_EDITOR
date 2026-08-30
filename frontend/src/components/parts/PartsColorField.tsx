import React from "react";
import {Button, InputNumber, Space, Switch, Table, Tooltip, Typography, theme} from "antd";
import {DeleteOutlined, PlusOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import {ObjectTriplePicker} from "../common/InfinityColorPicker";
import type {ColorTripleRef} from "../../utils/colorShapes";
import {BrightnessMax, ChromaMax, ContrastMax, HueMax, ShadowRateMax} from "../../utils/infinityColor";

/**
 * PartsColorField MaidInfinityColor.PartsColor 编辑器
 *
 * 无限色参数，不是 RGBA：主色 4 项（色相/彩度/明度/对比）+ 影色 5 项（比率/色相/彩度/明度/对比），
 * 全部 int。短标签取自游戏 PartsColor.Set(int H, int S, int L, int C, int T, int SH, int SS, int SL, int SC)
 * 的形参名，鼠标悬停显示完整字段名；取值上限照 Com3d2Native/ColorPalette.cs 的常量。
 * 主色与影色各带一个色块选择器，取色写回该组的色相/彩度/明度（换算见 utils/infinityColor.ts）。
 *
 * m_grada 是渐变用的 PartsColor 数组：游戏内以 m_gradaBytes 二进制保存，
 * editing JSON 已按 OnAfterDeserialize 回调还原成对象数组；渐变点自身不再嵌套 m_grada。
 */

interface ColorField {
    short: string;
    name: string;
    max: number;
}

/** 字段短标签 → JSON 键，顺序与游戏 PartsColor.Serialize 的写出顺序一致 */
const MainFields: ColorField[] = [
    {short: "H", name: "m_nMainHue", max: HueMax},
    {short: "S", name: "m_nMainChroma", max: ChromaMax},
    {short: "L", name: "m_nMainBrightness", max: BrightnessMax},
    {short: "C", name: "m_nMainContrast", max: ContrastMax},
];

const ShadowFields: ColorField[] = [
    {short: "T", name: "m_nShadowRate", max: ShadowRateMax},
    {short: "SH", name: "m_nShadowHue", max: HueMax},
    {short: "SS", name: "m_nShadowChroma", max: ChromaMax},
    {short: "SL", name: "m_nShadowBrightness", max: BrightnessMax},
    {short: "SC", name: "m_nShadowContrast", max: ContrastMax},
];

const AllFields = [...MainFields, ...ShadowFields];

/** 主色与影色各自的色相/彩度/明度键，供色块选择器读写；PartsColor 的明度就是 0..510 表示，无需偏移 */
const MainTriple: ColorTripleRef = {
    group: "main",
    hueKey: "m_nMainHue",
    chromaKey: "m_nMainChroma",
    brightnessKey: "m_nMainBrightness",
    brightnessOffset: 0,
};

const ShadowTriple: ColorTripleRef = {
    group: "shadow",
    hueKey: "m_nShadowHue",
    chromaKey: "m_nShadowChroma",
    brightnessKey: "m_nShadowBrightness",
    brightnessOffset: 0,
};

/** newPartsColor 出厂默认值：游戏里 PartsColor 是 struct，各 int 默认 0，m_grada 为 null */
export function newPartsColor(): any {
    const value: any = {};
    for (const field of AllFields) {
        value[field.name] = 0;
    }
    value.m_grada = null;
    return value;
}

/** 渐变点模板：与 PartsColor 相同但不再嵌套 m_grada（游戏 DeserializeGrada 不递归） */
function newGradaStop(): any {
    const value: any = {};
    for (const field of AllFields) {
        value[field.name] = 0;
    }
    return value;
}

const NumberCell: React.FC<{
    field: ColorField;
    value: any;
    onChange: (next: number) => void;
    width?: number;
}> = ({field, value, onChange, width}) => (
    <Tooltip title={`${field.name} (0-${field.max})`}>
        <InputNumber
            size="small"
            style={{width: width ?? 96}}
            prefix={<span style={{opacity: 0.55}}>{field.short}</span>}
            precision={0}
            min={0}
            max={field.max}
            value={value ?? 0}
            onChange={(next) => onChange((next ?? 0) as number)}
        />
    </Tooltip>
);

const PartsColorField: React.FC<{
    value: any;
    onChange: (next: any) => void;
}> = ({value, onChange}) => {
    const {t} = useTranslation();
    const {token} = theme.useToken();

    // 游戏里 PartsColor 是 struct，理论上不会是 null，但库的 JSON 允许，
    // 这里显式给个开关而不是编辑时悄悄把 null 变成对象
    if (value === null || value === undefined) {
        return (
            <Space size={4}>
                <Switch size="small" checked={false} onChange={() => onChange(newPartsColor())}/>
                <Typography.Text type="secondary">{t('FieldForm.unset')}</Typography.Text>
            </Space>
        );
    }

    const set = (name: string, next: number) => onChange({...value, [name]: next});

    const stops: any[] | null = Array.isArray(value.m_grada) ? value.m_grada : null;

    const updateStop = (index: number, next: any) => {
        const list = [...(stops ?? [])];
        list[index] = next;
        onChange({...value, m_grada: list});
    };

    // 渐变点没有稳定 id，只能按下标标识；antd v6 已弃用 rowKey 的 index 形参，故包一层
    const stopRows = (stops ?? []).map((stop, index) => ({key: String(index), index, stop}));

    const stopColumns = [
        {
            title: "#",
            width: 44,
            render: (_: any, record: { index: number }) => (
                <Typography.Text type="secondary">{record.index + 1}</Typography.Text>
            ),
        },
        {
            title: t('FieldForm.color_preview'),
            width: 56,
            render: (_: any, record: { index: number; stop: any }) => (
                <ObjectTriplePicker object={record.stop} triple={MainTriple}
                              onChange={(next) => updateStop(record.index, next)}/>
            ),
        },
        ...AllFields.map((field) => ({
            title: <Tooltip title={`${field.name} (0-${field.max})`}>{field.short}</Tooltip>,
            width: 104,
            render: (_: any, record: { index: number; stop: any }) => (
                <NumberCell field={field} value={record.stop?.[field.name]}
                            onChange={(next) => updateStop(record.index, {...record.stop, [field.name]: next})}/>
            ),
        })),
        {
            title: t('Common.operate'),
            width: 56,
            render: (_: any, record: { index: number }) => (
                <Button size="small" type="text" danger icon={<DeleteOutlined/>} title={t('FieldForm.delete_row')}
                        onClick={() => {
                            const list = [...(stops ?? [])];
                            list.splice(record.index, 1);
                            onChange({...value, m_grada: list.length === 0 ? null : list});
                        }}/>
            ),
        },
    ];

    return (
        <div style={{textAlign: "left"}}>
            <div style={{display: "flex", alignItems: "center", gap: 8, marginBottom: 6}}>
                <Typography.Text type="secondary" style={{width: 72, flexShrink: 0}}>
                    {t('FieldForm.main_color')}
                </Typography.Text>
                <Space size={4} wrap>
                    <ObjectTriplePicker object={value} triple={MainTriple} onChange={onChange}/>
                    {MainFields.map((field) => (
                        <NumberCell key={field.name} field={field} value={value[field.name]}
                                    onChange={(next) => set(field.name, next)}/>
                    ))}
                </Space>
            </div>
            <div style={{display: "flex", alignItems: "center", gap: 8, marginBottom: 6}}>
                <Typography.Text type="secondary" style={{width: 72, flexShrink: 0}}>
                    {t('FieldForm.shadow_color')}
                </Typography.Text>
                <Space size={4} wrap>
                    <ObjectTriplePicker object={value} triple={ShadowTriple} onChange={onChange}/>
                    {ShadowFields.map((field) => (
                        <NumberCell key={field.name} field={field} value={value[field.name]}
                                    onChange={(next) => set(field.name, next)}/>
                    ))}
                </Space>
            </div>
            <div style={{display: "flex", alignItems: "flex-start", gap: 8}}>
                <Typography.Text type="secondary" style={{width: 72, flexShrink: 0, paddingTop: 4}}>
                    {t('FieldForm.grada_stops')}
                </Typography.Text>
                <div style={{flex: 1, minWidth: 0}}>
                    <Space style={{marginBottom: stops ? 8 : 0}}>
                        <Button size="small" icon={<PlusOutlined/>}
                                onClick={() => onChange({...value, m_grada: [...(stops ?? []), newGradaStop()]})}>
                            {t('FieldForm.add_row')}
                        </Button>
                        {stops
                            ? <Typography.Text type="secondary">
                                {t('FieldForm.row_count', {count: stops.length})}
                            </Typography.Text>
                            : <Typography.Text type="secondary">{t('FieldForm.unset')}</Typography.Text>}
                    </Space>
                    {stops && stops.length > 0 && (
                        <Table
                            size="small"
                            rowKey={(record) => record.key}
                            columns={stopColumns as any}
                            dataSource={stopRows}
                            pagination={false}
                            scroll={{x: "max-content"}}
                            style={{background: token.colorBgContainer, borderRadius: token.borderRadius}}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default PartsColorField;
