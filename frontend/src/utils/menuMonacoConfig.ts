import {MenuCommandTypeNames} from "./kcesEnums";
import {getMenuCommandMarkdown} from "./menuCommandDocs";
import {argPlaceholderAt, argValuesAt, requiredPlaceholders} from "./menuCommandSpecs";

/**
 * KCES menu 命令 Monaco 配置，复刻自 COM3D2_MOD_EDITOR 的 menuMonacoConfig
 * 注册 menuTreeIndent / menuColonSplit / menuTSV 自定义语言、
 * 主题、悬停文档、自动补全（命令名来自 Menu.Command.Type 枚举）与 Ctrl+W 删行
 */

// 用于存储已初始化的 Monaco 实例
const initializedMonacoInstances = new WeakMap();

// 语言定义
const defineLanguages = (monacoInstance: any) => {
    // 树形缩进
    monacoInstance.languages.register({id: "menuTreeIndent"});
    monacoInstance.languages.setMonarchTokensProvider("menuTreeIndent", {
        tokenizer: {
            root: [
                [/^\t+.+$/, "parameter"],
                [/^[^\t].+$/, "command"],
                [/^\s*$/, "white"],
            ],
        },
    });

    // 冒号分隔
    monacoInstance.languages.register({id: "menuColonSplit"});
    monacoInstance.languages.setMonarchTokensProvider("menuColonSplit", {
        tokenizer: {
            root: [
                [/^[^:]+(?=:)/, "command"],
                [/:/, "delimiter"],
                [/\b[^,]+\b/, "parameter"],
                [/[,]/, "delimiter"],
                [/\s+/, "white"],
            ],
        },
    });

    // TSV
    monacoInstance.languages.register({id: "menuTSV"});
    monacoInstance.languages.setMonarchTokensProvider("menuTSV", {
        tokenizer: {
            root: [
                [/^[^\t]+(?=\t)/, "command"],
                [/\t/, "delimiter"],
                [/[^\t]+/, "parameter"],
                [/\s+/, "white"],
            ],
        },
    });
};

/**
 * 树形缩进格式下定位光标所在位置的语义：
 * 无缩进行是命令名，`\t` 开头的行是它的第 n 个参数，空行分隔命令。
 * 解析规则与 MenuCommandsEditor 的 parseTextAsTreeIndent 保持一致。
 */
const resolveTreeIndentContext = (
    model: any,
    lineNumber: number
): { command: string; argIndex: number } | null => {
    const line: string = model.getLineContent(lineNumber);
    if (!line.trim()) return null;
    if (!line.startsWith("\t")) {
        return {command: line.trim(), argIndex: -1};
    }
    let argIndex = 0;
    for (let n = lineNumber - 1; n >= 1; n--) {
        const prev: string = model.getLineContent(n);
        if (!prev.trim()) return null; // 上方是空行，说明这段参数没有归属的命令名
        if (prev.startsWith("\t")) {
            argIndex++;
            continue;
        }
        return {command: prev.trim(), argIndex};
    }
    return null;
};

// 悬停提示：只在命令名上显示文档，参数行不提示
const defineHoverProviders = (monacoInstance: any) => {
    const commandHover = (model: any, position: any) => {
        const word = model.getWordAtPosition(position);
        if (!word) return null;
        const index = MenuCommandTypeNames.indexOf(word.word);
        if (index < 0) return null;
        return {
            range: new monacoInstance.Range(
                position.lineNumber,
                word.startColumn,
                position.lineNumber,
                word.endColumn
            ),
            contents: [{value: getMenuCommandMarkdown(word.word, index)}],
        };
    };

    monacoInstance.languages.registerHoverProvider("menuTreeIndent", {
        provideHover: function (model: any, position: any) {
            const context = resolveTreeIndentContext(model, position.lineNumber);
            // argIndex >= 0 表示光标在参数行上，这里不给提示
            if (!context || context.argIndex >= 0) return null;

            const type = MenuCommandTypeNames.indexOf(context.command);
            if (type < 0) return null;
            return {
                range: new monacoInstance.Range(
                    position.lineNumber,
                    1,
                    position.lineNumber,
                    model.getLineMaxColumn(position.lineNumber)
                ),
                contents: [{value: getMenuCommandMarkdown(context.command, type)}],
            };
        },
    });

    ["menuColonSplit", "menuTSV"].forEach((language) => {
        monacoInstance.languages.registerHoverProvider(language, {provideHover: commandHover});
    });
};

