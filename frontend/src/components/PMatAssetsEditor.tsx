import {forwardRef, useMemo, useState} from "react";
import {Button, Input, Space, Table, Typography} from "antd";
import {DeleteOutlined, PlusOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import BaseFormatEditor, {BaseFormatEditorProps, FormatEditorRef} from "./common/BaseFormatEditor";
import BigIntInput from "./common/BigIntInput";
import {NullableStringInput, NumberField} from "./parts/formControls";

/**
 * PMatAssetsEditor .pmatassets 专用编辑器
 * 样式1：可搜索、分页的优先级材质表格（fileName / renderQueue / targetId 等）；样式2：完整 JSON
 */

// PMatTable 独立成组件以便使用 hooks（搜索状态）
const PMatTable: React.FC<{ data: any; setData: (value: any) => void }> = ({data, setData}) => {
    const {t} = useTranslation();
    const [search, setSearch] = useState("");

    const assets: any[] = Array.isArray(data?.assetArray) ? data.assetArray : [];

    // 过滤时保留原索引，编辑操作按原索引写回
    const filtered = useMemo(() => {
        const lower = search.trim().toLowerCase();
        return assets
            .map((asset, index) => ({asset, index}))
            .filter(({asset}) => !lower || String(asset?.fileName ?? "").toLowerCase().includes(lower));
    }, [assets, search]);

    const updateAsset = (index: number, next: any) => {
        const list = [...assets];
        list[index] = next;
        setData({...data, assetArray: list});
    };

    const removeAsset = (index: number) => {
        const list = [...assets];
        list.splice(index, 1);
        setData({...data, assetArray: list});
    };

    const addAsset = () => {
        const template = {version: 1000, id: 0, fileName: "new_material.pmat", renderQueue: 2000, targetId: 0};
        setData({...data, assetArray: [...assets, template]});
    };

    const columns = [
        {
            title: "fileName",
            width: 320,
            render: (_: any, record: { asset: any; index: number }) => (
                <NullableStringInput value={record.asset?.fileName}
                                     onChange={(v) => updateAsset(record.index, {...record.asset, fileName: v})}/>
            ),
        },
        {
            title: "renderQueue",
            width: 140,
            render: (_: any, record: { asset: any; index: number }) => (
                <NumberField width={120} value={record.asset?.renderQueue}
                             onChange={(v) => updateAsset(record.index, {...record.asset, renderQueue: v})}/>
            ),
        },
        {
            title: "targetId",
            width: 220,
            render: (_: any, record: { asset: any; index: number }) => (
                <BigIntInput value={record.asset?.targetId}
                             onChange={(v) => updateAsset(record.index, {...record.asset, targetId: v})}/>
            ),
        },
        {
            title: "id",
            width: 220,
            render: (_: any, record: { asset: any; index: number }) => (
                <BigIntInput value={record.asset?.id}
                             onChange={(v) => updateAsset(record.index, {...record.asset, id: v})}/>
            ),
        },
        {
            title: "version",
            width: 100,
            render: (_: any, record: { asset: any; index: number }) => (
                <NumberField width={80} precision={0} value={record.asset?.version}
                             onChange={(v) => updateAsset(record.index, {...record.asset, version: v})}/>
            ),
        },
        {
            title: t('Common.operate'),
            width: 60,
            render: (_: any, record: { asset: any; index: number }) => (
                <Button size="small" type="text" danger icon={<DeleteOutlined/>}
                        onClick={() => removeAsset(record.index)}/>
            ),
        },
    ];

    return (
        <div style={{textAlign: "left"}}>
            <Space style={{marginBottom: 8}}>
                <Input
                    allowClear
                    style={{width: 300}}
                    placeholder={t('PartsEditor.search_placeholder')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <Button size="small" icon={<PlusOutlined/>} onClick={addAsset}>
                    {t('PartsEditor.add_asset')}
                </Button>
                <Typography.Text type="secondary">
                    {t('PartsEditor.asset_count', {count: assets.length})}
                </Typography.Text>
            </Space>
            <Table
                size="small"
                rowKey={(record) => String(record.index)}
                columns={columns as any}
                dataSource={filtered}
                pagination={{pageSize: 10, showSizeChanger: false}}
                scroll={{y: "calc(100vh - 220px)"}}
            />
        </div>
    );
};

const PMatAssetsEditor = forwardRef<FormatEditorRef, Omit<BaseFormatEditorProps, "renderStyle1" | "renderHeader">>(
    (props, ref) => {
        const renderStyle1 = (data: any, setData: (value: any) => void) => (
            <PMatTable data={data} setData={setData}/>
        );

        return <BaseFormatEditor {...props} ref={ref} renderStyle1={renderStyle1}/>;
    }
);

export default PMatAssetsEditor;
