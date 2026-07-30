import React from "react";
import {Input} from "antd";
import {numberToString, stringToInteger} from "../../utils/losslessJson";

/**
 * BigIntInput 大整数文本输入
 * uint64 ID 等字段超出 JS 安全整数范围，用文本编辑并以 LosslessNumber 保存以保留精度
 */
const BigIntInput: React.FC<{
    value: any;
    onChange: (value: any) => void;
    style?: React.CSSProperties;
}> = ({value, onChange, style}) => {
    const [text, setText] = React.useState(numberToString(value));
    const [invalid, setInvalid] = React.useState(false);

    React.useEffect(() => {
        setText(numberToString(value));
        setInvalid(false);
    }, [value]);

    return (
        <Input
            style={{maxWidth: 240, ...style}}
            status={invalid ? "error" : undefined}
            value={text}
            onChange={(e) => {
                const newText = e.target.value;
                setText(newText);
                const parsed = stringToInteger(newText);
                if (parsed === null) {
                    setInvalid(true);
                    return;
                }
                setInvalid(false);
                onChange(parsed);
            }}
        />
    );
};

export default BigIntInput;
