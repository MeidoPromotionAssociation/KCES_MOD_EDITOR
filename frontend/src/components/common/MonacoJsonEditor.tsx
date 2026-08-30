import React, {useEffect, useRef, useState} from "react";
import {Editor} from "@monaco-editor/react";
import {useDarkMode} from "../../hooks/themeSwitch";
import {losslessParse, losslessStringify} from "../../utils/losslessJson";

/**
 * MonacoJsonEditor 样式2共用组件：直接用 Monaco Editor 展示/编辑整个 JSON
 * 与 COM3D2_MOD_EDITOR 的 Style2XxxProperties 相同的交互；
 * 序列化使用 lossless-json 以保留 uint64 大整数精度。
 * 传入 path（<formatKey>.editing.json）时启用该格式的 JSON Schema 校验与补全
 */
const MonacoJsonEditor: React.FC<{
    data: any;
    setData: (value: any) => void;
    height?: string;
    path?: string;
}> = ({data, setData, height, path}) => {
    const isDarkMode = useDarkMode();
    const [jsonValue, setJsonValue] = useState("");
    const editorRef = useRef<any>(null);
    const isInternalUpdate = useRef(false);
    const prevDataRef = useRef<string | null>(null);

    // 处理数据的外部更新（如文件加载）
    useEffect(() => {
        if (data !== null && data !== undefined) {
            const dataJson = losslessStringify(data);
            if (!isInternalUpdate.current && dataJson !== prevDataRef.current) {
                setJsonValue(losslessStringify(data, 2));
                prevDataRef.current = dataJson;
            }
        } else {
            setJsonValue("");
            prevDataRef.current = null;
        }
    }, [data]);

    const handleEditorDidMount = (editor: any, _monacoInstance: any) => {
        editorRef.current = editor;
    };

    // 用户在编辑器中修改内容
    const handleEditorChange = (value?: string) => {
        const newVal = value ?? "";

        if (newVal !== jsonValue) {
            setJsonValue(newVal);
        }

        try {
            const parsed = losslessParse(newVal);

            if (losslessStringify(parsed) !== losslessStringify(data)) {
                isInternalUpdate.current = true;
                setData(parsed);
                prevDataRef.current = losslessStringify(parsed);

                setTimeout(() => {
                    isInternalUpdate.current = false;
                }, 0);
            }
        } catch (err) {
            // JSON 无效时不更新父组件
        }
    };

    return (
        <div style={{
            height: height ?? "calc(100vh - 135px)",
            borderRadius: '8px',
            overflow: 'hidden'
        }}>
            <Editor
                language="json"
                theme={isDarkMode ? "vs-dark" : "vs"}
                path={path}
                value={jsonValue}
                onChange={handleEditorChange}
                onMount={handleEditorDidMount}
                options={{
                    minimap: {enabled: true},
                    tabSize: 2,
                }}
            />
        </div>
    );
};

export default MonacoJsonEditor;
