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

            // update 按行号把补丁合并进原始碰撞体，不经过表格行对象，
            // 行对象只承载 rowKey，不会被写回文件
            const update = (index: number, patch: any) => {
                const list = [...colliders];
                list[index] = {...list[index], ...patch};
                setData({...data, colliders: list});
            };

            const numberCell = (index: number, field: string, width = 90, precision?: number) => {
                const record = colliders[index];
                return (
                    <InputNumber
                        size="small" style={{width}} step={0.01} precision={precision}
                        value={field.includes(".") ? record?.center?.[field.split(".")[1]] : record?.[field]}
                        onChange={(v) => {
                            const value = (v ?? 0) as number;
                            if (field.includes(".")) {
                                const axis = field.split(".")[1];
                                update(index, {center: {...record?.center, [axis]: value}});
                            } else {
                                update(index, {[field]: value});
                            }
                        }}
                    />
                );
            };

            return (
                <div style={{textAlign: "left"}}>
                    <Space style={{marginBottom: 8}}>
                        <Typography.Text type="secondary">
                            {t('MaidColliderEditor.collider_count', {count: colliders.length})}
                        </Typography.Text>
                    </Space>
                    <Table
                        size="small"
                        // antd v6 起 rowKey 不再接受 index 参数，改由 dataSource 携带行号
                        rowKey="__rowKey"
                        pagination={false}
                        scroll={{y: "calc(100vh - 320px)"}}
                        dataSource={colliders.map((_, index) => ({__rowKey: index}))}
                        columns={[
                            {
                                title: "bonePath",
                                render: (_: any, __: any, index: number) => (
                                    <Input size="small" value={colliders[index]?.bonePath}
                                           onChange={(e) => update(index, {bonePath: e.target.value})}/>
                                ),
                            },
                            {
                                title: "direction",
                                width: 100,
                                render: (_: any, __: any, index: number) => numberCell(index, "direction", 80, 0),
                            },
                            {
                                title: "height",
                                width: 110,
                                render: (_: any, __: any, index: number) => numberCell(index, "height"),
                            },
                            {
                                title: "radius",
                                width: 110,
                                render: (_: any, __: any, index: number) => numberCell(index, "radius"),
                            },
                            {
                                title: "center X",
                                width: 110,
                                render: (_: any, __: any, index: number) => numberCell(index, "center.x"),
                            },
                            {
                                title: "center Y",
                                width: 110,
                                render: (_: any, __: any, index: number) => numberCell(index, "center.y"),
                            },
                            {
                                title: "center Z",
                                width: 110,
                                render: (_: any, __: any, index: number) => numberCell(index, "center.z"),
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
