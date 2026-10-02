import React from "react";
import {Button, Checkbox, Collapse, Dropdown, Input, Space, Table, Tooltip, Typography} from "antd";
import {
    DeleteOutlined,
    MinusSquareOutlined,
    PlusOutlined,
    PlusSquareOutlined,
    QuestionCircleOutlined,
    SearchOutlined,
    SettingOutlined,
} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import {Resizable} from "react-resizable";

/**
 * PresetRecordTable preset 里「记录型数组」的通用表格
 *
 * preset 的数组（properties / materialProperties / subProperties / partNames）都是同一形状的记录列表，
 * 所以抽一个组件：列由调用方给（只读展示），行可以展开出完整编辑器，支持增删。
 *
 * 用 antd 的 Table 而不是像 NeiTableEditor 那样自绘虚拟表格：这里单元格是只读文本、
 * 只有展开行里才有输入控件，几百行不会卡；而 antd Table 自带展开行，省掉一整套自绘逻辑。
 * 需要横向滚动时给 scroll.x，给了 maxHeight 就固定表头、表格内部纵向滚动。
 *
 * 关于虚拟滚动（virtual）与展开行共存 —— 曾担心「展开行高度算不准」而放弃 virtual，
 * 但读 @rc-component/table@1.11.1 的 VirtualTable/BodyLine.js 后确认这个顾虑不成立：
 * rowSupportExpand 时行节点与展开行被包在同一个 <div ref={ref}> 里，
 * 由虚拟列表的 useHeights 按 offsetHeight 实测高度（useGetSize 按 key 累积真实高度），
 * 支持动态高度。限制是 scroll.x / scroll.y 必须是 number（否则 dev 警告并兜底 1 / 500），
 * 所以这里按各列 width 求和算出数值总宽。
 *
 * 表头（colTitle）做成 antd Collapse 的折叠栏：内容多时可以把整张表收起来。
 * 注意 Collapse 的 header 是整块可点区域，里面的按钮要 stopPropagation，
 * 否则「添加一行」会顺带把面板折叠掉。
 */

/**
 * 单元格取值：记录 → 用于排序/筛选的原始值
 * 排序比较的是原始值（数字按大小、字符串按字典序），而不是渲染后的 ReactNode
 */
export type RecordCellValue = (record: any) => any;

export interface RecordColumn {
    key: string;
    title: string;
    /**
     * 列标题后的问号 tooltip：字段说明
     *
     * 必须是独立挂载点，不能复用 Typography.Text 的 ellipsis.tooltip ——
     * antd 的 EllipsisTooltip 是 disabled: !isEllipsis，只有文字真的被截断才启用，
     * 短列名在 80~110px 的列里永远不会截断，说明就永远看不到。
     * 所以这里用 <Tooltip><QuestionCircleOutlined/></Tooltip> 显式挂。
     */
    titleTip?: string;
    width?: number;
    /** 拖拽调整列宽时的下限（px）；不给按全局默认 DefaultMinColumnWidth 算 */
    minWidth?: number;
    /**
     * 不允许拖拽调整列宽
     * 展开列 / 操作列这类固定宽度的列要禁止，否则拖动它们没有意义
     */
    resizable?: false;
    /**
     * 单元格内容
     * 只读列忽略 update；需要就地编辑的列（如 partNames 的名字）用 update 写回本行
     */
    render: (record: any, index: number, update: (next: any) => void) => React.ReactNode;
    /**
     * 排序/筛选用的原始取值器
     * 给了 value 才允许挂 sorter / filters —— 因为单元格可能是 Tag、按钮这类节点，
     * 光看 render 结果没法比大小。
     */
    value?: RecordCellValue;
    /** 是否可排序；给了 value 才生效 */
    sortable?: boolean;
    /**
     * 是否启用下拉筛选（多选，带搜索框）
     * 选项由当前数据里的去重值自动生成，不需要调用方手工列。
     */
    filterable?: boolean;
    /** 筛选选项的显示名，默认用原始字符串 */
    filterLabel?: (value: any) => string;
    /**
     * 默认不显示这一列（可在「列出」下拉里随时打开）
     * 主表 12 列太宽，fileName / defaultValue 这类平时用不到的默认收起来。
     */
    defaultHidden?: boolean;
    /** 不允许在「列出」下拉里隐藏（如主键列） */
    alwaysVisible?: boolean;
}

