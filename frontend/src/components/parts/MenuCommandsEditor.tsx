import React, {useEffect, useMemo, useRef, useState} from "react";
import {Alert, Radio} from "antd";
import {Editor} from "@monaco-editor/react";
import {useTranslation} from "react-i18next";
import {useDarkMode} from "../../hooks/themeSwitch";
import {setupMenuMonaco} from "../../utils/menuMonacoConfig";
import {menuCommandName, menuCommandType} from "../../utils/kcesEnums";

/**
 * MenuCommandsEditor KCES 菜单命令编辑器
 * 复刻 COM3D2_MOD_EDITOR MenuEditor 的命令文本编辑：
 * 树形缩进 / TSV / 冒号分隔三种格式，自定义语法高亮、命令名补全与悬停提示。
 * KCES 命令名即 Menu.Command.Type 枚举名，序列化/解析时自动转换枚举值。
 */

type FormatType = "treeIndent" | "colonSplit" | "TSV";

const MenuCommandsFormatKey = "MenuAssetsCommandsFormat";

interface KCESCommand {
    type: number;
    args: string[] | null;
}

/* -----------------------------
 *   commands ↔ 文本 转换
 * ----------------------------- */

function commandsToTextTreeIndent(commands: KCESCommand[]): string {
    const lines: string[] = [];
    commands.forEach((cmd) => {
        lines.push(menuCommandName(cmd?.type ?? 0));
        for (const p of cmd?.args ?? []) {
            lines.push("\t" + p);
        }
        lines.push(""); // 命令与命令之间空行
    });
    return lines.join("\n").trim();
}

function commandsToTextColonSplit(commands: KCESCommand[]): string {
    return commands
        .map((cmd) => {
            const name = menuCommandName(cmd?.type ?? 0);
            const args = cmd?.args ?? [];
            return args.length > 0 ? `${name}: ${args.join(", ")}` : name;
        })
        .join("\n");
}

function commandsToTextTSV(commands: KCESCommand[]): string {
    return commands
        .map((cmd) => [menuCommandName(cmd?.type ?? 0), ...(cmd?.args ?? [])].join("\t"))
        .join("\n");
}

/** 将命令名解析为枚举值，未知命令抛错 */
function parseCommandName(name: string): number {
    const type = menuCommandType(name);
    if (type === null) {
        throw new Error(`unknown command: ${name}`);
    }
    return type;
}

function parseTextAsTreeIndent(text: string): KCESCommand[] {
    const lines = text.split(/\r?\n/);
    const commands: KCESCommand[] = [];

    let currentName: string | null = null;
    let currentParams: string[] = [];

    function commit() {
        if (currentName && currentName.trim() !== '') {
            commands.push({
                type: parseCommandName(currentName),
                args: currentParams.length > 0 ? currentParams : null,
            });
        }
        currentName = null;
        currentParams = [];
    }

    for (const raw of lines) {
        if (!raw.trim()) {
            commit();
            continue;
        }
        if (raw.startsWith("\t")) {
            const paramText = raw.replace(/^\t+/, "");
            if (currentName !== null) {
                currentParams.push(paramText);
            }
        } else {
            commit();
            currentName = raw.trim();
        }
    }
    commit();

    return commands;
}

function parseTextAsColonSplit(text: string): KCESCommand[] {
    const commands: KCESCommand[] = [];
    for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const colonIndex = trimmed.indexOf(":");
        if (colonIndex < 0) {
            commands.push({type: parseCommandName(trimmed), args: null});
            continue;
        }
        const name = trimmed.substring(0, colonIndex).trim();
        const rest = trimmed.substring(colonIndex + 1).trim();
        const args = rest ? rest.split(",").map((item) => item.trim()).filter((s) => s.length > 0) : [];
        commands.push({type: parseCommandName(name), args: args.length > 0 ? args : null});
    }
    return commands;
}

function parseTextAsTSV(text: string): KCESCommand[] {
    const commands: KCESCommand[] = [];
    for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const tabIndex = trimmed.indexOf("\t");
        if (tabIndex < 0) {
            commands.push({type: parseCommandName(trimmed), args: null});
        } else {
            const name = trimmed.substring(0, tabIndex);
            const rest = trimmed.substring(tabIndex + 1);
            const params = rest.length > 0 ? rest.split("\t") : [];
            commands.push({type: parseCommandName(name), args: params.length > 0 ? params : null});
        }
    }
    return commands;
}

