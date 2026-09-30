import React from "react";
import {Collapse, Select, Space, Switch, Tag, Tooltip, Typography} from "antd";
import {QuestionCircleOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import BezierParamField, {isBezierParam} from "./BezierParamField";
import {isVector, Vector3Field} from "./magicaClothFields";
import {NumberField} from "../parts/formControls";
import JsonObjectForm from "../common/JsonObjectForm";
import {
    clothEnumLabelKey,
    clothEnumOptionsFor,
    clothNumberDefaultFor,
    isClothGroupActive,
    isKnownClothGroup,
    splitClothParamsIntoGroups,
} from "../../utils/clothParamsMeta.ts";

/**
 * ClothParamsForm MagicaCloth（v1）ClothParams 专用表单（.dsbconf / .dslconf 的载荷）
 *
 * 字段元数据（枚举取值、出厂默认值、分组）在 clothParamsMeta.ts，全部按 MagicaCloth v1 游戏源码考证。
 *
 * 渲染规则按字段名与值决定：
 * - BezierParam 曲线参数 → 曲线控件（带迷你预览）
 * - 有枚举表的整数（adjustMode / penetrationMode / penetrationAxis / teleportMode）→ 下拉框（标签是源码里的枚举名）
 * - gravityDirection 等向量 → 三分量输入
 * - 布尔 → 开关；数值 → 数字框（提示里带出厂默认值）
 * 顶层成员按用途分组进折叠面板，组内以 use* 开关领头；开关关闭的功能组默认折起。
 *
 * 性能：ClothParams 展开后有 ~20 个 BezierParam（各带一张 SVG 预览）与几十个数字框，
 * 写回走「按字段改一处 + 逐行 memo」：改一个成员只新建根对象，其余行的 value 引用不变，整行跳过重渲染。
 */

/** 写回入口：整棵表单共用一个稳定的按字段写回函数，逐行 memo 才生效 */
type SetField = (field: string, next: any) => void;

const SetterContext = React.createContext<SetField>(() => undefined);

/** ValueControl 按字段名与值渲染一个成员的控件 */
const ValueControl: React.FC<{
    field: string;
    value: any;
    onChange: (next: any) => void;
}> = ({field, value, onChange}) => {
    const {t} = useTranslation();

    if (value === null || value === undefined) {
        return (
            <Tooltip title={t('JsonForm.null_value_tip')}>
                <Tag>null</Tag>
            </Tooltip>
        );
    }
    if (isBezierParam(value)) {
        return <BezierParamField field={field} value={value} onChange={onChange}/>;
    }
    if (typeof value === "boolean") {
        return <Switch size="small" checked={value} onChange={(checked) => onChange(checked)}/>;
    }
    if (typeof value === "number") {
        const options = clothEnumOptionsFor(field, (name) => {
            const key = clothEnumLabelKey(name);
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
        const meta = clothNumberDefaultFor(field);
        return (
            <NumberField
                width={180}
                step={meta?.integer ? 1 : 0.01}
                precision={meta?.integer ? 0 : undefined}
                value={value}
                onChange={onChange}
                tooltip={meta ? t('ClothParamsEditor.default_hint', {def: meta.def}) : undefined}
            />
        );
    }
    if (isVector(value)) {
        return <Vector3Field value={value} onChange={onChange}/>;
    }
    // 兜底：未知的复杂成员回退到通用递归表单
    return <JsonObjectForm value={value} onChange={onChange} defaultExpandDepth={0}/>;
};

/**
 * FieldRow 一行「字段名 + 控件」
 * 标签走 ClothParamsEditor.<字段名> 翻译，没有翻译的字段（落在 other 组的未知成员）回退成原始字段名；
 * 说明挂在标签后面的问号图标上 —— 不能用 Typography 的 ellipsis tooltip，
 * 那个只在文字被截断时才启用，短标签永远看不到
 * memo：改一个成员只让这一行的 value 变化，其余行跳过重渲染
 */
const FieldRow = React.memo<{
    field: string;
    value: any;
}>(({field, value}) => {
    const {t} = useTranslation();
    const setField = React.useContext(SetterContext);
    // field 与 setField 都稳定，所以这个回调也稳定，子控件不会因为父级重渲染而失效
    const onChange = React.useCallback((next: any) => setField(field, next), [setField, field]);

    const label = t(`ClothParamsEditor.${field}`, {defaultValue: field});
    const tip = t(`ClothParamsEditor.${field}_tip`, {defaultValue: ""});

    return (
        <div style={{display: "flex", alignItems: "flex-start", gap: 8, minHeight: 28, marginBottom: 2}}>
            <div style={{width: 260, flexShrink: 0, textAlign: "left", paddingTop: 3}}>
                <Space size={4}>
                    {/* 标签的 tooltip 只在自己被截断时显示完整标签名（与 formControls 的 Row 一致）；
                        字段说明一律只在问号图标上，避免同一段说明在两处各弹一次 */}
                    <Typography.Text ellipsis={{tooltip: label}}
                                     style={{maxWidth: 260 - (tip ? 22 : 0)}}>
                        {label}
                    </Typography.Text>
                    {tip && (
                        <Tooltip title={tip} styles={{root: {maxWidth: 400}}}>
                            <QuestionCircleOutlined style={{color: "rgba(128,128,128,0.85)", cursor: "help"}}/>
                        </Tooltip>
                    )}
                </Space>
            </div>
            <div style={{flex: 1, minWidth: 0, textAlign: "left"}}>
                <ValueControl field={field} value={value} onChange={onChange}/>
            </div>
        </div>
    );
});

FieldRow.displayName = "ClothParamFieldRow";

const ClothParamsForm: React.FC<{
    params: any;
    onChange: (next: any) => void;
}> = ({params, onChange}) => {
    const {t} = useTranslation();

    // 写回时要读当前文档，但 setField 不能随文档变化而重建（否则每行的 memo 全失效）
    const paramsRef = React.useRef(params);
    paramsRef.current = params;
    const onChangeRef = React.useRef(onChange);
    onChangeRef.current = onChange;

    const setField = React.useCallback<SetField>((field, next) => {
        onChangeRef.current({...paramsRef.current, [field]: next});
    }, []);

    if (typeof params !== "object" || params === null || Array.isArray(params)) {
        return <Typography.Text type="secondary">{t('Infos.payload_no_structured_root')}</Typography.Text>;
    }

    const groups = splitClothParamsIntoGroups(params);
    // 生效的功能组默认展开，被 use* 开关关掉的功能组默认折起
    const defaultActive = groups
        .filter((group) => isClothGroupActive(group.key, params))
        .map((group) => group.key);

    return (
        <SetterContext.Provider value={setField}>
            <div style={{textAlign: "left"}}>
                <Collapse
                    size="small"
                    defaultActiveKey={defaultActive}
                    items={groups.map((group) => ({
                        key: group.key,
                        label: (
                            <Typography.Text strong>
                                {isKnownClothGroup(group.key)
                                    ? t(`ClothParamsEditor.group_${group.key}`)
                                    : group.key}
                            </Typography.Text>
                        ),
                        children: (
                            <div style={{display: "flex", flexDirection: "column"}}>
                                {group.members.map((field) => (
                                    <FieldRow key={field} field={field} value={params[field]}/>
                                ))}
                            </div>
                        ),
                    }))}
                />
            </div>
        </SetterContext.Provider>
    );
};

export default ClothParamsForm;