interface PresetRecordTableProps {
    /** 表格标题，条数会附在后面 */
    title: string;
    items: any[];
    columns: RecordColumn[];
    onChange: (next: any[]) => void;
    /** 新增一项的模板 */
    newItem: () => any;
    /** 新增按钮文案 */
    addLabel: string;
    /** 展开行渲染器；不给则该表不可展开 */
    renderExpanded?: (record: any, update: (next: any) => void, index: number) => React.ReactNode;
    /** 表格最大高度（px），给了就固定表头并在内部滚动 */
    maxHeight?: number;
    /** 不显示删除按钮（如 partNames 这种定长的表） */
    readOnlyRows?: boolean;
    /** 启用虚拟滚动；行数多的大表打开，几百行以下没必要 */
    virtual?: boolean;
}

/** 排序比较：数字按大小、其余按字符串；null/undefined 排最后 */
function compareValues(a: any, b: any): number {
    const aEmpty = a === null || a === undefined || a === "";
    const bEmpty = b === null || b === undefined || b === "";
    if (aEmpty && bEmpty) {
        return 0;
    }
    if (aEmpty) {
        return 1;
    }
    if (bEmpty) {
        return -1;
    }
    const aNum = typeof a === "number" ? a : Number(a);
    const bNum = typeof b === "number" ? b : Number(b);
    if (Number.isFinite(aNum) && Number.isFinite(bNum)) {
        return aNum - bNum;
    }
    return String(a).localeCompare(String(b));
}

/** 筛选键：把任意值归一成稳定字符串（null/undefined 归到哨兵键） */
function filterKeyOf(value: any): string {
    if (value === null || value === undefined) {
        return "\u0000null";
    }
    return `${typeof value}:${String(value)}`;
}

/** 筛选项展示文案 */
function filterTextOf(value: any): string {
    if (value === null || value === undefined || value === "") {
        return "—";
    }
    if (typeof value === "boolean") {
        return String(value);
    }
    return String(value);
}

/** 列宽下限：太窄了排序/筛选图标会挤成一团 */
const DefaultMinColumnWidth = 60;
/** 列宽上限：避免一列被拖到整屏宽，把别的列全挤没 */
const MaxColumnWidth = 900;

/**
 * 可拖拽调宽的表头单元格（用 react-resizable 实现）
 *
 * 为什么用库：antd 6.6.5 的 Table 没有内置列宽拖拽 —— 在整个 antd/es/table 里
 * grep resiz 零命中（rc-table 1.11.1 也没有），官方文档的「可伸缩列」示例就是引
 * react-resizable 自己包一层。官方都这么做，跟着走比手写稳妥：
 * 库替我们处理了 pointer 捕获、浏览器兼容、touch-action、拖拽期间的
 * user-select: none 与光标、transformScale 换算等一堆边角。
 *
 * 集成方式：把 <th> 的内容整体包进 <Resizable>。
 * 注意 Resizable 必须有个带尺寸的单一子元素（它给 child 注入 style），
 * 所以这里用一层 <div> 承载内容与把手，而不是直接包 <th>（th 是 table-cell，
 * 尺寸由表格布局决定，包它会把 colgroup 的宽度也一起改掉）。
 *
 * 这个组件是全局注册的（components.header.cell），也就是说每一列表头都会渲染它，
 * 包括展开列 / 操作列 / 没给 width 的列。所以「是否可拖」不能靠组件外部区分，
 * 只能靠 onResize 是否存在来判断 —— 只有可拖的列才会在 onHeaderCell 里塞进 onResize。
 * 早期版本无条件渲染把手，结果每列表头都长出了把手（探针抓出来的）。
 */
