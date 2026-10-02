import {forwardRef, useMemo} from "react";
import {Typography} from "antd";
import {useTranslation} from "react-i18next";
import BaseFormatEditor, {BaseFormatEditorProps, FormatEditorRef} from "./common/BaseFormatEditor";
import JsonObjectForm, {FieldMeta} from "./common/JsonObjectForm";
import PresetThumbnail from "./preset/PresetThumbnail";
import PresetTableView from "./preset/PresetTableView";

/**
 * PresetEditor .preset（KCES 预设文件）编辑器
 *
 * 样式1 = 表格编辑：
 * - 头部：缩略图（thumbnail 是裸 base64 的 PNG，解码显示、可换图）+ 结构字段表单
 * - 主体：属性表（properties 实测 291 项，JsonObjectForm 的数组上限只有 100，必须单独做表格）
 * + 部件名表（colorData.partNames）
 * 样式2 = JSON（BaseFormatEditor 自带）
 *
 * 头部表单与表格各自负责一部分字段，两边都不重复：头部管 containerVersion / version /
 * bodyData / colorData 与 propData 里除数组外的字段，表格管 properties 与 partNames。
 */

/** 头部表单展示的结构字段：把表格负责的两组数组摘掉 */
function headerValue(data: any): any {
    const colorData = {...(data?.maidData?.colorData ?? {})};
    delete colorData.partNames;
    const propData = {...(data?.maidData?.propData ?? {})};
    delete propData.properties;
    return {
        containerVersion: data?.containerVersion,
        maidData: {
            version: data?.maidData?.version,
            bodyData: data?.maidData?.bodyData,
            colorData,
            propData,
        },
    };
}

/** 头部表单改完后合并回原文档，表格负责的数组原样保留 */
function mergeHeader(edited: any, original: any): any {
    const maidData = {
        ...(original?.maidData ?? {}),
        version: edited?.maidData?.version,
        bodyData: edited?.maidData?.bodyData,
        colorData: {...(edited?.maidData?.colorData ?? {})},
        propData: {...(edited?.maidData?.propData ?? {})},
    };
    // 数组只在原本存在时写回，避免给没有这个字段的文档凭空加上
    if (original?.maidData?.colorData && "partNames" in original.maidData.colorData) {
        maidData.colorData.partNames = original.maidData.colorData.partNames;
    }
    if (original?.maidData?.propData && "properties" in original.maidData.propData) {
        maidData.propData.properties = original.maidData.propData.properties;
    }
    return {...original, containerVersion: edited?.containerVersion, maidData};
}

/**
 * 头部结构字段的译名与说明（按路径索引）。
 *
 * 必须按路径给：signature / version 在 bodyData / colorData / propData
 * 各有一份，同名但语义完全不同（CM3D2_MAID_BODY / CM3D2_MULTI_COL / GP03_MPROP_LIST，
 * 版本号也各不相同），用字段名当 key 会三处共用一份文案。
 */
const HEADER_FIELDS = [
    "containerVersion",
    "maidData",
    "maidData.version",
    "maidData.bodyData",
    "maidData.bodyData.signature",
    "maidData.bodyData.version",
    "maidData.colorData",
    "maidData.colorData.signature",
    "maidData.colorData.version",
    "maidData.colorData.partCount",
    "maidData.colorData.legacyParts",
    "maidData.propData",
    "maidData.propData.signature",
    "maidData.propData.version",
];

/** 把 i18n 里的 PresetField.* 按路径组装成 JsonObjectForm 的 fieldMeta */
function buildFieldMeta(
    paths: string[],
    t: (key: string, options?: any) => string,
): Record<string, FieldMeta> {
    const meta: Record<string, FieldMeta> = {};
    for (const p of paths) {
        const key = p.replace(/\./g, "_");
        meta[p] = {
            label: t(`PresetField.${key}`, {defaultValue: ""}),
            tip: t(`PresetField.${key}_tip`, {defaultValue: ""}),
        };
    }
    return meta;
}

const PresetEditor = forwardRef<FormatEditorRef, Omit<BaseFormatEditorProps, "renderStyle1" | "renderHeader">>(
    (props, ref) => {
        const {t} = useTranslation();
        const headerFieldMeta = useMemo(() => buildFieldMeta(HEADER_FIELDS, t), [t]);

        const renderHeader = (data: any, setData: (next: any) => void) => (
            <div style={{display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 8, textAlign: "left"}}>
                <PresetThumbnail
                    value={data?.thumbnail ?? ""}
                    onChange={(next) => setData({...data, thumbnail: next})}
                />
                {/*
                 * 结构字段表单按内容自然撑高，不再锁 maxHeight: 150。
                 * 高度分配交给 BaseFormatEditor：头部 flexShrink: 0（内容多高就多高，
                 * 多了会把下面主体往下挤），主体 flex: 1 拿走剩余高度。
                 */}
                <div style={{flex: 1, minWidth: 0}}>
                    <Typography.Text strong>{t('PresetEditor.structure_title')}</Typography.Text>
                    <div style={{marginTop: 6}}>
                        {/*
                         * defaultExpandDepth: 0 —— maidData 是根下面的第一层嵌套对象，
                         * depth=0 时判据 depth < defaultExpandDepth，给 1 会默认展开它。
                         * 给 0 则默认折叠，省得它一上来就占掉半屏把属性表挤下去。
                         * 标量字段（containerVersion 等）不渲染折叠面板，不受影响。
                         */}
                        <JsonObjectForm
                            value={headerValue(data)}
                            onChange={(next: any) => setData(mergeHeader(next, data))}
                            defaultExpandDepth={0}
                            fieldMeta={headerFieldMeta}
                        />
                    </div>
                </div>
            </div>
        );

        const renderStyle1 = (data: any, setData: (next: any) => void) => (
            <PresetTableView data={data} setData={setData}/>
        );

        return (
            <BaseFormatEditor
                {...props}
                ref={ref}
                renderHeader={renderHeader}
                renderStyle1={renderStyle1}
                style1Label={t('PresetEditor.table_mode')}
                style2Label={t('PresetEditor.json_mode')}
            />
        );
    }
);

PresetEditor.displayName = "PresetEditor";

export default PresetEditor;
