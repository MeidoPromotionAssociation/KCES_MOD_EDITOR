import {jsonDefaults} from "monaco-editor/languages/features/json/register";
import i18next from "i18next";
import {GetEditingSchemas} from "../../bindings/github.com/MeidoPromotionAssociation/KCES_MOD_EDITOR/internal/app.ts";

/**
 * Monaco JSON Schema 注册
 * 从 MeidoSerialization 的 editing schema（schemas/editing/v1）拉取全部格式的 JSON Schema，
 * 按 model 文件名（<formatKey>.editing.json）关联到对应格式的 Monaco 编辑器，
 * 提供结构校验、字段补全与悬停说明（字段说明按当前界面语言翻译，附可信度标识）
 */

let registeredLocale = "";

/** editingModelPath 返回某格式 Style2 编辑器使用的 model 路径（与 fileMatch 对应） */
export function editingModelPath(formatKey: string): string {
    return `${formatKey}.editing.json`;
}

// currentLocale 归一化当前界面语言到受支持的 locale
function currentLocale(): string {
    const language = i18next.resolvedLanguage ?? i18next.language ?? "zh-CN";
    if (language.startsWith("zh")) return "zh-CN";
    if (language.startsWith("ja")) return "ja-JP";
    if (language.startsWith("ko")) return "ko-KR";
    return "en-US";
}

// applySchemas 按 locale 拉取并注册 schema
async function applySchemas(locale: string): Promise<void> {
    const schemas = await GetEditingSchemas(locale);
    const schemaEntries = Object.entries(schemas ?? {}).map(([formatKey, schemaText]) => {
        const schema = JSON.parse(schemaText as string);
        return {
            uri: schema.$id ?? `meido://editing/${formatKey}`,
            fileMatch: [editingModelPath(formatKey)],
            schema,
        };
    });
    // 注册按 model 文件名匹配的各格式 schema
    jsonDefaults.setDiagnosticsOptions({
        validate: true,
        allowComments: false,
        enableSchemaRequest: false,
        schemas: schemaEntries,
    });
    registeredLocale = locale;
}

/** registerEditingSchemas 注册全部编辑 schema，并跟随界面语言切换重新注册 */
export async function registerEditingSchemas(): Promise<void> {
    const register = async () => {
        const locale = currentLocale();
        if (locale === registeredLocale) {
            return;
        }
        try {
            await applySchemas(locale);
        } catch (err) {
            // schema 拉取失败不影响编辑功能，只是没有校验与补全
            console.warn("register editing schemas failed:", err);
        }
    };

    await register();
    i18next.on("languageChanged", () => {
        register();
    });
}