const ResizableHeaderCell: React.FC<{
    /** 可拖列才有；没有就退化成普通表头单元格 */
    onResize?: (nextWidth: number) => void;
    /** 本列的数值宽度，作为拖拽起点 */
    width?: number;
    minWidth?: number;
    children?: React.ReactNode;
} & React.ThHTMLAttributes<HTMLTableCellElement>> = ({
                                                          width,
                                                          minWidth,
                                                          onResize,
                                                          children,
                                                          style,
                                                          ...rest
                                                      }) => {
    const currentWidth = width ?? DefaultMinColumnWidth;

    // 没拿到 onResize（展开列 / 操作列 / 无宽度列）→ 就是普通表头
    const resizable = typeof onResize === "function" && typeof width === "number";

    // 不可拖的列：原样渲染，不加多余包裹层
    if (!resizable) {
        return <th {...rest} style={style}>{children}</th>;
    }

    /**
     * 用 <Resizable> 包住内层 div，而不是直接包 <th>：
     * Resizable 会给子元素注入 style={{width}}，如果包 th 会把单元格宽度
     * 从表格布局手里抢过来，和 colgroup 打架。包内层 div 就只影响内容区，
     * 实际列宽仍由写进列定义的 width（+ widthOverrides）驱动。
     */
    return (
        <th {...rest} style={{...style, padding: 0}}>
            <Resizable
                width={currentWidth}
                height={0}
                axis="x"
                // 只留右边一个把手：列宽调整只该从右边界拖
                resizeHandles={["e"]}
                minConstraints={[minWidth ?? DefaultMinColumnWidth, 0]}
                maxConstraints={[MaxColumnWidth, Infinity]}
                onResize={(_e, data) => onResize!(Math.round(data.size.width))}
                // 双击把手恢复列定义里的原始宽度
                handle={(handleAxis, ref) => (
                    <span
                        ref={ref as React.Ref<HTMLSpanElement>}
                        className={`preset-col-resizer preset-col-resizer-${handleAxis}`}
                        role="separator"
                        aria-orientation="vertical"
                        onDoubleClick={(e) => {
                            e.stopPropagation();
                            onResize!(width);
                        }}
                    />
                )}
            >
                {/* antd 表头默认 8px 内边距，这里挪到内层 div 上，让把手能贴到单元格真正的边上。
                    position: relative 是给把手的定位上下文：把手是 position: absolute; right: -3px，
                    没有它就会一路向上找定位祖先、堆到表格边缘（表现为「看不到把手」）。
                    库自带的 .react-resizable{position:relative} 本项目没引入，不能指望它；
                    这里之前是靠 antd 给 th 设的 position: relative 才碰巧正常，
                    补成显式声明后就不依赖 antd 内部样式了。 */}
                <div
                    className="preset-col-resizer-inner"
                    style={{
                        position: "relative",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        overflow: "hidden",
                    }}
                >
                    {children}
                </div>
            </Resizable>
        </th>
    );
};

