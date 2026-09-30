import React from "react";
import {Alert, Collapse, Input, Select, Space, Switch, Tag, theme, Tooltip, Typography} from "antd";
import {CaretDownOutlined, CaretRightOutlined, QuestionCircleOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import JsonObjectForm from "../common/JsonObjectForm";
import {
    CurveDataField,
    InstanceRefList,
    InstanceRefTag,
    isCurveData,
    isInstanceRef,
    isToggleValue,
    isUnityCurve,
    isVector,
    RangedNumber,
    ToggleValueField,
    UnityCurveField,
    Vector3Field,
} from "./magicaClothFields";
import {
    enumOptionsFor,
    FullyIgnoredGroups,
    isIgnoredPath,
    magicaEnumLabelKey,
    MagicaGroups,
    numberMetaFor,
    splitIntoGroups,
} from "../../utils/magicaClothMeta.ts";

/**
 * MagicaClothForm MagicaCloth2 ClothSerializeData 表单（.db2conf / .dsb2conf / .dsl2conf 的载荷）
 *
 * 字段元数据（枚举取值、clamp 范围、出厂默认值、加载时被忽略的成员）在 magicaClothMeta.ts，
 * 全部按游戏源码考证；控件在 magicaClothFields.tsx。
 *
 * 渲染规则按 JSON 路径决定，而不是按值形状猜：
 * - 有枚举表的整数 → 下拉框（标签是源码里的枚举名）
 * - 有 clamp 范围的数值 → 拖动条 + 数字框，提示里带范围与出厂默认值
 * - CurveSerializeData / CheckSliderSerializeData / AnimationCurve → 各自的组合控件
 * - 场景对象引用（instanceID）只读展示
 * 顶层成员按用途分组进折叠面板，运行时真正生效的参数排在前面。
 *
 * 层级展示：顶层成员要么是普通字段，要么是「容器」（inertiaConstraint / cullingSettings 这类纯对象）。
 * 容器自己没有控件，所以渲染成一整行的小节标题（可折叠、默认展开）+ 子字段整体缩进 14px，
 * 所有字段行共用同一个 260px 标签列。早期版本把子字段塞进容器行右侧的 210px 次级列里，
 * 结果是容器名和子字段左右并排、层级看不出来，子标签还被省略号截断。
 * 分组下只有一个容器、且它的译名与分组名重复时（惯性 / 风），容器标题交给分组面板承担。
 *
 * 性能：这份文档展开后有 50 多个拖动条、80 多个数字框和 3 个关键帧编辑器，
 * 整棵树重渲染一次实测 ~220ms（无头环境，最坏 500ms+），拖动时每帧重渲染根本没法用。
 * 所以写回走「按路径改一处 + 逐行 memo」：改一个成员只会新建它到根的那条链上的对象，
 * 兄弟子树的对象保持同一引用，memo 后整支跳过重渲染。
 */

/** 沿路径做不可变更新，只重建路径上的对象，兄弟成员保持原引用 */
function updateAtPath(root: any, path: string[], next: any): any {
    if (path.length === 0) {
        return next;
    }
    const [head, ...rest] = path;
    const child = updateAtPath(root?.[head], rest, next);
    if (Array.isArray(root)) {
        const copy = [...root];
        copy[Number(head)] = child;
        return copy;
    }
    return {...root, [head]: child};
}

/** 写回入口：整棵树共用一个稳定的按路径写回函数，逐行 memo 才生效 */
type SetAtPath = (path: string, next: any) => void;

const SetterContext = React.createContext<SetAtPath>(() => undefined);

/** 标签列宽：容器改成小节标题后，所有字段行共用同一列宽 */
const LabelWidth = 260;

/**
 * rendersChildren 该成员会不会由 FieldList 递归渲染成子行
 * 即「纯对象」且不是向量 / 曲线 / 开关值 / 场景引用这些由专用控件吃掉的形状
 * 与 ValueControl 末尾的 object 分支保持一致
 */
function rendersChildren(value: any): boolean {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return false;
    }
    return !isInstanceRef(value) && !isVector(value) && !isCurveData(value)
        && !isToggleValue(value) && !isUnityCurve(value);
}

