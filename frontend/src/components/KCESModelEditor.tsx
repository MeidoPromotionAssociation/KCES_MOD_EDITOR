import {forwardRef} from "react";
import {Button, Collapse, Descriptions, Input, Space, Typography} from "antd";
import {DeleteOutlined, PlusOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import BaseFormatEditor, {BaseFormatEditorProps, FormatEditorRef} from "./common/BaseFormatEditor";
import {NullableStringInput, NumberField, Row} from "./parts/formControls";
import BigIntInput from "./common/BigIntInput";

/**
 * KCESModelEditor .model 专用编辑器
 * 样式1：模型元数据 + 材质文件名列表编辑 + 骨骼/变形统计（网格级数据请用 JSON 模式）；样式2：完整 JSON
 */
const KCESModelEditor = forwardRef<FormatEditorRef, Omit<BaseFormatEditorProps, "renderStyle1" | "renderHeader">>(
    (props, ref) => {
        const {t} = useTranslation();

        const renderStyle1 = (data: any, setData: (value: any) => void) => {
            const set = (field: string, value: any) => setData({...data, [field]: value});
            const materials: any[] = Array.isArray(data?.materialFileName) ? data.materialFileName : [];

            return (
                <div style={{textAlign: "left", height: "calc(100vh - 215px)", overflow: "auto"}}>
                    <Collapse
                        size="small"
                        defaultActiveKey={["meta", "materials"]}
                        items={[
                            {
                                key: "meta",
                                label: t('ModelEditor.metadata'),
                                children: (
                                    <div>
                                        <Row label="modelName">
                                            <NullableStringInput value={data?.modelName}
                                                                 onChange={(v) => set("modelName", v)}/>
                                        </Row>
                                        <Row label="fileName">
                                            <NullableStringInput value={data?.fileName}
                                                                 onChange={(v) => set("fileName", v)}/>
                                        </Row>
                                        <Row label="meshfileName">
                                            <NullableStringInput value={data?.meshfileName}
                                                                 onChange={(v) => set("meshfileName", v)}/>
                                        </Row>
                                        <Row label="id">
                                            <BigIntInput value={data?.id} onChange={(v) => set("id", v)}/>
                                        </Row>
                                        <Row label="version">
                                            <NumberField precision={0} value={data?.version}
                                                         onChange={(v) => set("version", v)}/>
                                        </Row>
                                        <Row label="shadowModeFlags">
                                            <Space>
                                                <NumberField precision={0} width={90} value={data?.shadowModeFlags}
                                                             onChange={(v) => set("shadowModeFlags", v)}/>
                                                <Typography.Text type="secondary">
                                                    0=Default, 1=CastShadow, 2=NoCastShadow
                                                </Typography.Text>
                                            </Space>
                                        </Row>
                                    </div>
                                ),
                            },
                            {
                                key: "materials",
                                label: `materialFileName (${materials.length})`,
                                children: (
                                    <div>
                                        {materials.map((name, index) => (
                                            <div key={index}
                                                 style={{display: "flex", gap: 6, marginBottom: 6, alignItems: "center"}}>
                                                <Typography.Text type="secondary" style={{width: 30}}>
                                                    {index}
                                                </Typography.Text>
                                                <Input
                                                    size="small"
                                                    value={name ?? ""}
                                                    onChange={(e) => {
                                                        const list = [...materials];
                                                        list[index] = e.target.value;
                                                        set("materialFileName", list);
                                                    }}
                                                />
                                                <Button size="small" type="text" danger icon={<DeleteOutlined/>}
                                                        onClick={() => {
                                                            const list = [...materials];
                                                            list.splice(index, 1);
                                                            set("materialFileName", list);
                                                        }}/>
                                            </div>
                                        ))}
                                        <Button size="small" icon={<PlusOutlined/>}
                                                onClick={() => set("materialFileName", [...materials, ""])}>
                                            {t('ModelEditor.add_material')}
                                        </Button>
                                    </div>
                                ),
                            },
                            {
                                key: "stats",
                                label: t('ModelEditor.data_stats'),
                                children: (
                                    <div>
                                        <Descriptions size="small" column={2} bordered>
                                            <Descriptions.Item label="transData">
                                                {(data?.transData ?? []).length}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="boneNames">
                                                {(data?.boneNames ?? []).length}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="morphs">
                                                {(data?.morphs ?? []).length}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="skinThick">
                                                {data?.skinThick ? "yes" : "null"}
                                            </Descriptions.Item>
                                        </Descriptions>
                                        <Typography.Text type="secondary">
                                            {t('ModelEditor.mesh_data_hint')}
                                        </Typography.Text>
                                    </div>
                                ),
                            },
                        ]}
                    />
                </div>
            );
        };

        return <BaseFormatEditor {...props} ref={ref} renderStyle1={renderStyle1}/>;
    }
);

export default KCESModelEditor;
