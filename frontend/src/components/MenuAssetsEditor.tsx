import {forwardRef} from "react";
import BaseFormatEditor, {BaseFormatEditorProps, FormatEditorRef} from "./common/BaseFormatEditor";
import AssetContainerEditor from "./parts/AssetContainerEditor";
import MenuAssetForm from "./parts/MenuAssetForm";
import {numberToString} from "../utils/losslessJson";

/**
 * MenuAssetsEditor .menuassets 专用编辑器
 * 样式1：资产列表 + 菜单字段与命令列表表单；样式2：完整 JSON
 */
const MenuAssetsEditor = forwardRef<FormatEditorRef, Omit<BaseFormatEditorProps, "renderStyle1" | "renderHeader">>(
    (props, ref) => {
        const renderStyle1 = (data: any, setData: (value: any) => void) => (
            <AssetContainerEditor
                data={data}
                setData={setData}
                itemLabel={(asset) => asset?.fileName ?? numberToString(asset?.id ?? "")}
                renderForm={(asset, updateAsset) => <MenuAssetForm asset={asset} onChange={updateAsset}/>}
                newAsset={() => ({
                    version: 1005,
                    guid: 0,
                    id: 0,
                    fileName: "new_item.menu",
                    itemName: "",
                    iconFileName: "",
                    infoText: "",
                    priority: 0,
                    parentId: 0,
                    isMan: false,
                    isDiff: false,
                    isDelete: false,
                    commandList: [],
                    categoryText: "",
                    colorSetText: "",
                    defineTagNames: 0,
                    preMulTexDatas: null,
                    colvariFileNameExp: null,
                    colvariInfo: null,
                    srcFileHashCRC32: 0,
                    defineFirst: 0,
                    partsVer: null,
                    isRecommendMan: false,
                    targetBodyType: 0,
                    attribute: 0,
                    hideInEdit: false,
                    toeLockSlotId: null,
                    exportModelFormTextureName: null,
                    isHarayureAvailable: 0,
                    skirt_phys: 0,
                })}
            />
        );

        return <BaseFormatEditor {...props} ref={ref} renderStyle1={renderStyle1}/>;
    }
);

export default MenuAssetsEditor;
