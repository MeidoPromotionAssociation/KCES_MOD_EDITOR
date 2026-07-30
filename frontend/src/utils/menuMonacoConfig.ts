import {MenuCommandTypeNames} from "./kcesEnums";
import {getMenuCommandDocs} from "./menuCommandDocs";

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

// 悬停提示：显示命令的枚举值与语义文档
const defineHoverProviders = (monacoInstance: any) => {
    ["menuTreeIndent", "menuColonSplit", "menuTSV"].forEach((language) => {
        monacoInstance.languages.registerHoverProvider(language, {
            provideHover: function (model: any, position: any) {
                const word = model.getWordAtPosition(position);
                if (!word) return null;
                const index = MenuCommandTypeNames.indexOf(word.word);
                if (index < 0) return null;
                const doc = getMenuCommandDocs()[word.word];
                const contents = [{value: `**${word.word}** — Menu.Command.Type = ${index}`}];
                if (doc) {
                    contents.push({value: doc});
                }
                return {
                    range: new monacoInstance.Range(
                        position.lineNumber,
                        word.startColumn,
                        position.lineNumber,
                        word.endColumn
                    ),
                    contents,
                };
            },
        });
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

// 自动补全：命令名位置提示全部枚举命令（附语义文档）
const defineAutocomplete = (monacoInstance: any) => {
    ["menuTreeIndent"].forEach((languageId) => {
        monacoInstance.languages.registerCompletionItemProvider(languageId, {
            triggerCharacters: [" ", "\t", ":"],
            provideCompletionItems(model: any, position: any) {
                const lineContent = model.getLineContent(position.lineNumber);
                const suggestions: any[] = [];

                // 无缩进的行视为命令名位置
                if (!lineContent.startsWith('\t')) {
                    const docs = getMenuCommandDocs();
                    MenuCommandTypeNames.forEach((name, index) => {
                        suggestions.push({
                            label: `${name} (${index})`,
                            kind: monacoInstance.languages.CompletionItemKind.Keyword,
                            insertText: name,
                            documentation: docs[name] ?? `Menu.Command.Type = ${index}`,
                        });
                    });
                }

                return {suggestions};
            },
        });
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