const PresetRecordTable: React.FC<PresetRecordTableProps> = ({
                                                                 title,
                                                                 items,
                                                                 columns,
                                                                 onChange,
                                                                 newItem,
                                                                 addLabel,
                                                                 renderExpanded,
                                                                 maxHeight,
                                                                 readOnlyRows = false,
                                                                 virtual = false,
                                                             }) => {
    const {t} = useTranslation();

    /**
     * 行 id 按「位置」给，而不是按对象身份：编辑一行会生成新对象，若用对象身份当 key，
     * React 会把它当成新行重建，antd Table 记的展开状态也就跟着丢了。
     * 同时 antd 已废弃 rowKey 函数带 index 参数（rowKey.length > 1 会告警），
     * 所以这里把 id 注入到数据源副本上、rowKey 直接传字段名。
     * 这个字段只在渲染用，写回前会被 stripRowId 摘掉，不会进文件。
     */
    const dataSource = React.useMemo(
        () => items.map((record, index) => ({...record, __rowId: `r${index}`})),
        [items],
    );

    /**
     * 搜索关键词（属性表 / 部件名表可能有几百行，需要检索）
     *
     * 只过滤 dataSource，绝不动 items。
     * 因为 __rowId 是按「原始下标」生成的（r0、r1…），写回时从它反解原下标。
     * 若把 items 也过滤掉，下标就会错位 —— 编辑搜索结果的第 0 行会改到别的记录上。
     */
    const [keyword, setKeyword] = React.useState("");
    const trimmedKeyword = keyword.trim().toLowerCase();

    /**
     * 可搜索列的取值器列表。
     *
     * 调用方传进来的 columns 是内联数组字面量，每次渲染都是新引用；
     * 直接把它当 useMemo 依赖会让缓存在每次渲染都失效。
     * 这里用列 key 拼成的签名做真正的依赖，取值器本身另存一份。
     * （取值器是闭包，取值结果只与 record 有关，签名不变就可以安全复用。）
     */
    const searchSignature = columns.map((column) => column.key).join("\u0001");
    const searchable = React.useMemo(
        () => columns.filter((column) => column.value).map((column) => column.value!),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [searchSignature],
    );

    /**
     * 搜索命中判断：把该行所有「可搜索列」的原始值转成字符串，包含关键词即命中。
     * 用 value 取值器而不是 render 结果 —— 单元格可能是 Tag / 按钮这类节点，没法搜。
     * 注意包含 defaultHidden 的列：搜 fileName 的值时，即使该列被收起也应该能命中。
     */
    const visibleDataSource = React.useMemo(() => {
        if (!trimmedKeyword) {
            return dataSource;
        }
        return dataSource.filter((record) =>
            searchable.some((getValue) => {
                const raw = getValue(record);
                if (raw === null || raw === undefined) {
                    return false;
                }
                return String(raw).toLowerCase().includes(trimmedKeyword);
            }),
        );
    }, [dataSource, searchable, trimmedKeyword]);

    const searchActive = trimmedKeyword !== "";

    const stripRowId = (record: any) => {
        const copy = {...(record ?? {})};
        delete copy.__rowId;
        return copy;
    };

    /**
     * 下标一律按 __rowId 反解，不要用 antd 传进来的 index。
     *
     * 排序 / 筛选之后 antd 的 dataIndex 下标就与 items 对不上了：
     * - 非虚拟表：Body/index.js 传下去的 renderIndex 是 pageData（已排序+已筛选）里的下标；
     * - 虚拟表：BodyGrid 把 data 扁平化后也只传扁平下标。
     * 行 id 是由「原始下标」生成的（r0、r1…），所以从 __rowId 反解出来的一定是原下标。
     */
    const indexOfRowId = (rowId: any): number => {
        const matched = /^r(\d+)$/.exec(String(rowId ?? ""));
        return matched ? Number(matched[1]) : -1;
    };

    const updateAt = (index: number, next: any) => {
        if (index < 0 || index >= items.length) {
            return;
        }
        const copy = items.slice();
        copy[index] = stripRowId(next);
        onChange(copy);
    };
    const removeAt = (index: number) => {
        if (index < 0 || index >= items.length) {
            return;
        }
        onChange(items.filter((_, i) => i !== index));
    };
    const append = () => onChange([...items, newItem()]);

    /**
     * 展开状态自己管（受控），不用 antd 自动插入的展开列 —— 原因见下面 tableColumns 的注释。
     * key 用 __rowId（位置 id），所以增删行之后展开的还是同一「位置」，行为可预期。
     */
    const [expandedRowIds, setExpandedRowIds] = React.useState<Set<string>>(() => new Set());
    const toggleExpand = (rowId: string) => {
        setExpandedRowIds((prev) => {
            const next = new Set(prev);
            if (next.has(rowId)) {
                next.delete(rowId);
            } else {
                next.add(rowId);
            }
            return next;
        });
    };

    /**
     * 列显示状态（列出下拉）
     * 默认值从列定义的 defaultHidden 初始化；alwaysVisible 的列不给开关。
     * 注意：这里只影响展示，不影响排序/筛选所依赖的 value 取值器。
     */
    const [hiddenKeys, setHiddenKeys] = React.useState<Set<string>>(
        () => new Set(columns.filter((c) => c.defaultHidden && !c.alwaysVisible).map((c) => c.key)),
    );
    const toggleColumn = (key: string, visible: boolean) => {
        setHiddenKeys((prev) => {
            const next = new Set(prev);
            if (visible) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    /** 「列出」下拉的选项：alwaysVisible 的列不给开关，始终显示 */
    const columnToggleItems = columns
        .filter((column) => !column.alwaysVisible)
        .map((column) => ({
            key: column.key,
            // 勾选状态由 Checkbox 表达，菜单项本身不要再高亮（CSS 见 style.css）
            label: (
                <Checkbox
                    checked={!hiddenKeys.has(column.key)}
                    onChange={(e) => toggleColumn(column.key, e.target.checked)}
                >
                    {column.title}
                </Checkbox>
            ),
        }));

    /**
     * 用户拖拽后的列宽覆盖值（key = 列 key）
     *
     * 为什么不直接改 columns：columns 是调用方每轮新建的内联数组，
     * 改它等于没改（下一轮渲染就被覆盖回去）。所以宽度状态由本组件自己持有，
     * 渲染时以「覆盖值 ?? 列定义里的 width」为准。
     *
     * 这个 state 必须参与 totalWidth 的计算：虚拟表的 scroll.x 是数值，
     * 如果只改列的 width 而不更新 scroll.x，拖宽后的列会被 scroll.x 裁掉（内容看不全）。
     */
    const [widthOverrides, setWidthOverrides] = React.useState<Record<string, number>>({});

    /** 某一列当前生效的宽度 */
    const widthOf = (column: RecordColumn): number | undefined =>
        widthOverrides[column.key] ?? column.width;

    /** 拖拽中只更新 state（连续触发，不做持久化） */
    const resizeColumn = (key: string, nextWidth: number) => {
        setWidthOverrides((prev) => (prev[key] === nextWidth ? prev : {...prev, [key]: nextWidth}));
    };

    /**
     * 筛选选项：从当前数据里现取去重值
     * 不用调用方手写选项列表，改数据也就自动跟着变。
     */
    const buildFilters = (column: RecordColumn) => {
        if (!column.filterable || !column.value) {
            return undefined;
        }
        const seen = new Map<string, {text: string; value: string}>();
        items.forEach((record) => {
            const raw = column.value!(record);
            const key = filterKeyOf(raw);
            if (!seen.has(key)) {
                seen.set(key, {
                    text: column.filterLabel ? column.filterLabel(raw) : filterTextOf(raw),
                    value: key,
                });
            }
        });
        return Array.from(seen.values()).sort((a, b) => a.text.localeCompare(b.text));
    };

    /**
     * 预先把各列的筛选项算好，缓存起来。
     *
     * 为什么必须缓存：构建筛选项要逐列扫描全部行（实测 332 行 × 14 个可筛选列 ≈ 0.96ms），
     * 这部分只跟 items 与列定义有关，和搜索关键词毫无关系。
     * 不缓存的话，搜索框每敲一个字符都会白算一遍。
     *
     * 依赖同样用列签名而不是 columns 本身（columns 是调用方每轮新建的），
     * 另外加上 items（数据变了选项要跟着变）。hint 用 filterLabel／filterable 的签名，
     * 保证调用方改了这两项也能刷新。
     */
    const filtersSignature = columns
        .map((column) => `${column.key}:${column.filterable ? 1 : 0}:${column.filterLabel ? 1 : 0}`)
        .join("\u0001");
    const filterOptionsByKey = React.useMemo(() => {
        const map = new Map<string, ReturnType<typeof buildFilters>>();
        columns.forEach((column) => {
            if (column.filterable && column.value) {
                map.set(column.key, buildFilters(column));
            }
        });
        return map;
    }, [items, filtersSignature]); // eslint-disable-line react-hooks/exhaustive-deps

    /**
     * 展开列必须自己显式声明（配 expandable.showExpandColumn: false），
     * 不能用 rc-table 自动插入的那一列。
     *
     * 原因：自动插入的展开列 width 是 undefined（Table.js 调 useColumns 时没传 columnWidth），
     * 而虚拟表要求 scroll.x 是数值 → useColumns 里的 useWidthColumns 被激活，
     * 它会把「没有 width 的列」按剩余空间重算。数据列已经占满 scroll.x，
     * 于是展开列被算成 1px，展开三角被挤扁看不出是个按钮。
     * （非虚拟表 scroll.x 传的是 max-content，不走这个分支，宽度由 CSS 的
     * tableExpandColumnWidth = checkboxSize + padding*2 = 48px 决定，所以之前看不出问题。）
     *
     * 解法：自己声明一个带 width 的列，并关掉 rc-table 的自动展开列。
     * 代价是展开状态要自己受控维护（见上面的 expandedRowIds）。
     */
    const ExpandColumnWidth = 48;

    const tableColumns = [
        ...(renderExpanded ? [{
            key: "__expand",
            title: "",
            width: ExpandColumnWidth,
            className: "ant-table-row-expand-icon-cell",
            // 表头单元格留空（样式见 style.css 的 .preset-expand-col-header）
            onHeaderCell: () => ({className: "preset-expand-col-header"}),
            render: (_: any, record: any) => {
                const rowId = record?.__rowId;
                const expanded = expandedRowIds.has(rowId);
                return (
                    <Button
                        type="text"
                        size="small"
                        className="preset-expand-col-button"
                        aria-label={expanded ? t('PresetEditor.collapse_row') : t('PresetEditor.expand_row')}
                        aria-expanded={expanded}
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(rowId);
                        }}
                        icon={expanded
                            ? <MinusSquareOutlined/>
                            : <PlusSquareOutlined/>}
                    />
                );
            },
        }] : []),
        ...columns.filter((column) => !hiddenKeys.has(column.key)).map((column) => {
            const width = widthOf(column);
            const resizable = column.resizable !== false && typeof width === "number";
            return {
                key: column.key,
                title: column.titleTip ? (
                    <Space size={4}>
                        {column.title}
                        <Tooltip title={column.titleTip} styles={{root: {maxWidth: 400}}}>
                            <QuestionCircleOutlined style={{opacity: 0.55, cursor: "help"}}/>
                        </Tooltip>
                    </Space>
                ) : column.title,
                width,
                ellipsis: true,
                /**
                 * 列宽拖拽：用 onHeaderCell 把表头单元格换成带拖拽把手的版本。
                 *
                 * 虚拟表下 onHeaderCell 返回的 props 会原样落到 <th> 上，
                 * 而 useWidthColumns 是按列定义里的 width 算 colgroup 的 —— 两者不冲突：
                 * 我们通过把 widthOverrides 写进列 width（上面那行 width）来驱动实际列宽，
                 * 这里只负责「把手」这个交互层。
                 */
                ...(resizable
                    ? {
                        onHeaderCell: () => ({
                            width: width as number,
                            minWidth: column.minWidth ?? DefaultMinColumnWidth,
                            // 拖拽中连续更新 state；结束时不需要额外动作（宽度已在 state 里）
                            onResize: (nextWidth: number) => resizeColumn(column.key, nextWidth),
                        }),
                    }
                    : {}),
                ...(column.sortable && column.value
                    ? {
                        sorter: (a: any, b: any) => compareValues(column.value!(a), column.value!(b)),
                        // 在表头显示排序方向提示；文案沿用 antd 语言包
                        showSorterTooltip: true,
                    }
                    : {}),
            ...(column.filterable && column.value
                ? {
                    // 取预计算好的结果，不要在渲染里现算（每轮都要扫全部行）
                    filters: filterOptionsByKey.get(column.key),
                    filterMultiple: true,
                    filterSearch: true,
                    onFilter: (selected: any, record: any) =>
                        filterKeyOf(column.value!(record)) === selected,
                }
                : {}),
            // 下标从 __rowId 反解，排序/筛选后照样写对行
            render: (_: any, record: any) =>
                column.render(record, indexOfRowId(record?.__rowId), (next: any) =>
                    updateAt(indexOfRowId(record?.__rowId), next)),
            };
        }),
        ...(readOnlyRows ? [] : [{
            key: "__actions",
            title: "",
            width: 48,
            align: "center" as const,
            render: (_: any, record: any) => (
                <Tooltip title={t('NeiEditor.delete_row')}>
                    <Button type="text" size="small" danger icon={<DeleteOutlined/>}
                            onClick={() => removeAt(indexOfRowId(record?.__rowId))}/>
                </Tooltip>
            ),
        }]),
    ];

    /**
     * 虚拟表要求 scroll.x / scroll.y 是数值，否则 @rc-component/table 会 dev 警告并兜底成 1 / 500。
     * 这里按各列 width 求和算总宽；没给 width 的列按 antd 的默认列宽容错。
     *
     * 必须把 widthOverrides 纳进依赖：用户拖宽一列后，scroll.x 要跟着变大，
     * 否则多出来的宽度会被 scroll.x 裁掉（虚拟表按 scroll.x 生成 colgroup）。
     */
    const totalWidth = React.useMemo(
        () => tableColumns.reduce((sum, column) => sum + ((column as any).width || 120), 0),
        // tableColumns 每次渲染都是新数组，这里只关心列定义本身的变化
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [columns, readOnlyRows, renderExpanded, hiddenKeys, widthOverrides],
    );

    const scroll = virtual
        ? {x: totalWidth, y: maxHeight ?? 560}
        : {x: "max-content" as const, ...(maxHeight ? {y: maxHeight} : {})};

    /**
     * 头部按钮区
     * Collapse 的 header 整块可点，按钮必须 stopPropagation，否则点「添加」会连面板一起折叠。
     * 按钮放在点不到的时候就退化成 header 文案里的条数提示（title 本身已带条数）。
     */
    const headerExtra = (
        <Space size={8} onClick={(e) => e.stopPropagation()}>
            <Input
                size="small"
                allowClear
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={t('PresetEditor.search_placeholder')}
                prefix={<SearchOutlined style={{color: "rgba(0,0,0,0.35)"}}/>}
                style={{width: 180}}
            />
            {!readOnlyRows && (
                <Button size="small" icon={<PlusOutlined/>} onClick={append}>{addLabel}</Button>
            )}
            {columnToggleItems.length > 0 && (
                /**
                 * 不能用 popupRender 返回裸 <div> 来装这些 Checkbox。
                 * 带背景、边框、阴影、圆角的是 .ant-dropdown-menu（由 Menu 组件渲染），
                 * popupRender 是整体替换 overlayNode，替换掉就只剩一个没有背景的 div。
                 *
                 * 改用 menu 让 antd 自己渲染菜单容器；label 里放 Checkbox 表达勾选。
                 * 点菜单项默认会关闭下拉，这里靠 menu.selectable + menu.multiple 绕过：
                 * antd 的 onMenuClick 里 if (menu?.selectable && menu?.multiple) return;
                 * ——只有「可选中且多选」时才不关闭，正好是复选框的场景。
                 * 菜单项自身的高亮用 CSS 压掉（勾选状态已由 Checkbox 表达）。
                 */
                <Dropdown
                    trigger={["click"]}
                    placement="bottomLeft"
                    menu={{
                        items: columnToggleItems,
                        selectable: true,
                        multiple: true,
                        className: "preset-column-toggle-menu",
                    }}
                >
                    <Tooltip title={t('PresetEditor.column_settings_tip')}>
                        <Button size="small" icon={<SettingOutlined/>}/>
                    </Tooltip>
                </Dropdown>
            )}
        </Space>
    );

    const table = (
        <Table
            size="small"
            rowKey="__rowId"
            columns={tableColumns as any}
            dataSource={visibleDataSource}
            pagination={false}
            virtual={virtual}
            /**
             * 把表头单元格换成可拖拽调宽的版本。
             * 注意这里只替换 header.cell，body.cell 保持 rc-table 默认 ——
             * 把手属于表头，替换 body 反而会破坏虚拟表的行渲染。
             */
            components={{header: {cell: ResizableHeaderCell as any}}}
            locale={{
                // 搜索无结果时的文案要和「真的没数据」区分开
                emptyText: searchActive
                    ? t('PresetEditor.search_no_result')
                    : t('NeiEditor.empty_table'),
                // 其余筛选/排序文案沿用 antd 内置语言包，只覆盖「无筛选项」这类中文兜底
                filterEmptyText: t('PresetEditor.filter_empty'),
            }}
            scroll={scroll}
            expandable={renderExpanded ? {
                // 受控展开：因为展开列是自己声明的，得自己维护状态
                expandedRowKeys: Array.from(expandedRowIds),
                showExpandColumn: false,
                expandedRowRender: (record: any) =>
                    renderExpanded(
                        record,
                        (next) => updateAt(indexOfRowId(record?.__rowId), next),
                        indexOfRowId(record?.__rowId),
                    ),
            } : undefined}
        />
    );

    return (
        <Collapse
            defaultActiveKey={["table"]}
            ghost
            size="small"
            className="preset-table-collapse"
            items={[{
                key: "table",
                // 条数放标题里，收起后也能看到。搜索时显示「命中 / 总数」，一眼看出被过滤掉多少
                label: (
                    <Typography.Text strong>
                        {searchActive
                            ? t('PresetEditor.search_count', {
                                count: visibleDataSource.length,
                                total: dataSource.length,
                            })
                            : `${title}（${items.length}）`}
                    </Typography.Text>
                ),
                extra: headerExtra,
                children: table,
            }]}
        />
    );
};

export default PresetRecordTable;
