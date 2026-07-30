import {t} from "i18next";
import {MenuCommandTypeNames} from "./kcesEnums";

/**
 * KCES menu 命令文档（仿 COM3D2_MOD_EDITOR 的 menuCommandDocs）
 * 文案按 KCES 1.34.4 的 PartsMenuManager.cs 逐命令考证，存放于
 * locale 的 MenuAssetsEditor.commands.<命令名>
 *
 * 这是个函数，因为如果直接定义常量，加载时 i18n 还没加载好会导致无翻译
 */
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
