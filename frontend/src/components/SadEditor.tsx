import {forwardRef} from "react";
import {Collapse, Space, Switch, Typography} from "antd";
import {useTranslation} from "react-i18next";
import BaseFormatEditor, {BaseFormatEditorProps, FormatEditorRef} from "./common/BaseFormatEditor";
import {NullableStringInput, NumberField, Row} from "./parts/formControls";
import BigIntInput from "./common/BigIntInput";
import JsonObjectForm from "./common/JsonObjectForm";

/**
 * SadEditor .sad 部件附着数据专用编辑器
 * 样式1：附着记录列表（部件/槽位/RID/顶点信息），变换与层级等复杂字段回退通用表单；样式2：完整 JSON
 */
const SadEditor = forwardRef<FormatEditorRef, Omit<BaseFormatEditorProps, "renderStyle1" | "renderHeader">>(
    (props, ref) => {
        const {t} = useTranslation();

        const renderStyle1 = (data: any, setData: (value: any) => void) => {
            const items: any[] = Array.isArray(data?.items) ? data.items : [];

            const updateItem = (index: number, next: any) => {
                const list = [...items];
                list[index] = next;
                setData({...data, items: list});
            };

            return (
                <div style={{textAlign: "left", height: "calc(100vh - 215px)", overflow: "auto"}}>
                    <Space style={{marginBottom: 8}}>
                        <Typography.Text>signature: {String(data?.signature ?? "")}</Typography.Text>
                        <Typography.Text type="secondary">version: {String(data?.version ?? "")}</Typography.Text>
                        <Typography.Text type="secondary">
                            {t('SadEditor.item_count', {count: items.length})}
                        </Typography.Text>
                    </Space>
                    <Collapse
                        size="small"
                        items={items.map((item, index) => ({
                            key: String(index),
                            label: (
                                <Space>
                                    <Typography.Text strong>{item?.partName ?? `#${index}`}</Typography.Text>
                                    <Typography.Text type="secondary">
                                        {String(item?.mySlotId ?? "")} → {String(item?.targetSlotId ?? "")}
                                    </Typography.Text>
                                    {!item?.enabled && <Typography.Text type="warning">disabled</Typography.Text>}
                                </Space>
                            ),
                            children: (
                                <div>
                                    <Row label="partName">
                                        <NullableStringInput value={item?.partName}
                                                             onChange={(v) => updateItem(index, {...item, partName: v})}/>
                                    </Row>
                                    <Row label="enabled">
                                        <Switch size="small" checked={!!item?.enabled}
                                                onChange={(checked) => updateItem(index, {...item, enabled: checked})}/>
                                    </Row>
                                    <Row label="mySlotId">
                                        <NullableStringInput value={item?.mySlotId}
                                                             onChange={(v) => updateItem(index, {...item, mySlotId: v ?? ""})}/>
                                    </Row>
                                    <Row label="myRid">
                                        <BigIntInput value={item?.myRid}
                                                     onChange={(v) => updateItem(index, {...item, myRid: v})}/>
                                    </Row>
                                    <Row label="targetSlotId">
                                        <NullableStringInput value={item?.targetSlotId}
                                                             onChange={(v) => updateItem(index, {...item, targetSlotId: v ?? ""})}/>
                                    </Row>
                                    <Row label="targetRid">
                                        <BigIntInput value={item?.targetRid}
                                                     onChange={(v) => updateItem(index, {...item, targetRid: v})}/>
                                    </Row>
                                    <Row label="targetSlotNo">
                                        <NumberField precision={0} value={item?.targetSlotNo}
                                                     onChange={(v) => updateItem(index, {...item, targetSlotNo: v})}/>
                                    </Row>
                                    <Row label="targetAttachPointName">
                                        <NullableStringInput value={item?.targetAttachPointName}
                                                             onChange={(v) => updateItem(index, {...item, targetAttachPointName: v})}/>
                                    </Row>
                                    <Row label="targetVertexCount">
                                        <NumberField precision={0} value={item?.targetVertexCount}
                                                     onChange={(v) => updateItem(index, {...item, targetVertexCount: v})}/>
                                    </Row>
                                    <Row label="targetVertexIndex">
                                        <NumberField precision={0} value={item?.targetVertexIndex}
                                                     onChange={(v) => updateItem(index, {...item, targetVertexIndex: v})}/>
                                    </Row>
                                    <Row label="boneAttachEdited">
                                        <Switch size="small" checked={!!item?.boneAttachEdited}
                                                onChange={(checked) => updateItem(index, {...item, boneAttachEdited: checked})}/>
                                    </Row>
                                    <Collapse
                                        size="small"
                                        items={[{
                                            key: "advanced",
                                            label: t('SadEditor.transforms_and_vertices'),
                                            children: (
                                                <JsonObjectForm
                                                    value={{
                                                        newAttachVertexIndices: item?.newAttachVertexIndices ?? null,
                                                        prs2: item?.prs2 ?? null,
                                                        prs3: item?.prs3 ?? null,
                                                        boneAttachedHierarchy: item?.boneAttachedHierarchy ?? null,
                                                    }}
                                                    onChange={(next) => updateItem(index, {...item, ...next})}
                                                    defaultExpandDepth={0}
                                                />
                                            ),
                                        }]}
                                    />
                                </div>
                            ),
                        }))}
                    />
                    {items.length === 0 &&
                        <Typography.Text type="secondary">{t('JsonForm.empty_array')}</Typography.Text>}
                </div>
            );
        };

        return <BaseFormatEditor {...props} ref={ref} renderStyle1={renderStyle1}/>;
    }
);

export default SadEditor;
