import React from "react";
import {Switch, Tag, Tooltip, Typography} from "antd";
import {useTranslation} from "react-i18next";
import BezierParamField, {isBezierParam} from "./BezierParamField";
import {NumberField} from "../parts/formControls";
import JsonObjectForm from "../common/JsonObjectForm";

/**
 * ClothParamsForm MagicaCloth ClothParams 专用表单（db2conf/dsbconf/dsb2conf/dslconf/dsl2conf 等布料载荷）
 * 逐字段渲染：BezierParam 字段用曲线参数控件（带迷你预览），布尔用开关，数值用输入框，
 * 其余复杂字段回退到通用递归表单
 */
const ClothParamsForm: React.FC<{
    params: any;
    onChange: (next: any) => void;
}> = ({params, onChange}) => {
    const {t} = useTranslation();

    const set = (field: string, value: any) => onChange({...params, [field]: value});

    const keys = Object.keys(params ?? {});

    return (
        <div style={{textAlign: "left", display: "flex", flexDirection: "column", gap: 4}}>
            {keys.map((key) => {
                const value = params[key];

                let control: React.ReactNode;
                if (value === null || value === undefined) {
                    control = (
                        <Tooltip title={t('JsonForm.null_value_tip')}>
                            <Tag>null</Tag>
                        </Tooltip>
                    );
                } else if (isBezierParam(value)) {
                    control = <BezierParamField value={value} onChange={(next) => set(key, next)}/>;
                } else if (typeof value === "boolean") {
                    control = <Switch size="small" checked={value} onChange={(checked) => set(key, checked)}/>;
                } else if (typeof value === "number") {
                    control = (
                        <NumberField
                            step={Number.isInteger(value) ? 1 : 0.01}
                            value={value}
                            onChange={(v) => set(key, v)}
                        />
                    );
                } else {
                    control = (
                        <JsonObjectForm
                            value={value}
                            onChange={(next) => set(key, next)}
                            defaultExpandDepth={0}
                        />
                    );
                }

                return (
                    <div key={key} style={{display: "flex", alignItems: "center", gap: 8, minHeight: 28}}>
                        <Typography.Text
                            style={{width: 260, flexShrink: 0, textAlign: "left"}}
                            ellipsis={{tooltip: key}}
                        >
                            {key}
                        </Typography.Text>
                        <div style={{flex: 1, minWidth: 0, textAlign: "left"}}>{control}</div>
                    </div>
                );
            })}
        </div>
    );
};

export default ClothParamsForm;
