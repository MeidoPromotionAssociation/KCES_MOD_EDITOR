import {forwardRef, useEffect, useMemo, useRef, useState} from "react";
import {Button, Flex, Input, Pagination, Space, Table, theme, Tooltip, Typography} from "antd";
import {DeleteOutlined, PlusOutlined, QuestionCircleOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import BaseFormatEditor, {BaseFormatEditorProps, FormatEditorRef} from "./common/BaseFormatEditor";
import BigIntInput from "./common/BigIntInput";
import {NullableStringInput, NumberField} from "./parts/formControls";

/**
 * PMatAssetsEditor .pmatassets 专用编辑器
 * 样式1：可搜索、分页的优先级材质表格（fileName / renderQueue / targetId 等）；样式2：完整 JSON
 */

// 每页条数；分页固定在容器右下角，表格本体占满剩余高度
const PageSize = 10;

// PMatTable 独立成组件以便使用 hooks（搜索状态）
const PMatTable: React.FC<{ data: any; setData: (value: any) => void }> = ({data, setData}) => {
    const {t} = useTranslation();
    const {token} = theme.useToken();
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    // 表格区被 flex 拉伸后的实际高度再减去表头高度就是滚动区高度，
    // 用 ResizeObserver 跟随窗口缩放，避免 calc(100vh - X) 这类估高常数与真实布局对不上
    const tableAreaRef = useRef<HTMLDivElement>(null);
    const [bodyHeight, setBodyHeight] = useState(0);
    useEffect(() => {
        const area = tableAreaRef.current;
        if (!area) return;
        const measure = () => {
            const head = area.querySelector<HTMLElement>(".ant-table-thead");
            const headH = head ? head.offsetHeight : 0;
            setBodyHeight(Math.max(80, area.clientHeight - headH));
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(area);
        return () => observer.disconnect();
    }, []);

    const assets: any[] = Array.isArray(data?.assetArray) ? data.assetArray : [];

    // 过滤时保留原索引，编辑操作按原索引写回
    const filtered = useMemo(() => {
        const lower = search.trim().toLowerCase();
        return assets
            .map((asset, index) => ({asset, index}))
            .filter(({asset}) => !lower || String(asset?.fileName ?? "").toLowerCase().includes(lower));
    }, [assets, search]);

    // 当前页数据；删除导致页数减少时回落到最后一页，避免页越界显示空表
    const totalPages = Math.max(1, Math.ceil(filtered.length / PageSize));
    const currentPage = Math.min(page, totalPages);
    const pageData = filtered.slice((currentPage - 1) * PageSize, currentPage * PageSize);

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
            title: <Flex gap="small">{t('Common.file_name')} <Tooltip title={t('Common.file_name_tooltip')}><QuestionCircleOutlined/></Tooltip></Flex>,
            width: 320,
            render: (_: any, record: { asset: any; index: number }) => (
                <NullableStringInput value={record.asset?.fileName}
                                     onChange={(v) => updateAsset(record.index, {...record.asset, fileName: v})}/>
            ),
        },
        {
            title: <Flex gap="small">{t('PMatAssetsEditor.render_queue')} <Tooltip title={t('PMatAssetsEditor.render_queue_tooltip')}><QuestionCircleOutlined/></Tooltip></Flex>,
            width: 140,
            render: (_: any, record: { asset: any; index: number }) => (
                <NumberField width={120} value={record.asset?.renderQueue}
                             onChange={(v) => updateAsset(record.index, {...record.asset, renderQueue: v})}/>
            ),
        },
        {
            title: <Flex gap="small">{t('PMatAssetsEditor.target_id')} <Tooltip title={t('PMatAssetsEditor.target_id_tooltip')}><QuestionCircleOutlined/></Tooltip></Flex>,
            width: 220,
            render: (_: any, record: { asset: any; index: number }) => (
                <BigIntInput value={record.asset?.targetId}
                             onChange={(v) => updateAsset(record.index, {...record.asset, targetId: v})}/>
            ),
        },
        {
            title: <Flex gap="small">{t('Common.id')} <Tooltip title={t('Common.id_tooltip')}><QuestionCircleOutlined/></Tooltip></Flex>,
            width: 220,
            render: (_: any, record: { asset: any; index: number }) => (
                <BigIntInput value={record.asset?.id}
                             onChange={(v) => updateAsset(record.index, {...record.asset, id: v})}/>
            ),
        },
        {
            title: <Flex gap="small">{t('Common.version')} <Tooltip title={t('Common.version_tooltip')}><QuestionCircleOutlined/></Tooltip></Flex>,
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
        <div style={{textAlign: "left", display: "flex", flexDirection: "column", flex: 1, minHeight: 0}}>
            <Space style={{marginBottom: 8, alignSelf: "flex-start", flexShrink: 0}}>
                <Input
                    allowClear
                    style={{width: 300}}
                    placeholder={t('PartsEditor.search_placeholder')}
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                />
                <Button size="small" icon={<PlusOutlined/>} onClick={addAsset}>
                    {t('PartsEditor.add_asset')}
                </Button>
                <Typography.Text type="secondary">
                    {t('PartsEditor.asset_count', {count: assets.length})}
                </Typography.Text>
            </Space>
            <div style={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                // 数据不满一页时表格块不会撑到容器底，用白色圆角容器把这块区域贴住窗口底边
                background: token.colorBgContainer,
                borderRadius: token.borderRadius,
            }}>
                {/* 表格本体占满剩余高度，数据不足时留白在这里 */}
                <div ref={tableAreaRef} style={{flex: 1, minHeight: 0, overflow: "hidden"}}>
                    <Table
                        size="small"
                        rowKey={(record) => String(record.index)}
                        columns={columns as any}
                        dataSource={pageData}
                        pagination={false}
                        scroll={{y: bodyHeight}}
                    />
                </div>
                {/* 分页固定在右下角 */}
                <div style={{display: "flex", justifyContent: "flex-end", padding: "8px 12px", flexShrink: 0}}>
                    <Pagination
                        size="small"
                        current={currentPage}
                        pageSize={PageSize}
                        total={filtered.length}
                        showSizeChanger={false}
                        onChange={setPage}
                    />
                </div>
            </div>
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