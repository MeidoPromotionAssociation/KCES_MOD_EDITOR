import {GetAppVersion} from "../../bindings/github.com/MeidoPromotionAssociation/KCES_MOD_EDITOR/internal/app.ts";

export const AppVersion = await GetAppVersion();

export const UpdateCheckInterval = 24 * 60 * 60 * 1000; // 检查更新的间隔 24 小时（毫秒）

export const RetryInterval = 1 * 60 * 60 * 1000; // 重试检查更新间隔 1 小时（毫秒）

export const AppTitle = "KCES MOD EDITOR by 90135  -  " + AppVersion;

export const AppTitleNoAuthor = "KCES MOD EDITOR";

export const SettingCheckUpdateKey = "SettingCheckUpdateKey"; // 检查更新设置的键

export const GitHubUrl = "https://github.com/MeidoPromotionAssociation/KCES_MOD_EDITOR"; // GitHub 仓库地址

export const GitHubReleaseUrl = "https://github.com/MeidoPromotionAssociation/KCES_MOD_EDITOR/releases"; // GitHub 仓库的发布页面地址

export const ChineseMODGuideUrl = "https://github.com/MeidoPromotionAssociation/COM3D2_Simple_MOD_Guide_Chinese"; // 中文 MOD 教程，简明 MOD 教程

/** 格式分组，用于 NavBar 与 HomePage 归类 */
export type KCESFormatGroup = "parts" | "physics" | "character" | "data";

/**
 * KCESFormatDef 描述一个 KCES 编辑器支持的格式页面
 * - key: 内部标识，同时用于路由（`/${key}-editor`）、i18n（`EditorNavBar.${key}`）与视图模式存储
 * - fileType: 后端 DetermineFileType 返回的 FileType 名称
 * - suffixes: 原生文件后缀（小写），用于扩展名回退与保存校验
 * - altSuffixes: 同一编辑器可直接读写的其他明文后缀（如 .nei 的 .csv），没有 `.json` 编辑变体
 * - noJsonVariant: 该格式没有编辑 JSON 变体（如贴图），选择对话框不追加 `*.xxx.json`
 */
export interface KCESFormatDef {
    key: string;
    fileType: string;
    suffixes: string[];
    altSuffixes?: string[];
    group: KCESFormatGroup;
    noJsonVariant?: boolean;
}

/** Texture2D 编辑器可作为「图像 → 贴图」输入直接打开的图像后缀 */
export const Texture2DImageSuffixes = [".png", ".jpg", ".jpeg", ".bmp", ".gif"];

/** 所有支持的格式 **/
export const KCESFormats: KCESFormatDef[] = [
    // 服装部件 / Parts
    {key: "menuassets", fileType: "menuassets", suffixes: [".menuassets"], group: "parts"},
    {key: "materialassets", fileType: "materialassets", suffixes: [".materialassets"], group: "parts"},
    {key: "pmatassets", fileType: "pmatassets", suffixes: [".pmatassets"], group: "parts"},
    {key: "model", fileType: "model", suffixes: [".model"], group: "parts"},
    // 贴图是独立 Unity Texture2D 对象，不是结构化 JSON，因此没有 .json 编辑变体；
    {
        key: "texture2d",
        fileType: "texture2d",
        suffixes: [".tex", ".texture2d", ".texture2d"],
        group: "parts",
        noJsonVariant: true,
    },
    // 物理 / Physics
    {key: "dbconf", fileType: "dbconf", suffixes: [".dbconf"], group: "physics"},
    {key: "dbcol", fileType: "dbcol", suffixes: [".dbcol"], group: "physics"},
    {key: "db2conf", fileType: "db2conf", suffixes: [".db2conf"], group: "physics"},
    {key: "dsbconf", fileType: "dsbconf", suffixes: [".dsbconf"], group: "physics"},
    {key: "dsb2conf", fileType: "dsb2conf", suffixes: [".dsb2conf"], group: "physics"},
    {key: "dslconf", fileType: "dslconf", suffixes: [".dslconf"], group: "physics"},
    {key: "dsl2conf", fileType: "dsl2conf", suffixes: [".dsl2conf"], group: "physics"},
    {key: "dslcol", fileType: "dslcol", suffixes: [".dslcol"], group: "physics"},
    // 角色 / Character
    {key: "preset", fileType: "preset", suffixes: [".preset", ".perset"], group: "character"},
    // 数据 / Data
    {key: "nson", fileType: "nson", suffixes: [".nson"], group: "data"},
    {key: "undressdat", fileType: "undressdat", suffixes: [".undressdat"], group: "data"},
    {key: "undresspdat", fileType: "undresspdat", suffixes: [".undresspdat"], group: "data"},
    {key: "nei", fileType: "nei", suffixes: [".nei"], altSuffixes: [".csv"], group: "data"},
];

export const KCESFormatGroups: KCESFormatGroup[] = ["parts", "physics", "character", "data"];

/** 按 key 查找格式 */
export function formatByKey(key: string): KCESFormatDef | undefined {
    return KCESFormats.find((format) => format.key === key);
}

/** 按后端返回的 FileType 查找格式 */
export function formatByFileType(fileType: string): KCESFormatDef | undefined {
    return KCESFormats.find((format) => format.fileType === fileType);
}

/**
 * 按文件路径的扩展名回退匹配格式（用于类型识别失败时）
 * 支持原生后缀、`.json` 编辑后缀与 altSuffixes（如 .csv），`.ikcol.bytes` 优先于 `.bytes`
 * 图像文件交给 Texture2D 编辑器，作为「图像 → 贴图」方向的输入
 */
export function formatByPath(path: string): KCESFormatDef | undefined {
    let lower = path.toLowerCase().replace(/\\/g, "/");
    lower = lower.split("/").pop() ?? lower;
    if (lower.endsWith(".json")) {
        lower = lower.slice(0, -".json".length);
    }
    for (const format of KCESFormats) {
        for (const suffix of format.altSuffixes ?? []) {
            if (lower.endsWith(suffix)) {
                return format;
            }
        }
    }
    if (Texture2DImageSuffixes.some((suffix) => lower.endsWith(suffix))) {
        return formatByKey("texture2d");
    }
    for (const format of KCESFormats) {
        for (const suffix of format.suffixes) {
            if (suffix.startsWith(".") && lower.endsWith(suffix)) {
                return format;
            }
        }
    }
    return undefined;
}

/** 单个格式的文件选择对话框 pattern，例如 "*.dbconf;*.dbconf.json" */
export function selectPattern(format: KCESFormatDef): string {
    const patterns: string[] = [];
    for (const suffix of format.suffixes) {
        const prefix = suffix.startsWith(".") ? "*" : "";
        patterns.push(`${prefix}${suffix}`);
        // 贴图这类没有编辑 JSON 变体的格式不追加 .json
        if (!format.noJsonVariant) {
            patterns.push(`${prefix}${suffix}.json`);
        }
    }
    // altSuffixes 是明文格式，没有 `.json` 编辑变体
    for (const suffix of format.altSuffixes ?? []) {
        patterns.push(`*${suffix}`);
    }
    return patterns.join(";");
}

/** 判断路径是否命中某格式的 altSuffixes（例如 .nei 编辑器的 .csv） */
export function isAltSuffixPath(path: string, format: KCESFormatDef): boolean {
    const lower = path.toLowerCase();
    return (format.altSuffixes ?? []).some((suffix) => lower.endsWith(suffix));
}

// 支持的所有文件类型，用分号分隔
export const AllSupportedFileTypes = KCESFormats.map((format) => selectPattern(format)).join(";");