/** ValueControl 按路径与值渲染一个成员的控件 */
const ValueControl: React.FC<{
    value: any;
    path: string;
    onChange: (next: any) => void;
}> = ({value, path, onChange}) => {
    const {t} = useTranslation();

    if (value === null || value === undefined) {
        return (
            <Tooltip title={t('JsonForm.null_value_tip')}>
                <Tag>null</Tag>
            </Tooltip>
        );
    }
    if (typeof value === "boolean") {
        return <Switch size="small" checked={value} onChange={(checked) => onChange(checked)}/>;
    }
    if (typeof value === "number") {
        const options = enumOptionsFor(path, (name) => {
            const key = magicaEnumLabelKey(name);
            return t(key, {defaultValue: ""}) || null;
        });
        if (options) {
            // 数据里出现枚举外的值时补一个选项，避免下拉框显示空白把原值悄悄改掉
            const withUnknown = options.some((option) => option.value === value)
                ? options : [...options, {label: `#${value}`, value}];
            return (
                <Select
                    size="small"
                    style={{width: 240}}
                    value={value}
                    options={withUnknown}
                    showSearch={{optionFilterProp: "label"}}
                    styles={{popup: {root: {textAlign: "left"}}}}
                    onChange={(next) => onChange(next)}
                />
            );
        }
        return <RangedNumber value={value} meta={numberMetaFor(path)} onChange={onChange}/>;
    }
    if (typeof value === "string") {
        return <Input size="small" style={{maxWidth: 280}} value={value}
                      onChange={(e) => onChange(e.target.value)}/>;
    }
    if (isInstanceRef(value)) {
        return <InstanceRefTag value={value}/>;
    }
    if (isVector(value)) {
        return <Vector3Field value={value} onChange={onChange}/>;
    }
    if (isCurveData(value)) {
        return <CurveDataField value={value} meta={numberMetaFor(`${path}.value`)} onChange={onChange}/>;
    }
    if (isToggleValue(value)) {
        return <ToggleValueField value={value} meta={numberMetaFor(`${path}.value`)} onChange={onChange}/>;
    }
    if (isUnityCurve(value)) {
        return <UnityCurveField value={value} onChange={onChange}/>;
    }
    if (Array.isArray(value)) {
        if (value.length === 0) {
            return <Typography.Text type="secondary">{t('JsonForm.empty_array')}</Typography.Text>;
        }
        if (value.every(isInstanceRef)) {
            return <InstanceRefList value={value}/>;
        }
        return <JsonObjectForm value={value} onChange={onChange} defaultExpandDepth={0}/>;
    }
    if (typeof value === "object") {
        return <FieldList value={value} pathPrefix={path}/>;
    }
    return <Tag>{String(value)}</Tag>;
};

/**
 * FieldRow 一行「字段名 + 控件」，被忽略的成员额外挂一个标记
 * 标签走 MagicaClothEditor.<路径> 翻译（路径里的 . 换成 __，因为 i18next 以 . 分隔），
 * 没有翻译的成员回退成原始字段名；说明挂在标签后面的问号图标上 ——
 * 不能用 Typography 的 ellipsis tooltip，那个只在文字被截断时才启用
 * memo 的意义在于：改一个成员只会让它到根的那条链变化，其余行的 value 引用不变，整行跳过重渲染
 */
const FieldRow = React.memo<{
    name: string;
    path: string;
    value: any;
    ignored: boolean;
    labelWidth: number;
}>(({name, path, value, ignored, labelWidth}) => {
    const {t} = useTranslation();
    const setAtPath = React.useContext(SetterContext);
    // path 与 setAtPath 都稳定，所以这个回调也稳定，子控件不会因为父级重渲染而失效
    const onChange = React.useCallback((next: any) => setAtPath(path, next), [setAtPath, path]);

    const key = path.replace(/\./g, "__");
    const label = t(`MagicaClothEditor.${key}`, {defaultValue: name});
    const tip = t(`MagicaClothEditor.${key}_tip`, {defaultValue: ""});

    return (
        <div style={{display: "flex", alignItems: "flex-start", gap: 8, minHeight: 28, marginBottom: 2}}>
            <div style={{width: labelWidth, flexShrink: 0, textAlign: "left", paddingTop: 3}}>
                <Space size={4}>
                    {/* 标签的 tooltip 只在自己被截断时显示完整标签名（与 formControls 的 Row 一致）；
                        字段说明一律只在问号图标上，避免同一段说明在两处各弹一次 */}
                    <Typography.Text ellipsis={{tooltip: label}}
                                     style={{maxWidth: labelWidth - (ignored ? 26 : 0) - (tip ? 22 : 0)}}>
                        {label}
                    </Typography.Text>
                    {tip && (
                        <Tooltip title={tip} styles={{root: {maxWidth: 400}}}>
                            <QuestionCircleOutlined style={{color: "rgba(128,128,128,0.85)", cursor: "help"}}/>
                        </Tooltip>
                    )}
                    {ignored && (
                        <Tooltip title={t('MagicaClothEditor.ignored_tip')}>
                            <Tag style={{marginInlineEnd: 0, cursor: "help"}}>
                                {t('MagicaClothEditor.ignored_tag')}
                            </Tag>
                        </Tooltip>
                    )}
                </Space>
            </div>
            <div style={{flex: 1, minWidth: 0, textAlign: "left"}}>
                <ValueControl value={value} path={path} onChange={onChange}/>
            </div>
        </div>
    );
});

