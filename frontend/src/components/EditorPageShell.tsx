// frontend/src/components/EditorPageShell.tsx
import React, {useRef} from "react";
import {useLocation} from "react-router-dom";
import {Layout} from "antd";
import {useTranslation} from "react-i18next";
import NavBar from "./NavBar";
import useFileHandlers from "../hooks/fileHandler";
import {FileInfo} from "../../bindings/github.com/MeidoPromotionAssociation/MeidoSerialization/v2/service/COM3D2/models";
import {KCESFormatDef, selectPattern} from "../utils/consts";
import {FormatEditorRef} from "./common/BaseFormatEditor";
import PayloadEditor from "./PayloadEditor";
import JsonTextEditor from "./JsonTextEditor";
import HitCheckEditor from "./HitCheckEditor";
import NeiEditor from "./NeiEditor";
import AutoFormEditor from "./AutoFormEditor";
import MenuAssetsEditor from "./MenuAssetsEditor";
import MaterialAssetsEditor from "./MaterialAssetsEditor";
import PMatAssetsEditor from "./PMatAssetsEditor";
import SadEditor from "./SadEditor";
import MaidColliderEditor from "./MaidColliderEditor";
import KCESModelEditor from "./KCESModelEditor";
import PskEditor from "./PskEditor";
import Texture2DEditor from "./Texture2DEditor";

const {Content} = Layout;

/** 根据格式选择编辑器组件 */
function editorComponentFor(format: KCESFormatDef) {
    if (format.group === "physics") {
        return PayloadEditor;
    }
    switch (format.key) {
        case "menuassets":
            return MenuAssetsEditor;
        case "materialassets":
            return MaterialAssetsEditor;
        case "pmatassets":
            return PMatAssetsEditor;
        case "model":
            return KCESModelEditor;
        case "texture2d":
            return Texture2DEditor;
        case "sad":
            return SadEditor;
        case "maidcollider":
            return MaidColliderEditor;
        case "psk":
            return PskEditor;
        case "nson":
        case "undressdat":
        case "undresspdat":
            return JsonTextEditor;
        case "hitcheck":
            return HitCheckEditor;
        case "nei":
            return NeiEditor;
        default:
            return AutoFormEditor;
    }
}

/**
 * EditorPageShell 每个格式的编辑器页面外壳
 * 与 COM3D2_MOD_EDITOR 的 XxxEditorPage 相同结构：NavBar + 编辑器本体（通过 ref 联动打开/保存/另存为）
 */
const EditorPageShell: React.FC<{ format: KCESFormatDef }> = ({format}) => {
    const {t} = useTranslation();
    const location = useLocation();
    const {handleSelectFile, handleSaveFile, handleSaveAsFile} = useFileHandlers();

    // 从路由 state 中获取 fileInfo
    const state = location.state as { fileInfo: FileInfo } | undefined;
    const fileInfo = state?.fileInfo;

    // 用 ref 获取编辑器实例
    const editorRef = useRef<FormatEditorRef>(null);

    const EditorComponent = editorComponentFor(format);

    return (
        <Layout style={{height: "100vh"}}>
            <NavBar
                onSelectFile={() => handleSelectFile(selectPattern(format), t(`Formats.${format.key}`))}
                onSaveFile={() => handleSaveFile(editorRef)}
                onSaveAsFile={() => handleSaveAsFile(editorRef)}
            />
            <Content style={{padding: 0, overflow: "auto"}}>
                <EditorComponent key={format.key} fileInfo={fileInfo} format={format} ref={editorRef}/>
            </Content>
        </Layout>
    );
};

export default EditorPageShell;
