import {forwardRef, useState} from "react";
import {Radio} from "antd";
import {useTranslation} from "react-i18next";
import BaseFormatEditor, {BaseFormatEditorProps, FormatEditorRef} from "./common/BaseFormatEditor";
import AssetContainerEditor from "./parts/AssetContainerEditor";
import MaterialAssetForm from "./parts/MaterialAssetForm";
import type {MaterialFormLayout} from "./parts/MaterialPropertyItem";
import {MaterialFormLayoutKey} from "../utils/LocalStorageKeys";
import {numberToString} from "../utils/losslessJson";

/**
 * MaterialAssetsEditor .materialassets 专用编辑器
 * 样式1：资产列表 + 材质属性表单；样式2：完整 JSON
 *
 * 表单版式的选择器与克隆/删除同处一栏（都在资产工具栏上），所以状态放在这里，表单只按 layout 排版；
 * 选中的版式跨会话保留。
 */
const MaterialAssetsEditor = forwardRef<FormatEditorRef, Omit<BaseFormatEditorProps, "renderStyle1" | "renderHeader">>(
    (props, ref) => {
        const {t} = useTranslation();
        const [layout, setLayout] = useState<MaterialFormLayout>(
            () => (localStorage.getItem(MaterialFormLayoutKey) as MaterialFormLayout) || "compact"
        );
        const changeLayout = (next: MaterialFormLayout) => {
            setLayout(next);
            localStorage.setItem(MaterialFormLayoutKey, next);
        };

        const renderStyle1 = (data: any, setData: (value: any) => void) => (
            <AssetContainerEditor
                data={data}
                setData={setData}
                itemLabel={(asset) => asset?.fileName ?? numberToString(asset?.id ?? "")}
                toolbarExtra={
                    <Radio.Group
                        size="small"
                        optionType="button"
                        buttonStyle="solid"
                        value={layout}
                        onChange={(e) => changeLayout(e.target.value)}
                        options={[
                            {label: t('MaterialAssetsEditor.layout_compact'), value: 'compact'},
                            {label: t('MaterialAssetsEditor.layout_labeled'), value: 'labeled'},
                            {label: t('MaterialAssetsEditor.layout_sidebar'), value: 'sidebar'},
                        ]}
                    />
                }
                renderForm={(asset, updateAsset) =>
                    <MaterialAssetForm asset={asset} onChange={updateAsset} layout={layout}/>}
                newAsset={() => ({
                    version: 1000,
                    id: 0,
                    fileName: "new_material.mate",
                    shaderName: "CM3D2/Toony_Lighted_Outline",
                    textureProps: [],
                    colorProps: [],
                    vectorProps: [],
                    floatProps: [],
                    // KCES2 是一等公民：新建材质默认用 10 槽布局，才能写 keywordProps 与 renderQueue
                    keywordProps: [],
                    renderQueue: 0,
                    indexedArrayWidth: 10,
                })}
            />
        );

        return <BaseFormatEditor {...props} ref={ref} renderStyle1={renderStyle1}/>;
    }
);

export default MaterialAssetsEditor;