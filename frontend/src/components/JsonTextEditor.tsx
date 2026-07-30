import {forwardRef} from "react";
import {Descriptions} from "antd";
import BaseFormatEditor, {BaseFormatEditorProps, FormatEditorRef} from "./common/BaseFormatEditor";
import MonacoJsonEditor from "./common/MonacoJsonEditor";

/**
 * JsonTextEditor JSON 文本格式共用编辑器
 * 适用于 nson/undressdat/undresspdat（KCESJSONText：extension + 内嵌 JSON）
 * 样式1：直接编辑内嵌 JSON；样式2：编辑完整封套
 */
const JsonTextEditor = forwardRef<FormatEditorRef, Omit<BaseFormatEditorProps, "renderStyle1" | "renderHeader">>(
    (props, ref) => {
        const renderStyle1 = (data: any, setData: (value: any) => void) => {
            if (typeof data !== "object" || data === null) {
                return <MonacoJsonEditor data={data} setData={setData}/>;
            }
            return (
                <div>
                    <Descriptions size="small" column={1} bordered style={{marginBottom: 8}}>
                        <Descriptions.Item label="extension">{String(data.extension ?? "")}</Descriptions.Item>
                    </Descriptions>
                    <MonacoJsonEditor
                        data={data.json}
                        setData={(newValue) => setData({...data, json: newValue})}
                        height="calc(100vh - 260px)"
                    />
                </div>
            );
        };

        return <BaseFormatEditor {...props} ref={ref} renderStyle1={renderStyle1}/>;
    }
);

export default JsonTextEditor;
