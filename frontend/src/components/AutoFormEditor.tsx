import {forwardRef} from "react";
import BaseFormatEditor, {BaseFormatEditorProps, FormatEditorRef} from "./common/BaseFormatEditor";
import JsonObjectForm from "./common/JsonObjectForm";

/**
 * AutoFormEditor 通用结构化编辑器
 * 样式1：递归结构化表单（超大数组自动降级提示）；样式2：完整 JSON
 * 适用于 menuassets/materialassets/pmatassets/model/preset
 */
const AutoFormEditor = forwardRef<FormatEditorRef, Omit<BaseFormatEditorProps, "renderStyle1" | "renderHeader">>(
    (props, ref) => {
        const renderStyle1 = (data: any, setData: (value: any) => void) => (
            <div style={{
                height: "calc(100vh - 210px)",
                overflow: "auto",
                textAlign: "left"
            }}>
                <JsonObjectForm value={data} onChange={setData} defaultExpandDepth={1}/>
            </div>
        );

        return <BaseFormatEditor {...props} ref={ref} renderStyle1={renderStyle1}/>;
    }
);

export default AutoFormEditor;
