import {forwardRef} from "react";
import {Button, Input, InputNumber, Space, Table, Typography} from "antd";
import {DeleteOutlined, PlusOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import BaseFormatEditor, {BaseFormatEditorProps, FormatEditorRef} from "./common/BaseFormatEditor";
import {losslessParse, losslessStringify} from "../utils/losslessJson";

/**
 * HitCheckEditor .hitcheck 专用编辑器
 * 样式1：碰撞球条目表格（名称/父骨骼/类型/半径/位置等）；样式2：完整 JSON
 */
const HitCheckEditor = forwardRef<FormatEditorRef, Omit<BaseFormatEditorProps, "renderStyle1" | "renderHeader">>(
    (props, ref) => {
        const {t} = useTranslation();

        const renderStyle1 = (data: any, setData: (value: any) => void) => {
            const entries: any[] = Array.isArray(data?.entries) ? data.entries : [];

            const updateEntry = (index: number, field: string, value: any) => {
                const next = [...entries];
                next[index] = {...next[index], [field]: value};
                setData({...data, entries: next});
            };

            const updatePosition = (index: number, axis: "x" | "y" | "z", value: number) => {
                const next = [...entries];
                next[index] = {...next[index], position: {...next[index].position, [axis]: value}};
                setData({...data, entries: next});
            };

            // 修改半径时同步半径平方，与游戏数据保持一致
            const updateRadius = (index: number, radius: number) => {
                const next = [...entries];
                next[index] = {...next[index], radius, radiusSqr: radius * radius};
                setData({...data, entries: next});
            };

            const removeEntry = (index: number) => {
                const next = [...entries];
                next.splice(index, 1);
                setData({...data, entries: next});
            };

            const addEntry = () => {
                const template = entries.length > 0
                    ? losslessParse(losslessStringify(entries[entries.length - 1]))
                    : {
                        type: 0,
                        radius: 0.1,
                        radiusSqr: 0.01,
                        name: "",
                        parent: "",
                        position: {x: 0, y: 0, z: 0},
                        skrt: 0,
                        rl: 0
                    };
                setData({...data, entries: [...entries, template]});
            };

            const columns = [
                {
                    title: t('HitCheckEditor.name'),
                    dataIndex: "name",
                    width: 180,
                    render: (_: any, __: any, index: number) => (
                        <Input size="small" value={entries[index]?.name}
                               onChange={(e) => updateEntry(index, "name", e.target.value)}/>
                    ),
                },
                {
                    title: t('HitCheckEditor.parent'),
                    dataIndex: "parent",
                    width: 180,
                    render: (_: any, __: any, index: number) => (
                        <Input size="small" value={entries[index]?.parent}
                               onChange={(e) => updateEntry(index, "parent", e.target.value)}/>
                    ),
                },
                {
                    title: t('HitCheckEditor.type'),
                    dataIndex: "type",
                    width: 80,
                    render: (_: any, __: any, index: number) => (
                        <InputNumber size="small" value={entries[index]?.type} precision={0}
                                     onChange={(value) => updateEntry(index, "type", value ?? 0)}/>
                    ),
                },
                {
                    title: t('HitCheckEditor.radius'),
                    dataIndex: "radius",
                    width: 110,
                    render: (_: any, __: any, index: number) => (
                        <InputNumber size="small" value={entries[index]?.radius} step={0.01}
                                     onChange={(value) => updateRadius(index, value ?? 0)}/>
                    ),
                },
                {
                    title: "X",
                    width: 100,
                    render: (_: any, __: any, index: number) => (
                        <InputNumber size="small" value={entries[index]?.position?.x} step={0.01}
                                     onChange={(value) => updatePosition(index, "x", value ?? 0)}/>
                    ),
                },
                {
                    title: "Y",
                    width: 100,
                    render: (_: any, __: any, index: number) => (
                        <InputNumber size="small" value={entries[index]?.position?.y} step={0.01}
                                     onChange={(value) => updatePosition(index, "y", value ?? 0)}/>
                    ),
                },
                {
                    title: "Z",
                    width: 100,
                    render: (_: any, __: any, index: number) => (
                        <InputNumber size="small" value={entries[index]?.position?.z} step={0.01}
                                     onChange={(value) => updatePosition(index, "z", value ?? 0)}/>
                    ),
                },
                {
                    title: "SKRT",
                    dataIndex: "skrt",
                    width: 80,
                    render: (_: any, __: any, index: number) => (
                        <InputNumber size="small" value={entries[index]?.skrt} precision={0}
                                     onChange={(value) => updateEntry(index, "skrt", value ?? 0)}/>
                    ),
                },
                {
                    title: "RL",
                    dataIndex: "rl",
                    width: 80,
                    render: (_: any, __: any, index: number) => (
                        <InputNumber size="small" value={entries[index]?.rl} precision={0}
                                     onChange={(value) => updateEntry(index, "rl", value ?? 0)}/>
                    ),
                },
                {
                    title: t('Common.operate'),
                    width: 60,
                    render: (_: any, __: any, index: number) => (
                        <Button size="small" type="text" danger icon={<DeleteOutlined/>}
                                onClick={() => removeEntry(index)}/>
                    ),
                },
            ];

            return (
                <div>
                    <Space style={{marginBottom: 8}}>
                        <Typography.Text>{t('HitCheckEditor.signature')}: {String(data?.signature ?? "")}</Typography.Text>
                        <Typography.Text
                            type="secondary">{t('HitCheckEditor.entry_count', {count: entries.length})}</Typography.Text>
                        <Button size="small" icon={<PlusOutlined/>} onClick={addEntry}>
                            {t('HitCheckEditor.add_entry')}
                        </Button>
                    </Space>
                    <Table
                        size="small"
                        rowKey={(_, index) => String(index)}
                        columns={columns as any}
                        dataSource={entries}
                        pagination={false}
                        scroll={{y: "calc(100vh - 320px)"}}
                    />
                </div>
            );
        };

        return <BaseFormatEditor {...props} ref={ref} renderStyle1={renderStyle1}/>;
    }
);

export default HitCheckEditor;
