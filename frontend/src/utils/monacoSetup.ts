// 确保 Monaco 从本地加载而不是 CDN，并配置 JSON 语言支持
// 必须在任何使用 @monaco-editor/react 的组件之前导入
//
// monaco 0.56 重排了 ESM 入口（package.json 的 exports 把 `monaco-editor/*` 映射到 `esm/vs/*.js`），
// 旧的 `monaco-editor/esm/vs/...` 深路径不再可解析，必须改用受支持的入口：
//   monaco-editor/editor                          编辑器核心 API
//   monaco-editor/features/register.all           编辑器功能（补全、悬停、查找、折叠……）
//   monaco-editor/languages/features/json/register JSON 语言服务（同时注册 json 语言本身）
// 本应用只用 JSON 与自定义 Monarch 语言（menu*/csv），因此不引入
// monaco-editor/languages/definitions/register.all（80 多种语言的语法定义）
import {loader} from "@monaco-editor/react";
import * as monaco from "monaco-editor/editor";
import "monaco-editor/features/register.all";
import {jsonDefaults} from "monaco-editor/languages/features/json/register";
import EditorWorker from "monaco-editor/editor/editor.worker?worker";
import JsonWorker from "monaco-editor/languages/features/json/json.worker?worker";

self.MonacoEnvironment = {
    getWorker(_moduleId: string, label: string) {
        if (label === "json") {
            return new JsonWorker();
        }
        return new EditorWorker();
    },
};

// 关闭 JSON schema 校验（编辑 JSON 没有 schema），保留语法校验
jsonDefaults.setDiagnosticsOptions({
    validate: true,
    allowComments: false,
    schemas: [],
    enableSchemaRequest: false,
});

loader.config({monaco: monaco as unknown as typeof import("monaco-editor")});
