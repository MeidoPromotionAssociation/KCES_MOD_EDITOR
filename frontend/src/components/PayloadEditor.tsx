import {forwardRef} from "react";
import {Typography} from "antd";
import {useTranslation} from "react-i18next";
import BaseFormatEditor, {BaseFormatEditorProps, FormatEditorRef} from "./common/BaseFormatEditor";
import JsonObjectForm from "./common/JsonObjectForm";
import DynamicBoneForm from "./payload/DynamicBoneForm";
import ClothParamsForm from "./payload/ClothParamsForm";
import MagicaClothForm from "./payload/MagicaClothForm";
import {ColliderPackageForm, IKColliderForm, LimbColliderForm} from "./payload/colliderForms";

/**
 * PayloadKinds 各物理格式的载荷类型
 * 库 v2 移除了 KCESPayloadEnvelope，编辑 JSON 的根就是载荷对象本身，
 * 载荷类型不再由封套的 kind 字段声明，而是完全由扩展名（即格式 key）决定，
 * 与库 EncodeKCESPayload 的扩展名→根类型契约一致
 */
const PayloadKinds: Record<string, "dynamicBone" | "collider" | "limbCollider" | "ikCollider" | "clothParams" | "magicaCloth"> = {
    dbconf: "dynamicBone",
    dbcol: "collider",
    dslcol: "collider",
    db2conf: "magicaCloth",
    dsb2conf: "magicaCloth",
    dsl2conf: "magicaCloth",
    dsbconf: "clothParams",
    dslconf: "clothParams",
    ikcol: "ikCollider",
    ikcolbytes: "ikCollider",
    limbcol: "limbCollider",
};

/**
 * PayloadEditor 物理载荷格式共用编辑器
 * 适用于 dbconf/dbcol/db2conf/dsbconf/dsb2conf/dslconf/dsl2conf/dslcol/ikcol/ikcol.bytes/limbcol
 * 样式1：按扩展名对应的载荷类型渲染专用表单
 *   - dynamicBone：动态骨骼表单（基准值 + 关键帧曲线编辑器，移植自 COM3D2 PhyEditor）
 *   - clothParams：MagicaCloth 布料表单（BezierParam 曲线参数控件）
 *   - magicaCloth：MagicaCloth2 ClothSerializeData 表单（含 Unity 曲线编辑）
 *   - collider 系：碰撞体包表单
 * 样式2：完整 JSON
 */
const PayloadEditor = forwardRef<FormatEditorRef, Omit<BaseFormatEditorProps, "renderStyle1" | "renderHeader">>(
    (props, ref) => {
        const {t} = useTranslation();
        const kind = PayloadKinds[props.format.key];

        const renderStyle1 = (data: any, setData: (value: any) => void) => {
            // 根为 null 表示 MessagePack 根值为 nil，没有可编辑的结构
            if (data === null || typeof data !== "object") {
                return <Typography.Text type="secondary">{t('Infos.payload_no_structured_root')}</Typography.Text>;
            }

            const renderForm = () => {
                switch (kind) {
                    case "dynamicBone":
                        return <DynamicBoneForm status={data} onChange={setData}/>;
                    case "clothParams":
                        return <ClothParamsForm params={data} onChange={setData}/>;
                    case "magicaCloth":
                        return <MagicaClothForm params={data} onChange={setData}/>;
                    case "collider":
                        return <ColliderPackageForm value={data} onChange={setData}/>;
                    case "limbCollider":
                        return <LimbColliderForm value={data} onChange={setData}/>;
                    case "ikCollider":
                        return <IKColliderForm value={data} onChange={setData}/>;
                    default:
                        return <JsonObjectForm value={data} onChange={setData} defaultExpandDepth={1}/>;
                }
            };

            return (
                <div style={{height: "calc(100vh - 230px)", overflow: "auto"}}>
                    {renderForm()}
                </div>
            );
        };

        return <BaseFormatEditor {...props} ref={ref} renderStyle1={renderStyle1}/>;
    }
);

export default PayloadEditor;
