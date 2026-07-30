import {forwardRef} from "react";
import {Descriptions, Typography} from "antd";
import {useTranslation} from "react-i18next";
import BaseFormatEditor, {BaseFormatEditorProps, FormatEditorRef} from "./common/BaseFormatEditor";
import JsonObjectForm from "./common/JsonObjectForm";
import MonacoJsonEditor from "./common/MonacoJsonEditor";
import DynamicBoneForm from "./payload/DynamicBoneForm";
import ClothParamsForm from "./payload/ClothParamsForm";
import MagicaClothForm from "./payload/MagicaClothForm";
import {ColliderPackageForm, IKColliderForm, LimbColliderForm} from "./payload/colliderForms";

// KCES payload 封套的 union 分支字段，同一时间只有一个分支处于激活状态
const PayloadBranches = [
    "dynamicBoneStatus",
    "colliderPackage",
    "limbColliderPackage",
    "ikColliderPackage",
    "clothParams",
] as const;

/**
 * PayloadEditor 物理载荷格式共用编辑器
 * 适用于 dbconf/dbcol/db2conf/dsbconf/dsb2conf/dslconf/dsl2conf/dslcol/ikcol/ikcol.bytes/limbcol
 * 样式1：封套信息 + 激活分支的专用表单
 *   - dynamicBoneStatus：动态骨骼表单（基准值 + 关键帧曲线编辑器，移植自 COM3D2 PhyEditor）
 *   - clothParams：MagicaCloth 布料表单（BezierParam 曲线参数控件）
 *   - collider 系分支：通用递归表单
 * 样式2：完整 JSON
 */
const PayloadEditor = forwardRef<FormatEditorRef, Omit<BaseFormatEditorProps, "renderStyle1" | "renderHeader">>(
    (props, ref) => {
        const {t} = useTranslation();

        const renderStyle1 = (data: any, setData: (value: any) => void) => {
            if (typeof data !== "object" || data === null) {
                return <JsonObjectForm value={data} onChange={setData}/>;
            }

            const activeBranch = PayloadBranches.find((branch) => data[branch] !== undefined && data[branch] !== null);

            const renderBranch = () => {
                if (!activeBranch) {
                    if (data.json !== undefined) {
                        // MagicaCloth2 系（.db2conf/.dsb2conf/.dsl2conf）的 JSON 字符串载荷：
                        // 对象形态用专用表单（含 Unity 曲线编辑），否则回退 Monaco
                        if (typeof data.json === "object" && data.json !== null && !Array.isArray(data.json)) {
                            return (
                                <MagicaClothForm
                                    params={data.json}
                                    onChange={(newValue) => setData({...data, json: newValue})}
                                />
                            );
                        }
                        return (
                            <>
                                <Typography.Title level={5} style={{textAlign: "left"}}>json</Typography.Title>
                                <MonacoJsonEditor
                                    data={data.json}
                                    setData={(newValue) => setData({...data, json: newValue})}
                                    height="calc(100vh - 320px)"
                                />
                            </>
                        );
                    }
                    return <Typography.Text type="secondary">{t('Infos.payload_no_active_branch')}</Typography.Text>;
                }

                const branchValue = data[activeBranch];
                const setBranch = (newValue: any) => setData({...data, [activeBranch]: newValue});

                if (activeBranch === "dynamicBoneStatus") {
                    return <DynamicBoneForm status={branchValue} onChange={setBranch}/>;
                }
                if (activeBranch === "clothParams") {
                    return <ClothParamsForm params={branchValue} onChange={setBranch}/>;
                }
                if (activeBranch === "colliderPackage") {
                    return <ColliderPackageForm value={branchValue} onChange={setBranch}/>;
                }
                if (activeBranch === "limbColliderPackage") {
                    return <LimbColliderForm value={branchValue} onChange={setBranch}/>;
                }
                if (activeBranch === "ikColliderPackage") {
                    return <IKColliderForm value={branchValue} onChange={setBranch}/>;
                }
                return (
                    <>
                        <Typography.Title level={5} style={{textAlign: "left"}}>{activeBranch}</Typography.Title>
                        <JsonObjectForm value={branchValue} onChange={setBranch} defaultExpandDepth={1}/>
                    </>
                );
            };

            return (
                <div>
                    <Descriptions size="small" column={4} bordered style={{marginBottom: 8}}>
                        <Descriptions.Item label="format">{String(data.format ?? "")}</Descriptions.Item>
                        <Descriptions.Item label="extension">{String(data.extension ?? "")}</Descriptions.Item>
                        <Descriptions.Item label="storageVariant">{String(data.storageVariant ?? "")}</Descriptions.Item>
                        <Descriptions.Item label="kind">{String(data.kind ?? "")}</Descriptions.Item>
                    </Descriptions>
                    <div style={{height: "calc(100vh - 280px)", overflow: "auto"}}>
                        {renderBranch()}
                    </div>
                </div>
            );
        };

        return <BaseFormatEditor {...props} ref={ref} renderStyle1={renderStyle1}/>;
    }
);

export default PayloadEditor;
