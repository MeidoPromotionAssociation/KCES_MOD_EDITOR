import React, {useEffect, useRef, useState} from "react";
import {Editor} from "@monaco-editor/react";
import {useDarkMode} from "../../hooks/themeSwitch";
import {csvColumnCount, csvDataToString, stringToCsvData} from "../../utils/csv";
import {setupCsvMonaco} from "../../utils/csvMonacoConfig";

/**
 * NeiCsvEditor .nei 文本视图
 * 复刻 COM3D2_MOD_EDITOR 的 nei/NeiMonacoEditor：把表格当成 CSV 原文直接编辑。
 * .nei 就是加密后的 CSV，用 JSON 编辑没有意义，因此这里替换掉通用的 Monaco JSON 视图。
 * 编辑时实时解析回二维数组并同步 Rows/Cols。
 */
const NeiCsvEditor: React.FC<{
    data: any;
    onChange: (value: any) => void;
    height?: string;
}> = ({data, onChange, height}) => {
    const isDarkMode = useDarkMode();

    const rows: string[][] = Array.isArray(data?.Data) ? data.Data : [];

    const [csvValue, setCsvValue] = useState(() => csvDataToString(rows));
    const isInternalUpdate = useRef(false);
    const prevDataRef = useRef<string>(JSON.stringify(rows));

    // 外部数据变化（如加载文件、表格视图修改）时重建文本
    useEffect(() => {
        const key = JSON.stringify(rows);
        if (!isInternalUpdate.current && key !== prevDataRef.current) {
            prevDataRef.current = key;
            setCsvValue(csvDataToString(rows));
        }
    }, [data]);

    // 用户编辑文本：解析回二维数组并写回
    const handleEditorChange = (value?: string) => {
        const newText = value ?? "";
        setCsvValue(newText);

        const parsed = stringToCsvData(newText);
        const key = JSON.stringify(parsed);
        if (key !== prevDataRef.current) {
            isInternalUpdate.current = true;
            prevDataRef.current = key;
            onChange({
                ...data,
                Data: parsed,
                Rows: parsed.length,
                Cols: csvColumnCount(parsed),
            });
            setTimeout(() => {
                isInternalUpdate.current = false;
            }, 0);
        }
    };

    return (
        <div style={{
            height: height ?? "calc(100vh - 260px)",
            borderRadius: '8px',
            overflow: 'hidden'
        }}>
            <Editor
                beforeMount={(monacoInstance) => setupCsvMonaco(monacoInstance)}
                language="csv"
                theme={isDarkMode ? "vs-dark" : "vs"}
                value={csvValue}
                onChange={handleEditorChange}
                options={{
                    minimap: {enabled: true},
                    tabSize: 2,
                    wordWrap: 'on',
                }}
            />
        </div>
    );
};

export default NeiCsvEditor;
