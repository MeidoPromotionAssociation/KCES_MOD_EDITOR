import React, {useState} from "react";
import {Button, Collapse, Input, InputNumber, Select, Space, Switch, Table, theme, Typography} from "antd";
import {DeleteOutlined, PlusOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import BigIntInput from "./BigIntInput";

/**
 * SpecFields 由字段描述（FieldSpec）驱动的结构化表单与表格
 *
 * 用途是那些「一串同构记录 + 少量嵌套」的库结构：把标量字段摊成表格列逐行编辑，
 * 嵌套的子对象与子列表放进展开行，避免整块结构只能扔给 JSON 树形表单。
 * 字段名直接用库里的 JSON 键（与 MenuAssetForm 等既有表单一致），不另做翻译。
 */

/** 标量与容器字段的统一描述 */
export type FieldSpec =
    | { kind: "str"; name: string; width?: number }
    | { kind: "int"; name: string; width?: number }
    | { kind: "float"; name: string; width?: number }
    | { kind: "bool"; name: string }
    | { kind: "big"; name: string }
    | { kind: "enum"; name: string; options: Array<{ label: string; value: number }>; width?: number }
    | { kind: "strEnum"; name: string; options: Array<{ label: string; value: string }>; width?: number }
    | { kind: "flags"; name: string; flags: Array<{ label: string; bit: number }>; width?: number }
    | { kind: "vec"; name: string; axes: string[]; integer?: boolean }
    | { kind: "numList"; name: string; integer?: boolean }
    | { kind: "strList"; name: string }
    | { kind: "custom"; name: string; render: (value: any, onChange: (next: any) => void) => React.ReactNode }
    | { kind: "obj"; name: string; spec: () => FieldSpec[]; newValue: () => any }
    | { kind: "list"; name: string; spec: () => FieldSpec[]; newItem: () => any };

/** 能塞进一个表格单元格的字段：其余（custom/obj/list）走展开行 */
export function isInlineSpec(spec: FieldSpec): boolean {
    return spec.kind !== "custom" && spec.kind !== "obj" && spec.kind !== "list";
}

/** 列表/映射项的默认列宽，按字段类型给一个够用的值 */
function inlineWidth(spec: FieldSpec): number {
    switch (spec.kind) {
        case "str":
            return spec.width ?? 200;
        case "int":
        case "float":
            return spec.width ?? 120;
        case "bool":
            return 70;
        case "big":
            return 210;
        case "enum":
            return spec.width ?? 190;
        case "strEnum":
            return spec.width ?? 180;
        case "flags":
            return spec.width ?? 190;
        case "vec":
            return spec.axes.length * 84 + 8;
        case "numList":
        case "strList":
            return 260;
        default:
            return 200;
    }
}

/**
 * InlineControl 单个标量字段的控件
 * 可空字符串保持 null 语义：原值为 null 且内容为空时写回 null 而不是空串
 */
const InlineControl: React.FC<{
    spec: FieldSpec;
    value: any;
    onChange: (next: any) => void;
    full?: boolean;
}> = ({spec, value, onChange, full}) => {
    const {t} = useTranslation();
    const width = full ? undefined : inlineWidth(spec);
    const style: React.CSSProperties = full ? {width: "100%", maxWidth: 420} : {width};

    switch (spec.kind) {
        case "str":
            return (
                <Input
                    size="small"
                    style={style}
                    value={value ?? ""}
                    onChange={(e) => {
                        const text = e.target.value;
                        onChange(text === "" && (value === null || value === undefined) ? null : text);
                    }}
                />
            );
        case "int":
            return (
                <InputNumber size="small" style={style} precision={0} value={value ?? 0}
                             onChange={(next) => onChange((next ?? 0) as number)}/>
            );
        case "float":
            return (
                <InputNumber size="small" style={style} step={0.01} value={value ?? 0}
                             onChange={(next) => onChange((next ?? 0) as number)}/>
            );
        case "bool":
            return <Switch size="small" checked={!!value} onChange={(checked) => onChange(checked)}/>;
        case "big":
            return <BigIntInput value={value} onChange={onChange} style={style}/>;
        case "enum": {
            // 数据里出现枚举外的值时补一个选项，避免 Select 显示空白把原值悄悄改掉
            const options = [...spec.options];
            if (value !== null && value !== undefined && !options.some((option) => option.value === value)) {
                options.push({label: `#${value}`, value});
            }
            return (
                <Select size="small" style={style} value={value ?? null} options={options}
                        showSearch={{optionFilterProp: "label"}}
                        styles={{popup: {root: {textAlign: "left"}}}}
                        onChange={(next) => onChange(next)}/>
            );
        }
        case "strEnum": {
            // 字符串枚举字段（f_eBlendMode / preTexCompoTypeStr）在游戏里要过 Enum.Parse，
            // 清空成 null 会让游戏加载时抛异常，所以不给 allowClear；
            // 数据里已有的枚举外取值补成选项，避免下拉框显示空白把原值悄悄改掉
            const options = [...spec.options];
            if (value && !options.some((option) => option.value === value)) {
                options.push({label: value, value});
            }
            return (
                <Select size="small" style={style} value={value ?? null} options={options}
                        showSearch={{optionFilterProp: "label"}}
                        styles={{popup: {root: {textAlign: "left"}}}}
                        onChange={(next) => onChange(next)}/>
            );
        }
        case "flags": {
            // 用多选保存位标志，未知位（枚举没覆盖到的）原样保留
            const current = typeof value === "number" ? value : 0;
            const known = spec.flags.reduce((acc, flag) => acc | flag.bit, 0);
            return (
                <Select
                    size="small"
                    mode="multiple"
                    style={style}
                    value={spec.flags.filter((flag) => (current & flag.bit) !== 0).map((flag) => flag.bit)}
                    options={spec.flags.map((flag) => ({label: `${flag.label} (${flag.bit})`, value: flag.bit}))}
                    styles={{popup: {root: {textAlign: "left"}}}}
                    onChange={(bits: number[]) => onChange(bits.reduce((acc, bit) => acc | bit, current & ~known))}
                />
            );
        }
        case "vec":
            return (
                <Space size={4}>
                    {spec.axes.map((axis) => (
                        <InputNumber
                            key={axis}
                            size="small"
                            style={{width: 80}}
                            prefix={<span style={{opacity: 0.55}}>{axis}</span>}
                            precision={spec.integer ? 0 : undefined}
                            step={spec.integer ? 1 : 0.01}
                            value={value?.[axis] ?? 0}
                            onChange={(next) => onChange({...(value ?? {}), [axis]: (next ?? 0) as number})}
                        />
                    ))}
                </Space>
            );
        case "numList":
        case "strList": {
            const list: any[] = Array.isArray(value) ? value : [];
            const isNull = value === null || value === undefined;
            const blank = spec.kind === "numList" ? 0 : "";
            return (
                <Space wrap size={4}>
                    {isNull && <Typography.Text type="secondary">{t('FieldForm.unset')}</Typography.Text>}
                    {list.map((item, index) => (
                        spec.kind === "numList" ? (
                            <InputNumber
                                key={index}
                                size="small"
                                style={{width: 90}}
                                precision={spec.integer ? 0 : undefined}
                                step={spec.integer ? 1 : 0.01}
                                value={item ?? 0}
                                onChange={(next) => {
                                    const nextList = [...list];
                                    nextList[index] = (next ?? 0) as number;
                                    onChange(nextList);
                                }}
                            />
                        ) : (
                            <Input
                                key={index}
                                size="small"
                                style={{width: 140}}
                                value={item ?? ""}
                                onChange={(e) => {
                                    const nextList = [...list];
                                    nextList[index] = e.target.value;
                                    onChange(nextList);
                                }}
                            />
                        )
                    ))}
                    <Button size="small" icon={<PlusOutlined/>} title={t('FieldForm.add_item')}
                            onClick={() => onChange([...list, blank])}/>
                    <Button size="small" icon={<DeleteOutlined/>} title={t('FieldForm.remove_last')}
                            disabled={list.length === 0}
                            onClick={() => onChange(list.length === 1 ? null : list.slice(0, -1))}/>
                </Space>
            );
        }
        default:
            return null;
    }
};

/** NullToggle 可空对象/列表的启用开关：关掉写回 null，避免把游戏预期的 null 变成空对象 */
const NullToggle: React.FC<{
    isSet: boolean;
    onToggle: (enabled: boolean) => void;
}> = ({isSet, onToggle}) => {
    const {t} = useTranslation();
    return (
        <Space size={4}>
            <Switch size="small" checked={isSet} onChange={onToggle}/>
            <Typography.Text type="secondary">{isSet ? t('FieldForm.set') : t('FieldForm.unset')}</Typography.Text>
        </Space>
    );
};

/**
 * ObjectFields 把一个对象按 spec 摊成「字段名 + 控件」的若干行
 * 标量字段直接成行；custom / 嵌套对象 / 嵌套列表各自折叠成一个面板
 */
export const ObjectFields: React.FC<{
    value: any;
    spec: FieldSpec[];
    onChange: (next: any) => void;
}> = ({value, spec, onChange}) => {
    const {t} = useTranslation();
    const object = value ?? {};
    const set = (name: string, next: any) => onChange({...object, [name]: next});

    const inline = spec.filter(isInlineSpec);
    const nested = spec.filter((item) => !isInlineSpec(item));

    return (
        <div style={{textAlign: "left"}}>
            {inline.map((item) => (
                <div key={item.name} style={{display: "flex", alignItems: "center", gap: 8, marginBottom: 6}}>
                    <Typography.Text style={{width: 200, flexShrink: 0}} ellipsis={{tooltip: item.name}}>
                        {item.name}
                    </Typography.Text>
                    <div style={{flex: 1, minWidth: 0}}>
                        <InlineControl spec={item} value={object[item.name]} onChange={(next) => set(item.name, next)}
                                       full/>
                    </div>
                </div>
            ))}
            {nested.length > 0 && (
                <Collapse
                    size="small"
                    style={{marginTop: 8}}
                    items={nested.map((item) => ({
                        key: item.name,
                        label: (
                            <Space>
                                <Typography.Text strong>{item.name}</Typography.Text>
                                {item.kind === "list" && (
                                    <Typography.Text type="secondary">
                                        {Array.isArray(object[item.name])
                                            ? t('FieldForm.row_count', {count: object[item.name].length})
                                            : t('FieldForm.unset')}
                                    </Typography.Text>
                                )}
                                {item.kind === "obj" && (
                                    <Typography.Text type="secondary">
                                        {object[item.name] ? t('FieldForm.set') : t('FieldForm.unset')}
                                    </Typography.Text>
                                )}
                            </Space>
                        ),
                        children: (
                            <NestedField spec={item} value={object[item.name]} onChange={(next) => set(item.name, next)}/>
                        ),
                    }))}
                />
            )}
        </div>
    );
};

/** NestedField custom / 嵌套对象 / 嵌套列表三种非标量字段的内容 */
const NestedField: React.FC<{
    spec: FieldSpec;
    value: any;
    onChange: (next: any) => void;
}> = ({spec, value, onChange}) => {
    if (spec.kind === "custom") {
        return <>{spec.render(value, onChange)}</>;
    }
    if (spec.kind === "obj") {
        return (
            <div>
                <div style={{marginBottom: 8}}>
                    <NullToggle isSet={!!value} onToggle={(enabled) => onChange(enabled ? spec.newValue() : null)}/>
                </div>
                {value && <ObjectFields value={value} spec={spec.spec()} onChange={onChange}/>}
            </div>
        );
    }
    if (spec.kind === "list") {
        return (
            <RecordTable
                rows={Array.isArray(value) ? value : null}
                spec={spec.spec()}
                newItem={spec.newItem}
                onChange={onChange}
            />
        );
    }
    return null;
};

/**
 * RecordTable 同构记录列表的表格编辑
 * 标量字段一列一个，嵌套字段收进展开行；rows 为 null 时先给一个启用开关，
 * 因为库里这些数组多数是可空的，空数组与 null 在游戏里不等价
 *
 * 库里的记录没有稳定 id，行标识只能用下标；antd v6 已经弃用 rowKey 的 index 形参，
 * 所以把每行包一层 {key, row} 再喂给 Table
 */
interface IndexedRow {
    key: string;
    index: number;
    row: any;
}

export const RecordTable: React.FC<{
    rows: any[] | null;
    spec: FieldSpec[];
    newItem: () => any;
    onChange: (next: any[] | null) => void;
    /** 表格高度上限，超出后表体内部滚动 */
    maxHeight?: number;
}> = ({rows, spec, newItem, onChange, maxHeight}) => {
    const {t} = useTranslation();
    const {token} = theme.useToken();

    const inline = spec.filter(isInlineSpec);
    const nested = spec.filter((item) => !isInlineSpec(item));

    if (rows === null) {
        return <NullToggle isSet={false} onToggle={(enabled) => onChange(enabled ? [] : null)}/>;
    }

    const update = (index: number, next: any) => {
        const list = [...rows];
        list[index] = next;
        onChange(list);
    };

    const dataSource: IndexedRow[] = rows.map((row, index) => ({key: String(index), index, row}));

    const columns = [
        {
            title: "#",
            width: 44,
            fixed: "left" as const,
            render: (_: any, record: IndexedRow) => (
                <Typography.Text type="secondary">{record.index + 1}</Typography.Text>
            ),
        },
        ...inline.map((item) => ({
            title: item.name,
            width: inlineWidth(item),
            render: (_: any, record: IndexedRow) => (
                <InlineControl spec={item} value={record.row?.[item.name]}
                               onChange={(next) => update(record.index, {...record.row, [item.name]: next})}/>
            ),
        })),
        {
            title: t('Common.operate'),
            width: 56,
            fixed: "right" as const,
            render: (_: any, record: IndexedRow) => (
                <Button size="small" type="text" danger icon={<DeleteOutlined/>}
                        title={t('FieldForm.delete_row')}
                        onClick={() => {
                            const list = [...rows];
                            list.splice(record.index, 1);
                            onChange(list);
                        }}/>
            ),
        },
    ];

    return (
        <div style={{textAlign: "left"}}>
            <Space style={{marginBottom: 8}}>
                <Button size="small" icon={<PlusOutlined/>} onClick={() => onChange([...rows, newItem()])}>
                    {t('FieldForm.add_row')}
                </Button>
                <NullToggle isSet onToggle={(enabled) => onChange(enabled ? rows : null)}/>
                <Typography.Text type="secondary">{t('FieldForm.row_count', {count: rows.length})}</Typography.Text>
            </Space>
            <Table<IndexedRow>
                size="small"
                rowKey={(record) => record.key}
                columns={columns as any}
                dataSource={dataSource}
                pagination={false}
                scroll={{x: "max-content", y: maxHeight}}
                locale={{emptyText: t('FieldForm.empty_list')}}
                style={{background: token.colorBgContainer, borderRadius: token.borderRadius}}
                expandable={nested.length > 0 ? {
                    columnTitle: t('FieldForm.nested'),
                    columnWidth: 44,
                    rowExpandable: () => true,
                    expandedRowRender: (record) => (
                        <ObjectFields value={record.row} spec={nested}
                                      onChange={(next) => update(record.index, next)}/>
                    ),
                } : undefined}
            />
        </div>
    );
};

/**
 * MapKeyInput uint64 映射键的编辑框
 * 键要作为行标识，逐字符提交会让行在编辑途中重排并丢焦点，所以本地暂存、失焦时才提交；
 * 暂存值同时写进 ref，这样即使 input 与 blur 落在同一个事件循环里（状态还没重新渲染），
 * 失焦也能提交到最新输入。键是 JSON 对象键（字符串），全程不过 Number()，避免 uint64 精度损失
 */
const MapKeyInput: React.FC<{
    value: string;
    taken: string[];
    onCommit: (next: string) => void;
}> = ({value, taken, onCommit}) => {
    const {t} = useTranslation();
    const [text, setText] = useState(value);
    const pending = React.useRef(value);

    React.useEffect(() => {
        setText(value);
        pending.current = value;
    }, [value]);

    const invalidFormat = !/^\d+$/.test(text.trim());
    const duplicated = !invalidFormat && text.trim() !== value && taken.includes(text.trim());
    const error = invalidFormat || duplicated;

    return (
        <Input
            size="small"
            style={{width: 210}}
            status={error ? "error" : undefined}
            title={invalidFormat ? t('FieldForm.key_invalid') : duplicated ? t('FieldForm.key_duplicated') : undefined}
            value={text}
            onChange={(e) => {
                pending.current = e.target.value;
                setText(e.target.value);
            }}
            onBlur={() => {
                const next = pending.current.trim();
                if (!/^\d+$/.test(next) || (next !== value && taken.includes(next)) || next === value) {
                    setText(value);
                    pending.current = value;
                    return;
                }
                onCommit(next);
            }}
            onPressEnter={(e) => (e.target as HTMLInputElement).blur()}
        />
    );
};

/**
 * MapTable uint64 → 记录 的映射表格
 * 与 RecordTable 同构，只是多一列可编辑的键；改键时重建对象以保持其余键的顺序
 */
interface MapRow {
    key: string;
    value: any;
}

export const MapTable: React.FC<{
    map: Record<string, any> | null;
    spec: FieldSpec[];
    newItem: () => any;
    newKey: () => string;
    onChange: (next: Record<string, any> | null) => void;
}> = ({map, spec, newItem, newKey, onChange}) => {
    const {t} = useTranslation();
    const {token} = theme.useToken();

    const inline = spec.filter(isInlineSpec);
    const nested = spec.filter((item) => !isInlineSpec(item));

    if (map === null || map === undefined) {
        return <NullToggle isSet={false} onToggle={(enabled) => onChange(enabled ? {} : null)}/>;
    }

    const keys = Object.keys(map);
    const rows: MapRow[] = keys.map((key) => ({key, value: map[key]}));

    const setValue = (key: string, next: any) => onChange({...map, [key]: next});

    const renameKey = (oldKey: string, nextKey: string) => {
        const rebuilt: Record<string, any> = {};
        for (const key of keys) {
            rebuilt[key === oldKey ? nextKey : key] = map[key];
        }
        onChange(rebuilt);
    };

    const removeKey = (key: string) => {
        const rebuilt: Record<string, any> = {};
        for (const item of keys) {
            if (item !== key) rebuilt[item] = map[item];
        }
        onChange(rebuilt);
    };

    const columns = [
        {
            title: t('FieldForm.map_key'),
            width: 220,
            fixed: "left" as const,
            render: (_: any, record: { key: string }) => (
                <MapKeyInput value={record.key} taken={keys}
                             onCommit={(next) => renameKey(record.key, next)}/>
            ),
        },
        ...inline.map((item) => ({
            title: item.name,
            width: inlineWidth(item),
            render: (_: any, record: { key: string; value: any }) => (
                <InlineControl spec={item} value={record.value?.[item.name]}
                               onChange={(next) => setValue(record.key, {...record.value, [item.name]: next})}/>
            ),
        })),
        {
            title: t('Common.operate'),
            width: 56,
            fixed: "right" as const,
            render: (_: any, record: { key: string }) => (
                <Button size="small" type="text" danger icon={<DeleteOutlined/>}
                        title={t('FieldForm.delete_row')} onClick={() => removeKey(record.key)}/>
            ),
        },
    ];

    return (
        <div style={{textAlign: "left"}}>
            <Space style={{marginBottom: 8}}>
                <Button size="small" icon={<PlusOutlined/>}
                        onClick={() => onChange({...map, [newKey()]: newItem()})}>
                    {t('FieldForm.add_row')}
                </Button>
                <NullToggle isSet onToggle={(enabled) => onChange(enabled ? map : null)}/>
                <Typography.Text type="secondary">{t('FieldForm.row_count', {count: keys.length})}</Typography.Text>
            </Space>
            <Table<MapRow>
                size="small"
                rowKey={(record) => record.key}
                columns={columns as any}
                dataSource={rows}
                pagination={false}
                scroll={{x: "max-content"}}
                locale={{emptyText: t('FieldForm.empty_list')}}
                style={{background: token.colorBgContainer, borderRadius: token.borderRadius}}
                expandable={nested.length > 0 ? {
                    columnTitle: t('FieldForm.nested'),
                    columnWidth: 44,
                    rowExpandable: () => true,
                    expandedRowRender: (record) => (
                        <ObjectFields value={record.value} spec={nested}
                                      onChange={(next) => setValue(record.key, next)}/>
                    ),
                } : undefined}
            />
        </div>
    );
};

export {NullToggle, InlineControl};
