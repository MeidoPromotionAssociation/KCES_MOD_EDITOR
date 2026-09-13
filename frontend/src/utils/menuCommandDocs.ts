import {t} from "i18next";
import {MenuCommandTypeNames} from "./kcesEnums";
import {MenuCommandSpecs} from "./menuCommandSpecs";

/**
 * KCES menu 命令文档（仿 COM3D2_MOD_EDITOR 的 menuCommandDocs）
 * 文案按 KCES2 1.36.0 的 PartsMenuManager.cs 逐命令考证，存放于
 * locale 的 MenuAssetsEditor.commands.<命令名>
 *
 * 这是个函数，因为如果直接定义常量，加载时 i18n 还没加载好会导致无翻译
 */

/** 文档正文里用 \n 分行，Monaco 的 hover/补全按 Markdown 渲染 */
export const getMenuCommandDocs = (): Record<string, string> => {
    const docs: Record<string, string> = {};
    for (const name of MenuCommandTypeNames) {
        const text = t(`MenuAssetsEditor.commands.${name}`, {defaultValue: ""});
        if (text) {
            docs[name] = text;
        }
    }
    return docs;
};

/** 命令的语法骨架，形如 `additem <model-file> [<slot>] ...`，多写法各占一行 */
export function getMenuCommandSignatures(name: string): string[] {
    const spec = MenuCommandSpecs[name];
    if (!spec) return [];
    return spec.forms.map((form) => {
        const parts = form.args.map((arg) => {
            const token = `<${arg.placeholder}>${arg.repeat ? "..." : ""}`;
            return arg.optional ? `[${token}]` : token;
        });
        return [name, ...parts].join(" ");
    });
}

/**
 * 拼出 Monaco 悬停/补全里展示的完整 Markdown：
 * 标题（命令名 + 枚举值）→ 语法骨架 → 参数说明 → 版本出处
 */
export function getMenuCommandMarkdown(name: string, type: number): string {
    const blocks: string[] = [`**${name}** — \`Menu.Command.Type = ${type}\``];

    const signatures = getMenuCommandSignatures(name);
    if (signatures.length > 0) {
        blocks.push("```\n" + signatures.join("\n") + "\n```");
    }

    const doc = getMenuCommandDocs()[name];
    if (doc) {
        blocks.push(doc);
    }

    const note = t("MenuAssetsEditor.command_doc_source", {defaultValue: ""});
    if (note) {
        blocks.push(`*${note}*`);
    }

    return blocks.join("\n\n");
}
