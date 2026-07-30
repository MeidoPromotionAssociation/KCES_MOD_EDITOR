import React, {useMemo, useState} from "react";
import {Button, Empty, Input, List, Popconfirm, Space, Typography} from "antd";
import {CopyOutlined, DeleteOutlined, PlusOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import {losslessParse, losslessStringify} from "../../utils/losslessJson";

/**
 * AssetContainerEditor 服装部件容器（menuassets/materialassets）共用的样式1框架
 * 左侧：搜索 + 资产列表（按 fileName），支持新增/克隆/删除
 * 右侧：选中资产的专用表单
 */

// 左侧列表一次最多渲染的条目数，超过时提示继续输入过滤
const MaxListItems = 300;

interface AssetContainerEditorProps {
    /** 容器数据：{fileName, assetArray: [...]} */
    data: any;
    setData: (value: any) => void;
    /** 单个资产的显示标签 */
    itemLabel: (asset: any, index: number) => string;
    /** 选中资产的编辑表单 */
    renderForm: (asset: any, updateAsset: (next: any) => void) => React.ReactNode;
    /** 新建资产模板 */
    newAsset: () => any;
}

const AssetContainerEditor: React.FC<AssetContainerEditorProps> = ({
                                                                       data,
                                                                       setData,
                                                                       itemLabel,
                                                                       renderForm,
                                                                       newAsset,
                                                                   }) => {
    const {t} = useTranslation();
    const [search, setSearch] = useState("");
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    const assets: any[] = Array.isArray(data?.assetArray) ? data.assetArray : [];

    // 过滤后的 [索引, 资产] 列表
    const filtered = useMemo(() => {
        const lower = search.trim().toLowerCase();
        const result: Array<{ index: number; asset: any }> = [];
        for (let index = 0; index < assets.length; index++) {
            if (!lower || itemLabel(assets[index], index).toLowerCase().includes(lower)) {
                result.push({index, asset: assets[index]});
                if (result.length >= MaxListItems + 1) break;
            }
        }
        return result;
    }, [assets, search, itemLabel]);

    const overflowing = filtered.length > MaxListItems;
    const visible = overflowing ? filtered.slice(0, MaxListItems) : filtered;

    const updateAsset = (index: number, next: any) => {
        const nextAssets = [...assets];
        nextAssets[index] = next;
        setData({...data, assetArray: nextAssets});
    };

    const removeAsset = (index: number) => {
        const nextAssets = [...assets];
        nextAssets.splice(index, 1);
        setData({...data, assetArray: nextAssets});
        setSelectedIndex(null);
    };

    const addAsset = (template: any) => {
        setData({...data, assetArray: [...assets, template]});
        setSelectedIndex(assets.length);
    };

    const selectedAsset = selectedIndex !== null ? assets[selectedIndex] : null;

    return (
        <div style={{display: "flex", gap: 12, height: "calc(100vh - 215px)", textAlign: "left"}}>
            {/* 左侧列表 */}
            <div style={{width: 320, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8}}>
                <Space.Compact block>
                    <Input
                        allowClear
                        placeholder={t('PartsEditor.search_placeholder')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <Button icon={<PlusOutlined/>} onClick={() => addAsset(newAsset())}
                            title={t('PartsEditor.add_asset')}/>
                </Space.Compact>
                <Typography.Text type="secondary">
                    {t('PartsEditor.asset_count', {count: assets.length})}
                    {overflowing && ` · ${t('PartsEditor.list_truncated', {count: MaxListItems})}`}
                </Typography.Text>
                <div style={{flex: 1, overflow: "auto", border: "1px solid rgba(128,128,128,0.25)", borderRadius: 6}}>
                    <List
                        size="small"
                        dataSource={visible}
                        renderItem={({index, asset}) => (
                            <List.Item
                                style={{
                                    cursor: "pointer",
                                    padding: "4px 10px",
                                    background: index === selectedIndex ? "rgba(22,119,255,0.15)" : undefined,
                                }}
                                onClick={() => setSelectedIndex(index)}
                            >
                                <Typography.Text ellipsis={{tooltip: itemLabel(asset, index)}} style={{maxWidth: 280}}>
                                    {itemLabel(asset, index)}
                                </Typography.Text>
                            </List.Item>
                        )}
                    />
                </div>
            </div>

            {/* 右侧编辑面板 */}
            <div style={{flex: 1, overflow: "auto", minWidth: 0}}>
                {selectedAsset !== null && selectedIndex !== null ? (
                    <div>
                        <Space style={{marginBottom: 8}}>
                            <Button
                                size="small"
                                icon={<CopyOutlined/>}
                                onClick={() => addAsset(losslessParse(losslessStringify(selectedAsset)))}
                            >
                                {t('PartsEditor.clone_asset')}
                            </Button>
                            <Popconfirm
                                title={t('PartsEditor.delete_asset_confirm')}
                                onConfirm={() => removeAsset(selectedIndex)}
                            >
                                <Button size="small" danger icon={<DeleteOutlined/>}>
                                    {t('PartsEditor.delete_asset')}
                                </Button>
                            </Popconfirm>
                        </Space>
                        {renderForm(selectedAsset, (next) => updateAsset(selectedIndex, next))}
                    </div>
                ) : (
                    <Empty description={t('PartsEditor.select_asset_hint')} style={{marginTop: 80}}/>
                )}
            </div>
        </div>
    );
};

export default AssetContainerEditor;