export function commandsToText(commands: KCESCommand[], format: FormatType): string {
    switch (format) {
        case "treeIndent":
            return commandsToTextTreeIndent(commands);
        case "colonSplit":
            return commandsToTextColonSplit(commands);
        case "TSV":
            return commandsToTextTSV(commands);
    }
}

export function parseText(text: string, format: FormatType): KCESCommand[] {
    switch (format) {
        case "treeIndent":
            return parseTextAsTreeIndent(text);
        case "colonSplit":
            return parseTextAsColonSplit(text);
        case "TSV":
            return parseTextAsTSV(text);
    }
}

function languageFor(format: FormatType): string {
    switch (format) {
        case "treeIndent":
            return "menuTreeIndent";
        case "colonSplit":
            return "menuColonSplit";
        case "TSV":
            return "menuTSV";
    }
}

const MenuCommandsEditor: React.FC<{
    commands: KCESCommand[];
    onChange: (commands: KCESCommand[]) => void;
    height?: string;
}> = ({commands, onChange, height}) => {
    const {t} = useTranslation();
    const isDarkMode = useDarkMode();

    const [format, setFormat] = useState<FormatType>(
        () => (localStorage.getItem(MenuCommandsFormatKey) as FormatType) || "treeIndent"
    );
    const [text, setText] = useState<string>(() => commandsToText(commands ?? [], format));
    const [parseError, setParseError] = useState<string | null>(null);

    const isInternalUpdate = useRef(false);
    const prevKeyRef = useRef<string>(JSON.stringify(commands ?? []));

    // 外部命令变化（切换资产）时重建文本
    useEffect(() => {
        const key = JSON.stringify(commands ?? []);
        if (!isInternalUpdate.current && key !== prevKeyRef.current) {
            prevKeyRef.current = key;
            setText(commandsToText(commands ?? [], format));
            setParseError(null);
        }
    }, [commands, format]);

    // 用户编辑文本：解析成功则写回，失败显示错误
    const handleTextChange = (value?: string) => {
        const newText = value ?? "";
        setText(newText);
        try {
            const parsed = parseText(newText, format);
            setParseError(null);
            const key = JSON.stringify(parsed);
            if (key !== prevKeyRef.current) {
                isInternalUpdate.current = true;
                prevKeyRef.current = key;
                onChange(parsed);
                setTimeout(() => {
                    isInternalUpdate.current = false;
                }, 0);
            }
        } catch (err: any) {
            setParseError(err?.message ?? String(err));
        }
    };

    // 切换格式：用当前命令重建文本（若当前文本解析失败则用外部命令）
    const handleFormatChange = (newFormat: FormatType) => {
        let current = commands ?? [];
        try {
            current = parseText(text, format);
        } catch {
            // 保留外部命令
        }
        setFormat(newFormat);
        localStorage.setItem(MenuCommandsFormatKey, newFormat);
        setText(commandsToText(current, newFormat));
        setParseError(null);
    };

    const formatOptions = useMemo(() => ([
        {label: t('MenuAssetsEditor.treeIndent'), value: 'treeIndent'},
        {label: t('MenuAssetsEditor.TSV'), value: 'TSV'},
        {label: t('MenuAssetsEditor.colonSplit'), value: 'colonSplit'},
    ]), [t]);

    return (
        <div>
            <Radio.Group
                size="small"
                block
                options={formatOptions}
                optionType="button"
                buttonStyle="solid"
                value={format}
                onChange={(e) => handleFormatChange(e.target.value as FormatType)}
                style={{marginBottom: 8}}
            />
            {parseError && (
                <Alert
                    type="warning"
                    showIcon
                    style={{marginBottom: 8}}
                    title={t('MenuAssetsEditor.command_parse_error')}
                    description={parseError}
                />
            )}
            <div style={{height: height ?? "calc(100vh - 420px)", borderRadius: 8, overflow: "hidden"}}>
                <Editor
                    beforeMount={(monacoInstance) => setupMenuMonaco(monacoInstance)}
                    language={languageFor(format)}
                    theme={isDarkMode ? "menuTheme-dark" : "menuTheme"}
                    value={text}
                    onChange={handleTextChange}
                    options={{
                        minimap: {enabled: false},
                        insertSpaces: false,
                        tabSize: 4,
                    }}
                />
            </div>
        </div>
    );
};

export default MenuCommandsEditor;