FieldRow.displayName = "MagicaFieldRow";

/**
 * ContainerSection 容器成员渲染成「小节标题 + 子字段全宽行」
 *
 * 容器（inertiaConstraint / cullingSettings 这类）自己没有控件，原来却占着 260px 的标签列，
 * 把子字段挤到右边一个 210px 的次级列里 —— 容器名和子字段是左右并排，层级完全没表达出来，
 * 子标签还因为列窄被省略号截断。现在容器占一整行当小节标题，子字段回到标准列宽。
 * 标题可点击折叠，默认展开。
 *
 * hideHeader：分组下只有这一个容器、且它的译名与分组名重复时（惯性 / 风），
 * 标题交给分组面板承担，避免连着两行一样的字；此时容器说明由分组面板显示
 */
const ContainerSection: React.FC<{
    name: string;
    path: string;
    value: Record<string, any>;
    suppressIgnoredTag?: boolean;
    hideHeader?: boolean;
}> = ({name, path, value, suppressIgnoredTag, hideHeader}) => {
    const {t} = useTranslation();
    const {token} = theme.useToken();
    const [open, setOpen] = React.useState(true);

    const key = path.replace(/\./g, "__");
    const label = t(`MagicaClothEditor.${key}`, {defaultValue: name});
    const tip = t(`MagicaClothEditor.${key}_tip`, {defaultValue: ""});
    const ignored = !suppressIgnoredTag && isIgnoredPath(path);

    return (
        <div style={{marginTop: hideHeader ? 0 : 10}}>
            {!hideHeader && (
                <div
                    onClick={() => setOpen((prev) => !prev)}
                    style={{
                        display: "flex", alignItems: "center", gap: 6,
                        cursor: "pointer", userSelect: "none", padding: "2px 0 6px",
                    }}
                >
                    {open
                        ? <CaretDownOutlined style={{fontSize: 11, color: token.colorTextTertiary}}/>
                        : <CaretRightOutlined style={{fontSize: 11, color: token.colorTextTertiary}}/>}
                    <Typography.Text strong>{label}</Typography.Text>
                    {tip && (
                        <Tooltip title={tip} styles={{root: {maxWidth: 400}}}>
                            <QuestionCircleOutlined style={{color: "rgba(128,128,128,0.85)", cursor: "help"}}/>
                        </Tooltip>
                    )}
                    {ignored && (
                        <Tooltip title={t('MagicaClothEditor.ignored_tip')}>
                            <Tag style={{marginInlineEnd: 0, cursor: "help"}}>
                                {t('MagicaClothEditor.ignored_tag')}
                            </Tag>
                        </Tooltip>
                    )}
                    <span style={{flex: 1, alignSelf: "center", borderTop: `0.5px solid ${token.colorSplit}`, marginLeft: 4}}/>
                </div>
            )}
            {open && (
                // 子字段整体缩进一点，和上面的小节标题拉开层级；
                // 标题被分组面板顶掉时（惯性 / 风）不缩进，免得跟同组里那些没有容器的字段错开
                <div style={{paddingLeft: hideHeader ? 0 : 14}}>
                    <FieldList value={value} pathPrefix={path} suppressIgnoredTag={suppressIgnoredTag}/>
                </div>
            )}
        </div>
    );
};

