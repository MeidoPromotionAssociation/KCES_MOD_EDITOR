// 确保 Monaco 从本地加载而不是 CDN，并配置 JSON 语言支持
// 必须在任何使用 @monaco-editor/react 的组件之前导入
import {loader} from "@monaco-editor/react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api.js";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import JsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
// monaco 0.55 的 ESM 版不再挂载 monaco.languages.json 命名空间，改为具名导出 jsonDefaults；
// 其 d.ts 是 `export {}` 未声明该导出，因此这里用 @ts-ignore
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore runtime 存在 jsonDefaults 导出，但类型声明缺失
import {jsonDefaults} from "monaco-editor/esm/vs/language/json/monaco.contribution.js";

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

