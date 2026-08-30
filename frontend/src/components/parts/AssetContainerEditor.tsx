import React, {useEffect, useMemo, useRef, useState} from "react";
import {Button, Empty, Input, Popconfirm, Space, Splitter, theme, Typography} from "antd";
import {CopyOutlined, DeleteOutlined, PlusOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import {useVirtualizer} from "@tanstack/react-virtual";
import {losslessParse, losslessStringify} from "../../utils/losslessJson";
import {AssetListWidthKey} from "../../utils/LocalStorageKeys";

/**
 * AssetContainerEditor 服装部件容器（menuassets/materialassets）共用的样式1框架
 * 左侧：搜索 + 资产列表（按 fileName），支持新增/克隆/删除
 * 右侧：选中资产的专用表单
 *
 * parts.menuassets 这类整合包动辄上千项，列表用 @tanstack/react-virtual 只渲染视口内的行，
 * 因此不再截断（旧实现只显示前 300 项，多出来的必须靠搜索才能碰到）。
 * 左右宽度用 Splitter 交给用户拖，结果记在 localStorage 里跨会话保留。
 */

// 列表行高：虚拟滚动需要预估高度，这里固定行高并写进行样式，保证预估与实测一致
const ItemHeight = 30;
// 左侧列表宽度的默认值与可拖动范围（px）
const DefaultListWidth = 320;
const MinListWidth = 20;
const MaxListWidth = 720;

/** 读取上次拖动后的列表宽度，未设置或超出范围时回落到默认值 */
function readStoredListWidth(): number {
    const saved = Number(localStorage.getItem(AssetListWidthKey));
    if (!Number.isFinite(saved) || saved <= 0) return DefaultListWidth;
    return Math.min(Math.max(saved, MinListWidth), MaxListWidth);
}

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
    const {token} = theme.useToken();
    const [search, setSearch] = useState("");
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [initialListWidth] = useState(readStoredListWidth);
    const scrollRef = useRef<HTMLDivElement>(null);
    // 新增/克隆出来的项要滚进视口，但它得先出现在过滤结果里，所以记下索引等下一帧再滚
    const pendingScroll = useRef<number | null>(null);

    const assets: any[] = Array.isArray(data?.assetArray) ? data.assetArray : [];

    // 命中搜索的资产在 assetArray 里的原始索引；编辑与删除都按原始索引写回
    const visibleIndexes = useMemo(() => {
        const lower = search.trim().toLowerCase();
        const result: number[] = [];
        for (let index = 0; index < assets.length; index++) {
            if (!lower || itemLabel(assets[index], index).toLowerCase().includes(lower)) {
                result.push(index);
            }
        }
        return result;
    }, [assets, search, itemLabel]);

    const virtualizer = useVirtualizer({
        count: visibleIndexes.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => ItemHeight,
        overscan: 12,
    });

    // 新增/克隆的项通常落在视口外，等它出现在过滤结果里再滚过去
    useEffect(() => {
        if (pendingScroll.current === null) return;
        const position = visibleIndexes.indexOf(pendingScroll.current);
        pendingScroll.current = null;
        if (position >= 0) virtualizer.scrollToIndex(position, {align: "center"});
    }, [visibleIndexes, virtualizer]);

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
        pendingScroll.current = assets.length;
    };

    // 上下方向键在过滤结果里移动选中项，并把它滚进视口
    const moveSelection = (delta: number) => {
        if (visibleIndexes.length === 0) return;
        const current = selectedIndex === null ? -1 : visibleIndexes.indexOf(selectedIndex);
        const next = Math.min(Math.max(current + delta, 0), visibleIndexes.length - 1);
        setSelectedIndex(visibleIndexes[next]);
        virtualizer.scrollToIndex(next);
    };

    const handleListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            moveSelection(1);
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            moveSelection(-1);
        }
    };

    const selectedAsset = selectedIndex !== null ? assets[selectedIndex] : null;

    return (
        <Splitter
            style={{height: "calc(100vh - 135px)", textAlign: "left"}}
            onResizeEnd={(sizes) => localStorage.setItem(AssetListWidthKey, String(Math.round(sizes[0])))}
        >
            {/* 左侧列表 */}
            <Splitter.Panel
                defaultSize={initialListWidth}
                min={MinListWidth}
                max={MaxListWidth}
                collapsible
                style={{display: "flex", flexDirection: "column", gap: 8, paddingRight: 8}}
            >
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
                </Typography.Text>
                <div
                    ref={scrollRef}
                    role="listbox"
                    tabIndex={0}
                    aria-label={t('PartsEditor.asset_list')}
                    aria-activedescendant={selectedIndex !== null ? `asset-option-${selectedIndex}` : undefined}
                    onKeyDown={handleListKeyDown}
                    style={{
                        flex: 1,
                        overflow: "auto",
                        border: `1px solid ${token.colorBorderSecondary}`,
                        borderRadius: token.borderRadius,
                        // 页面底色是固定的浅色渐变，深色主题下不给容器铺底色文字会看不清；
                        // 其余数据容器（antd Table）也都是 colorBgContainer 打底
                        background: token.colorBgContainer,
                    }}
                >
                    <div style={{height: virtualizer.getTotalSize(), position: "relative"}}>
                        {virtualizer.getVirtualItems().map((row) => {
                            const index = visibleIndexes[row.index];
                            const label = itemLabel(assets[index], index);
                            const selected = index === selectedIndex;
                            return (
                                <div
                                    key={row.key}
                                    id={`asset-option-${index}`}
                                    role="option"
                                    aria-selected={selected}
                                    onClick={() => setSelectedIndex(index)}
                                    style={{
                                        position: "absolute",
                                        top: row.start,
                                        left: 0,
                                        width: "100%",
                                        height: row.size,
                                        display: "flex",
                                        alignItems: "center",
                                        padding: "0 10px",
                                        cursor: "pointer",
                                        background: selected ? token.controlItemBgActive : undefined,
                                    }}
                                >
                                    <Typography.Text ellipsis={{tooltip: label}} style={{width: "100%"}}>
                                        {label}
                                    </Typography.Text>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Splitter.Panel>

            {/* 右侧编辑面板 */}
            <Splitter.Panel style={{overflow: "auto", minWidth: 0, paddingLeft: 8}}>
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
            </Splitter.Panel>
        </Splitter>
    );
};

export default AssetContainerEditor;