/** FieldList 一个对象的所有成员：容器渲染成小节标题，其余各成一行 */
const FieldList: React.FC<{
    value: Record<string, any>;
    pathPrefix: string;
    /** 只渲染这些成员，不给则渲染全部 */
    members?: string[];
    /** 整组都被忽略时不必逐字段标注 */
    suppressIgnoredTag?: boolean;
    /** 分组下只有一个容器且它的名字与分组名重复时，标题交给分组面板 */
    hideContainerHeader?: boolean;
}> = ({value, pathPrefix, members, suppressIgnoredTag, hideContainerHeader}) => {
    const keys = members ?? Object.keys(value ?? {});

    return (
        <div style={{display: "flex", flexDirection: "column"}}>
            {keys.map((key) => {
                const path = pathPrefix ? `${pathPrefix}.${key}` : key;
                const child = value[key];
                if (rendersChildren(child)) {
                    return (
                        <ContainerSection
                            key={key}
                            name={key}
                            path={path}
                            value={child}
                            suppressIgnoredTag={suppressIgnoredTag}
                            hideHeader={hideContainerHeader}
                        />
                    );
                }
                return (
                    <FieldRow
                        key={key}
                        name={key}
                        path={path}
                        value={child}
                        ignored={!suppressIgnoredTag && isIgnoredPath(path)}
                        labelWidth={LabelWidth}
                    />
                );
            })}
        </div>
    );
};

const MagicaClothForm: React.FC<{
    params: any;
    onChange: (next: any) => void;
}> = ({params, onChange}) => {
    const {t} = useTranslation();

    // 写回时要读当前文档，但又不能让 setAtPath 随文档变化而重建（否则每行的 memo 全失效）
    const paramsRef = React.useRef(params);
    paramsRef.current = params;
    const onChangeRef = React.useRef(onChange);
    onChangeRef.current = onChange;

    const setAtPath = React.useCallback<SetAtPath>((path, next) => {
        onChangeRef.current(updateAtPath(paramsRef.current, path.split("."), next));
    }, []);

    if (typeof params !== "object" || params === null || Array.isArray(params)) {
        return <Typography.Text type="secondary">{t('Infos.payload_no_structured_root')}</Typography.Text>;
    }

    // 新建的空载荷没有字段可显示：提示从现有文件复制数据（JSON 模式粘贴）
    if (Object.keys(params).length === 0) {
        return (
            <Typography.Text type="secondary">
                {t('MagicaClothEditor.empty_payload_hint')}
            </Typography.Text>
        );
    }

    const groups = splitIntoGroups(params);
    // 生效的参数默认展开，被整组忽略的场景/构建设置默认折起
    const defaultActive = groups
        .filter((group) => !FullyIgnoredGroups.has(group.key))
        .map((group) => group.key);

    return (
        <SetterContext.Provider value={setAtPath}>
            <div style={{textAlign: "left"}}>
                <Collapse
                    size="small"
                    defaultActiveKey={defaultActive}
                    items={groups.map((group) => {
                        const groupIgnored = FullyIgnoredGroups.has(group.key);
                        const known = MagicaGroups.some((item) => item.key === group.key);
                        const groupLabel = known ? t(`MagicaClothEditor.group_${group.key}`) : group.key;

                        // 分组下只有一个成员、它是容器、且译名与分组名重复时（惯性 / 风），
                        // 容器标题交给分组面板，省掉连着两行一样的字；容器说明也一并挪过来
                        const sole = group.members.length === 1 ? group.members[0] : null;
                        const soleLabel = sole === null
                            ? null
                            : t(`MagicaClothEditor.${sole}`, {defaultValue: sole});
                        const hideContainerHeader = sole !== null
                            && rendersChildren(params[sole]) && soleLabel === groupLabel;
                        const panelTip = hideContainerHeader
                            ? t(`MagicaClothEditor.${sole}_tip`, {defaultValue: ""})
                            : "";

                        return {
                            key: group.key,
                            label: (
                                <Space>
                                    <Typography.Text strong>{groupLabel}</Typography.Text>
                                    {panelTip && (
                                        <Tooltip title={panelTip} styles={{root: {maxWidth: 400}}}>
                                            <QuestionCircleOutlined style={{color: "rgba(128,128,128,0.85)", cursor: "help"}}/>
                                        </Tooltip>
                                    )}
                                    {groupIgnored && (
                                        <Tag>{t('MagicaClothEditor.ignored_tag')}</Tag>
                                    )}
                                </Space>
                            ),
                            children: (
                                <>
                                    {groupIgnored && (
                                        <Alert
                                            type="warning"
                                            showIcon
                                            style={{marginBottom: 8}}
                                            title={t('MagicaClothEditor.group_ignored_notice')}
                                        />
                                    )}
                                    <FieldList
                                        value={params}
                                        pathPrefix=""
                                        members={group.members}
                                        suppressIgnoredTag={groupIgnored}
                                        hideContainerHeader={hideContainerHeader}
                                    />
                                </>
                            ),
                        };
                    })}
                />
            </div>
        </SetterContext.Provider>
    );
};

export default MagicaClothForm;
