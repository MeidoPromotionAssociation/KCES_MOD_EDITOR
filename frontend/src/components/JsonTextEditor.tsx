import {forwardRef} from "react";
import BaseFormatEditor, {BaseFormatEditorProps, FormatEditorRef} from "./common/BaseFormatEditor";

/**
 * JsonTextEditor 明文 JSON 格式共用编辑器
 * 适用于 nson/undressdat/undresspdat
 * 库 v2 移除了 KCESJSONText 封套（extension + 内嵌 json），编辑 JSON 的根就是资源文档本身：
 * .undressdat/.undresspdat 已按游戏源码建模为结构体，成员固定；
 * .nson 仍是库不声明结构的自由 JSON。
 * 这三个格式只保留 JSON 编辑（带 schema 校验与悬停），不再提供结构化表单：
 * .nson 结构不固定，表单无从生成；.undressdat/.undresspdat 成员多且大量是定长数组，表单反而比直接改 JSON 更绕。
 */
const JsonTextEditor = forwardRef<
    FormatEditorRef,
    Omit<BaseFormatEditorProps, "renderStyle1" | "renderStyle2" | "renderHeader">
>((props, ref) => <BaseFormatEditor {...props} ref={ref}/>);

export default JsonTextEditor;
