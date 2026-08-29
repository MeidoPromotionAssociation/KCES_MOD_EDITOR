import {forwardRef} from "react";
import BaseFormatEditor, {BaseFormatEditorProps, FormatEditorRef} from "./common/BaseFormatEditor";
import JsonObjectForm from "./common/JsonObjectForm";

/**
 * JsonTextEditor 明文 JSON 格式共用编辑器
 * 适用于 nson/undressdat/undresspdat
 * 库 v2 移除了 KCESJSONText 封套（extension + 内嵌 json），编辑 JSON 的根就是资源文档本身：
 * .undressdat/.undresspdat 已按游戏源码建模为结构体，成员固定；
 * .nson 仍是库不声明结构的自由 JSON。
 * 样式1：递归结构化表单；样式2：完整 JSON（带 schema 校验与悬停）
 */
const JsonTextEditor = forwardRef<FormatEditorRef, Omit<BaseFormatEditorProps, "renderStyle1" | "renderHeader">>(
    (props, ref) => {
        const renderStyle1 = (data: any, setData: (value: any) => void) => (
            <div style={{height: "calc(100vh - 230px)", overflow: "auto"}}>
                <JsonObjectForm value={data} onChange={setData}/>
            </div>
        );

        return <BaseFormatEditor {...props} ref={ref} renderStyle1={renderStyle1}/>;
    }
);

export default JsonTextEditor;
