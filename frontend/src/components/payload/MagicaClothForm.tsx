import React from "react";
import {Alert, Collapse, Input, Select, Space, Switch, Tag, Tooltip, Typography} from "antd";
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

/** ValueControl 按路径与值渲染一个成员的控件 */
const ValueControl: React.FC<{
    value: any;
    path: string;
    depth: number;
    onChange: (next: any) => void;
}> = ({value, path, depth, onChange}) => {
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
        const options = enumOptionsFor(path);
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
        return <FieldList value={value} pathPrefix={path} depth={depth + 1}/>;
    }
    return <Tag>{String(value)}</Tag>;
};

/**
 * FieldRow 一行「字段名 + 控件」，被忽略的成员额外挂一个标记
 * memo 的意义在于：改一个成员只会让它到根的那条链变化，其余行的 value 引用不变，整行跳过重渲染
 */
const FieldRow = React.memo<{
    name: string;
    path: string;
    value: any;
    depth: number;
    ignored: boolean;
    labelWidth: number;
}>(({name, path, value, depth, ignored, labelWidth}) => {
    const {t} = useTranslation();
    const setAtPath = React.useContext(SetterContext);
    // path 与 setAtPath 都稳定，所以这个回调也稳定，子控件不会因为父级重渲染而失效
    const onChange = React.useCallback((next: any) => setAtPath(path, next), [setAtPath, path]);

    return (
        <div style={{display: "flex", alignItems: "flex-start", gap: 8, minHeight: 28, marginBottom: 2}}>
            <div style={{width: labelWidth, flexShrink: 0, textAlign: "left", paddingTop: 3}}>
                <Space size={4}>
                    <Typography.Text ellipsis={{tooltip: name}} style={{maxWidth: labelWidth - (ignored ? 26 : 0)}}>
                        {name}
                    </Typography.Text>
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
                <ValueControl value={value} path={path} depth={depth} onChange={onChange}/>
            </div>
        </div>
    );
});

FieldRow.displayName = "MagicaFieldRow";

/** FieldList 一个对象的所有成员，逐个成一行 */
const FieldList: React.FC<{
    value: Record<string, any>;
    pathPrefix: string;
    depth: number;
    /** 只渲染这些成员，不给则渲染全部 */
    members?: string[];
    /** 整组都被忽略时不必逐字段标注 */
    suppressIgnoredTag?: boolean;
}> = ({value, pathPrefix, depth, members, suppressIgnoredTag}) => {
    const keys = members ?? Object.keys(value ?? {});
    const labelWidth = depth === 0 ? 260 : 210;

    return (
        <div style={{display: "flex", flexDirection: "column"}}>
            {keys.map((key) => {
                const path = pathPrefix ? `${pathPrefix}.${key}` : key;
                return (
                    <FieldRow
                        key={key}
                        name={key}
                        path={path}
                        value={value[key]}
                        depth={depth}
                        ignored={!suppressIgnoredTag && isIgnoredPath(path)}
                        labelWidth={labelWidth}
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
                        return {
                            key: group.key,
                            label: (
                                <Space>
                                    <Typography.Text strong>
                                        {known ? t(`MagicaClothEditor.group_${group.key}`) : group.key}
                                    </Typography.Text>
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
                                        depth={0}
                                        members={group.members}
                                        suppressIgnoredTag={groupIgnored}
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
