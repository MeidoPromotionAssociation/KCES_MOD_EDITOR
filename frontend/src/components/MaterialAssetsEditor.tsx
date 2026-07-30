import {forwardRef} from "react";
import BaseFormatEditor, {BaseFormatEditorProps, FormatEditorRef} from "./common/BaseFormatEditor";
import AssetContainerEditor from "./parts/AssetContainerEditor";
import MaterialAssetForm from "./parts/MaterialAssetForm";
import {numberToString} from "../utils/losslessJson";

/**
 * MaterialAssetsEditor .materialassets 专用编辑器
 * 样式1：资产列表 + 材质属性表单；样式2：完整 JSON
 */
const MaterialAssetsEditor = forwardRef<FormatEditorRef, Omit<BaseFormatEditorProps, "renderStyle1" | "renderHeader">>(
    (props, ref) => {
        const renderStyle1 = (data: any, setData: (value: any) => void) => (
            <AssetContainerEditor
                data={data}
                setData={setData}
                itemLabel={(asset) => asset?.fileName ?? numberToString(asset?.id ?? "")}
                renderForm={(asset, updateAsset) => <MaterialAssetForm asset={asset} onChange={updateAsset}/>}
                newAsset={() => ({
                    version: 1000,
                    id: 0,
                    fileName: "new_material.mate",
                    shaderName: "CM3D2/Toony_Lighted_Outline",
                    textureProps: [],
                    colorProps: [],
                    vectorProps: [],
                    floatProps: [],
                })}
            />
        );

        return <BaseFormatEditor {...props} ref={ref} renderStyle1={renderStyle1}/>;
    }
);

export default MaterialAssetsEditor;
