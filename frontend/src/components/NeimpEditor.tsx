import React, {forwardRef, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import BaseFormatEditor, {BaseFormatEditorProps, FormatEditorRef} from "./common/BaseFormatEditor";
import NeimpTablePane from "./neimp/NeimpTablePane";

/**
 * NeimpEditor .neimp（NEI MessagePack）编辑器
 *
 * .neimp 是 .nei 的 MessagePack 后继格式，载荷是 MessagePack-CSharp 序列化出的对象图，
 * 游戏侧用 CsvData<T> 把它反序列化成「行键 → 行对象」的字典，所以主视图是表格：
 * 行 = 字典成员，列 = 行对象的成员键（[Key(n)] 的整数键，没有字段名）。
 *
 * 样式2 保留完整 JSON：值树里还有版本号、非表格的兄弟成员，以及 $bin / $ext 这类
 * 表格表达不了的值，结构性的改动在那里做。
 */
const NeimpEditor = forwardRef<FormatEditorRef, Omit<BaseFormatEditorProps, "renderStyle1" | "renderStyle2" | "renderHeader">>(
    (props, ref) => {
        const {t} = useTranslation();
        const innerRef = useRef<FormatEditorRef>(null);

        // 选中的表（值树里的路径）。放在这一层是为了切到 JSON 再切回来时不丢失选择
        const [tablePath, setTablePath] = useState<string | null>(null);

        const renderStyle1 = (data: any, setData: (value: any) => void) => (
            <NeimpTablePane
                data={data}
                setData={setData}
                tablePath={tablePath}
                onSelectTable={setTablePath}
            />
        );

        React.useImperativeHandle(ref, () => ({
            handleReadFile: () => innerRef.current!.handleReadFile(),
            handleSaveFile: () => innerRef.current!.handleSaveFile(),
            handleSaveAsFile: () => innerRef.current!.handleSaveAsFile(),
        }));

        return (
            <div style={{display: "flex", flexDirection: "column", flex: 1, minHeight: 0}}>
                <BaseFormatEditor
                    {...props}
                    ref={innerRef}
                    renderStyle1={renderStyle1}
                    style1Label={t('NeimpEditor.table_mode')}
                    style2Label={t('NeimpEditor.json_editor_mode')}
                />
            </div>
        );
    });

export default NeimpEditor;