// 编辑器主题（与 COM3D2_MOD_EDITOR 相同的配色）
const defineTheme = (monacoInstance: any) => {
    monacoInstance.editor.defineTheme("menuTheme", {
        base: "vs",
        inherit: true,
        colors: {
            "editor.foreground": "#000000",
            "editor.background": "#FFFFFF",
        },
        rules: [
            {token: "command", foreground: "#A31515", fontStyle: "bold"},
            {token: "parameter", foreground: "#0451A5"},
            {token: "delimiter", foreground: "#7B3814"},
        ],
    });

    monacoInstance.editor.defineTheme("menuTheme-dark", {
        base: "vs-dark",
        inherit: true,
        colors: {
            "editor.foreground": "#D4D4D4",
            "editor.background": "#1E1E1E",
        },
        rules: [
            {token: "command", foreground: "#CE9178", fontStyle: "bold"},
            {token: "parameter", foreground: "#9CDCFE"},
            {token: "delimiter", foreground: "#F8F8F8"},
        ],
    });
};

// Ctrl+W 删除当前行
function customShortcut(monacoInstance: any) {
    monacoInstance.editor.registerCommand('deleteLine', () => {
        const editors = monacoInstance.editor.getEditors();
        if (!editors || editors.length === 0) {
            return;
        }
        const editor = editors.find((ed: any) => ed.hasWidgetFocus());
        if (!editor) {
            return;
        }
        const model = editor.getModel();
        const position = editor.getPosition();
        if (model && position) {
            const lineNumber = position.lineNumber;
            model.applyEdits([
                {
                    range: new monacoInstance.Range(
                        lineNumber,
                        1,
                        lineNumber,
                        model.getLineMaxColumn(lineNumber)
                    ),
                    text: null,
                    forceMoveMarkers: true,
                },
            ]);
        }
    });

    monacoInstance.editor.addKeybindingRules([
        {
            keybinding: monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyW,
            command: 'deleteLine',
        },
    ]);
}

/**
 * 自动补全（只做树形缩进格式）
 * - 无缩进行：补全全部 74 个命令名，按 snippet 一次铺出必填参数骨架
 * - `\t` 开头行：按所属命令与参数序号补全该位置的枚举候选
 */
const defineAutocomplete = (monacoInstance: any) => {
    const languageId = "menuTreeIndent";

    monacoInstance.languages.registerCompletionItemProvider(languageId, {
        // 敲 Tab 换到参数行、或在 key=value 参数里敲 = 时都重新触发一次
        triggerCharacters: ["\t", "=", ":", "|", "&"],
        provideCompletionItems(model: any, position: any) {
            const lineContent: string = model.getLineContent(position.lineNumber);
            const isCommandLine = !lineContent.startsWith("\t");

            // 替换范围：命令行取整行已输入部分，参数行跳过前导 Tab
            const indent = isCommandLine ? 0 : lineContent.length - lineContent.replace(/^\t+/, "").length;
            const range = new monacoInstance.Range(
                position.lineNumber,
                indent + 1,
                position.lineNumber,
                position.column
            );

            if (isCommandLine) {
                return {
                    suggestions: MenuCommandTypeNames.map((name, index) => {
                        // 命令名之后按树形缩进铺出必填参数，每个参数一个 tabstop
                        const placeholders = requiredPlaceholders(name);
                        const body = placeholders
                            .map((placeholder, i) => `\n\t\${${i + 1}:${placeholder}}`)
                            .join("");
                        return {
                            label: `${name} (${index})`,
                            kind: monacoInstance.languages.CompletionItemKind.Keyword,
                            insertText: `${name}${body}`,
                            insertTextRules:
                                monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            documentation: {value: getMenuCommandMarkdown(name, index)},
                            detail: `Menu.Command.Type = ${index}`,
                            range,
                            // 保持枚举顺序而不是字母序
                            sortText: String(index).padStart(3, "0"),
                        };
                    }),
                };
            }

            const context = resolveTreeIndentContext(model, position.lineNumber);
            if (!context || context.argIndex < 0) {
                return {suggestions: []};
            }
            const placeholder = argPlaceholderAt(context.command, context.argIndex);
            const values = argValuesAt(context.command, context.argIndex);
            return {
                suggestions: values.map((value, index) => ({
                    label: value,
                    kind: monacoInstance.languages.CompletionItemKind.EnumMember,
                    insertText: value,
                    detail: placeholder ? `args[${context.argIndex}] <${placeholder}>` : undefined,
                    range,
                    sortText: String(index).padStart(4, "0"),
                })),
            };
        },
    });
};

// 初始化 Monaco 编辑器，接受 beforeMount 调用
export const setupMenuMonaco = (monacoInstance: any) => {
    // 只初始化一次，否则切换编辑器时会重复初始化，自动补全会出现多个选项
    if (initializedMonacoInstances.has(monacoInstance)) {
        return;
    }

    defineLanguages(monacoInstance);
    defineHoverProviders(monacoInstance);
    defineTheme(monacoInstance);
    customShortcut(monacoInstance);
    defineAutocomplete(monacoInstance);

    initializedMonacoInstances.set(monacoInstance, true);
};
