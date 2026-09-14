import React, {useMemo, useRef, useState} from "react";
import {Alert, Button, Divider, Empty, Input, Radio, theme, Typography} from "antd";
import {DeleteOutlined, PlusOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import MaterialPropertyItem, {PropKinds} from "./MaterialPropertyItem";
import {MaterialPropKind, materialPropName} from "../../utils/kcesEnums";

/**
 * MaterialPropertyBrowser 分栏式材质属性编辑（对应 COM3D2 MateEditor 的「表单编辑 2」）
 * 左侧：类别筛选 + 属性名搜索 + 按类别分组的结果列表；右侧：只渲染选中的那一条属性。
 *
 * 与参考实现的差别：mate 的属性是一个扁平数组、按每项的 TypeName 分组，而 Material 的 5 类属性是
 * 5 个独立数组，所以选中项要用「类别 + 数组下标」定位。删除同类别里靠前的项会让后面各项下标前移，
 * 因此左侧列表里的下标始终是数组里的原始下标，只有删除时才跟着调整选中项。
 */

/** 左侧类别筛选：全部 + 五个属性类别 */
type FilterKind = MaterialPropKind | "all";

/** 选中项的键 */
const rowKey = (kind: MaterialPropKind, index: number) => `${kind}:${index}`;

const parseRowKey = (key: string | null): {kind: MaterialPropKind; index: number} | null => {
    if (!key) return null;
    const [kind, index] = key.split(":");
    return {kind: kind as MaterialPropKind, index: Number(index)};
};

const MaterialPropertyBrowser: React.FC<{
    asset: any;
    /** 写回单个字段，形如 {...asset, [field]: value} */
    set: (field: string, value: any) => void;
    /** 8 槽（KCES）布局放不下关键字属性，新增入口要让位给升级按钮 */
    isLegacy: boolean;
    onUpgradeLayout: () => void;
}> = ({asset, set, isLegacy, onUpgradeLayout}) => {
    const {t} = useTranslation();
    const {token} = theme.useToken();
    const [filterKind, setFilterKind] = useState<FilterKind>("all");
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<string | null>(null);
    // 悬停高亮：行的点击区域只有文字那么宽，不给鼠标反馈就看不出整行可点
    const [hovered, setHovered] = useState<string | null>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // 类别筛选与属性名搜索都作用在左侧列表上，命中项仍带原始下标
    const groups = useMemo(() => {
        const lower = search.trim().toLowerCase();
        return PropKinds
            .filter(({kind}) => filterKind === "all" || kind === filterKind)
            .map(({kind, field}) => {
                const items: any[] = asset[field] ?? [];
                const rows = items
                    .map((item, index) => ({index, name: materialPropName(kind, item?.type ?? 0)}))
                    .filter((row) => !lower || row.name.toLowerCase().includes(lower));
                return {kind, field, rows};
            });
    }, [asset, filterKind, search]);

    // 方向键的落点顺序就是左侧列表的显示顺序
    const flatKeys = useMemo(
        () => groups.flatMap(({kind, rows}) => rows.map(({index}) => rowKey(kind, index))),
        [groups],
    );

    const scrollToRow = (key: string) => {
        listRef.current?.querySelector(`[data-prop-key="${key}"]`)?.scrollIntoView({block: "nearest"});
    };

    // 上下方向键切换选中项（在搜索框里按也可以，单行输入本来用不上这两个键）
    const moveSelection = (delta: number) => {
        if (flatKeys.length === 0) return;
        const current = selected === null ? -1 : flatKeys.indexOf(selected);
        const next = Math.min(Math.max(current + delta, 0), flatKeys.length - 1);
        setSelected(flatKeys[next]);
        scrollToRow(flatKeys[next]);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            moveSelection(1);
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            moveSelection(-1);
        }
    };

    const updateItem = (field: string, index: number, next: any) => {
        const items = [...(asset[field] ?? [])];
        items[index] = next;
        set(field, items);
    };

    const removeItem = (kind: MaterialPropKind, field: string, index: number) => {
        const items = [...(asset[field] ?? [])];
        items.splice(index, 1);
        set(field, items);

        // 同类别里被删项之后的项下标都会前移，选中项跟着挪；删掉的正是自己才清空
        const current = parseRowKey(selected);
        if (current?.kind !== kind) return;
        if (current.index === index) {
            setSelected(null);
        } else if (current.index > index) {
            setSelected(rowKey(kind, current.index - 1));
        }
    };

    // 筛到某个类别就新建到该类别，「全部」下默认建一条纹理属性；8 槽没有关键字属性的位置
    const addKind: MaterialPropKind = filterKind === "all" ? "tex" : filterKind;
    const addLocked = addKind === "kw" && isLegacy;

    const addItem = () => {
        const def = PropKinds.find((prop) => prop.kind === addKind);
        if (!def) return;
        const items: any[] = asset[def.field] ?? [];
        set(def.field, [...items, def.newItem()]);
        setSelected(rowKey(addKind, items.length));
    };

    const current = parseRowKey(selected);
    const currentDef = current ? PropKinds.find((prop) => prop.kind === current.kind) : undefined;
    const currentItem = current && currentDef ? (asset[currentDef.field] ?? [])[current.index] : undefined;

    return (
        <div style={{display: "flex", gap: 12, alignItems: "flex-start", textAlign: "left"}}>
            {/* 左侧：筛选 + 搜索 + 按类别分组的列表 */}
            <div
                ref={listRef}
                tabIndex={0}
                onKeyDown={handleKeyDown}
                style={{
                    width: 300,
                    flexShrink: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    paddingRight: 8,
                    borderRight: `1px solid ${token.colorBorderSecondary}`,
                }}
            >
                <Radio.Group
                    size="small"
                    optionType="button"
                    value={filterKind}
                    onChange={(e) => setFilterKind(e.target.value)}
                    options={[
                        {label: t('MaterialAssetsEditor.sidebar_all'), value: "all"},
                        ...PropKinds.map(({kind}) => ({label: t(`MaterialAssetsEditor.${kind}`), value: kind})),
                    ]}
                />
                <Input
                    allowClear
                    placeholder={t('MaterialAssetsEditor.sidebar_search')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <div style={{maxHeight: "calc(100vh - 340px)", minHeight: 200, overflowY: "auto"}}>
                    {flatKeys.length === 0 ? (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE}
                               description={t('MaterialAssetsEditor.sidebar_no_prop')}/>
                    ) : (
                        groups.filter(({rows}) => rows.length > 0).map(({kind, field, rows}) => (
                            <div key={kind}>
                                <Divider plain style={{margin: "4px 0"}}>
                                    <Typography.Text strong>
                                        {`${t(`MaterialAssetsEditor.${kind}`)} (${rows.length})`}
                                    </Typography.Text>
                                </Divider>
                                {rows.map(({index, name}) => {
                                    const key = rowKey(kind, index);
                                    const active = key === selected;
                                    return (
                                        <div
                                            key={key}
                                            data-prop-key={key}
                                            onClick={() => {
                                                setSelected(key);
                                                // 点击后把焦点留在列表上，方向键才能接着切换
                                                listRef.current?.focus();
                                            }}
                                            onMouseEnter={() => setHovered(key)}
                                            onMouseLeave={() => setHovered(null)}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 4,
                                                padding: "2px 2px 2px 8px",
                                                marginBottom: 2,
                                                borderRadius: token.borderRadius,
                                                cursor: "pointer",
                                                background: active
                                                    ? token.controlItemBgActive
                                                    : (hovered === key ? token.colorFillTertiary : undefined),
                                            }}
                                        >
                                            <Typography.Text ellipsis={{tooltip: name}} style={{flex: 1, minWidth: 0}}>
                                                {name}
                                            </Typography.Text>
                                            <Button
                                                size="small"
                                                type="text"
                                                danger
                                                icon={<DeleteOutlined/>}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeItem(kind, field, index);
                                                }}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>
                {addLocked ? (
                    <>
                        <Alert type="info" showIcon title={t('MaterialAssetsEditor.layout_legacy_short')}/>
                        <Button block type="primary" onClick={onUpgradeLayout}>
                            {t('MaterialAssetsEditor.layout_upgrade')}
                        </Button>
                    </>
                ) : (
                    <Button block icon={<PlusOutlined/>} onClick={addItem}>
                        {`${t('MaterialAssetsEditor.add_prop')} · ${t(`MaterialAssetsEditor.${addKind}`)}`}
                    </Button>
                )}
            </div>

            {/* 右侧：只渲染选中的那一条，属性项自身按 labeled 排布 */}
            <div style={{flex: 1, minWidth: 0}}>
                {current && currentDef && currentItem !== undefined ? (
                    <div>
                        {current.kind === "kw" && isLegacy && (
                            <Alert
                                type="info"
                                showIcon
                                style={{marginBottom: 8}}
                                title={t('MaterialAssetsEditor.layout_legacy_tip')}
                                action={
                                    <Button size="small" type="primary" onClick={onUpgradeLayout}>
                                        {t('MaterialAssetsEditor.layout_upgrade')}
                                    </Button>
                                }
                            />
                        )}
                        <MaterialPropertyItem
                            kind={current.kind}
                            item={currentItem}
                            layout="labeled"
                            onChange={(next) => updateItem(currentDef.field, current.index, next)}
                            onRemove={() => removeItem(current.kind, currentDef.field, current.index)}
                        />
                    </div>
                ) : (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={t('MaterialAssetsEditor.sidebar_select_hint')}
                        style={{marginTop: 40}}
                    />
                )}
            </div>
        </div>
    );
};

export default MaterialPropertyBrowser;