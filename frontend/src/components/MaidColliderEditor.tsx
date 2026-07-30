import {forwardRef} from "react";
import {Button, Input, InputNumber, Space, Table, Typography} from "antd";
import {DeleteOutlined, PlusOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import BaseFormatEditor, {BaseFormatEditorProps, FormatEditorRef} from "./common/BaseFormatEditor";

/**
 * MaidColliderEditor maid_collider.bytes 专用编辑器
 * 样式1：胶囊碰撞体表格（骨骼路径/主轴/高度/半径/中心）；样式2：完整 JSON
 */
const MaidColliderEditor = forwardRef<FormatEditorRef, Omit<BaseFormatEditorProps, "renderStyle1" | "renderHeader">>(
    (props, ref) => {
        const {t} = useTranslation();

        const renderStyle1 = (data: any, setData: (value: any) => void) => {
            const colliders: any[] = Array.isArray(data?.colliders) ? data.colliders : [];

            const update = (index: number, next: any) => {
                const list = [...colliders];
                list[index] = next;
                setData({...data, colliders: list});
            };

            const numberCell = (record: any, index: number, field: string, width = 90, precision?: number) => (
                <InputNumber
                    size="small" style={{width}} step={0.01} precision={precision}
                    value={field.includes(".") ? record?.center?.[field.split(".")[1]] : record?.[field]}
                    onChange={(v) => {
                        const value = (v ?? 0) as number;
                        if (field.includes(".")) {
                            const axis = field.split(".")[1];
                            update(index, {...record, center: {...record.center, [axis]: value}});
                        } else {
                            update(index, {...record, [field]: value});
                        }
                    }}
                />
            );

            return (
                <div style={{textAlign: "left"}}>
                    <Space style={{marginBottom: 8}}>
                        <Typography.Text type="secondary">
                            {t('MaidColliderEditor.collider_count', {count: colliders.length})}
                        </Typography.Text>
                    </Space>
                    <Table
                        size="small"
                        rowKey={(_, index) => String(index)}
                        pagination={false}
                        scroll={{y: "calc(100vh - 320px)"}}
                        dataSource={colliders}
                        columns={[
                            {
                                title: "bonePath",
                                render: (_: any, record: any, index: number) => (
                                    <Input size="small" value={record?.bonePath}
                                           onChange={(e) => update(index, {...record, bonePath: e.target.value})}/>
                                ),
                            },
                            {
                                title: "direction",
                                width: 100,
                                render: (_: any, record: any, index: number) => numberCell(record, index, "direction", 80, 0),
                            },
                            {
                                title: "height",
                                width: 110,
                                render: (_: any, record: any, index: number) => numberCell(record, index, "height"),
                            },
                            {
                                title: "radius",
                                width: 110,
                                render: (_: any, record: any, index: number) => numberCell(record, index, "radius"),
                            },
                            {
                                title: "center X",
                                width: 110,
                                render: (_: any, record: any, index: number) => numberCell(record, index, "center.x"),
                            },
                            {
                                title: "center Y",
                                width: 110,
                                render: (_: any, record: any, index: number) => numberCell(record, index, "center.y"),
                            },
                            {
                                title: "center Z",
                                width: 110,
                                render: (_: any, record: any, index: number) => numberCell(record, index, "center.z"),
                            },
                            {
                                title: t('Common.operate'),
                                width: 60,
                                render: (_: any, __: any, index: number) => (
                                    <Button size="small" type="text" danger icon={<DeleteOutlined/>}
                                            onClick={() => {
                                                const list = [...colliders];
                                                list.splice(index, 1);
                                                setData({...data, colliders: list});
                                            }}/>
                                ),
                            },
                        ] as any}
                        footer={() => (
                            <Button size="small" style={{width: "100%"}} icon={<PlusOutlined/>}
                                    onClick={() => setData({
                                        ...data,
                                        colliders: [...colliders, {
                                            bonePath: "",
                                            center: {x: 0, y: 0, z: 0},
                                            direction: 0,
                                            height: 0.2,
                                            radius: 0.05,
                                        }],
                                    })}>
                                {t('ColliderEditor.add_collider')}
                            </Button>
                        )}
                    />
                </div>
            );
        };

        return <BaseFormatEditor {...props} ref={ref} renderStyle1={renderStyle1}/>;
    }
);

export default MaidColliderEditor;
