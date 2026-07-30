import {GetAppVersion} from "../../bindings/github.com/MeidoPromotionAssociation/KCES_MOD_EDITOR/app";

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
 */
export interface KCESFormatDef {
    key: string;
    fileType: string;
    suffixes: string[];
    group: KCESFormatGroup;
}

// 不包含 ct/aba/mod 等打包格式，也不包含 brd/enm/vd/raw bytes 等内部格式
export const KCESFormats: KCESFormatDef[] = [
    // 服装部件 / Parts
    {key: "menuassets", fileType: "menuassets", suffixes: [".menuassets"], group: "parts"},
    {key: "materialassets", fileType: "materialassets", suffixes: [".materialassets"], group: "parts"},
    {key: "pmatassets", fileType: "pmatassets", suffixes: [".pmatassets"], group: "parts"},
    {key: "model", fileType: "model", suffixes: [".model"], group: "parts"},
    // 物理 / Physics
    {key: "dbconf", fileType: "dbconf", suffixes: [".dbconf"], group: "physics"},
    {key: "dbcol", fileType: "dbcol", suffixes: [".dbcol"], group: "physics"},
    {key: "db2conf", fileType: "db2conf", suffixes: [".db2conf"], group: "physics"},
    {key: "dsbconf", fileType: "dsbconf", suffixes: [".dsbconf"], group: "physics"},
    {key: "dsb2conf", fileType: "dsb2conf", suffixes: [".dsb2conf"], group: "physics"},
    {key: "dslconf", fileType: "dslconf", suffixes: [".dslconf"], group: "physics"},
    {key: "dsl2conf", fileType: "dsl2conf", suffixes: [".dsl2conf"], group: "physics"},
    {key: "dslcol", fileType: "dslcol", suffixes: [".dslcol"], group: "physics"},
    {key: "ikcol", fileType: "ikcol", suffixes: [".ikcol"], group: "physics"},
    {key: "ikcolbytes", fileType: "ikcol.bytes", suffixes: [".ikcol.bytes"], group: "physics"},
    {key: "limbcol", fileType: "limbcol", suffixes: [".limbcol"], group: "physics"},
    // 角色 / Character
    {key: "preset", fileType: "preset", suffixes: [".preset", ".perset"], group: "character"},
    {key: "sad", fileType: "sad", suffixes: [".sad"], group: "character"},
    {key: "hitcheck", fileType: "hitcheck", suffixes: [".hitcheck"], group: "character"},
    {key: "maidcollider", fileType: "maid_collider", suffixes: [".bytes"], group: "character"},
    // 数据 / Data
    {key: "nson", fileType: "nson", suffixes: [".nson"], group: "data"},
    {key: "undressdat", fileType: "undressdat", suffixes: [".undressdat"], group: "data"},
    {key: "undresspdat", fileType: "undresspdat", suffixes: [".undresspdat"], group: "data"},
    {key: "psk", fileType: "psk", suffixes: [".psk"], group: "data"},
    {key: "nei", fileType: "nei", suffixes: [".nei"], group: "data"},
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
 * 支持原生后缀与 `.json` 编辑后缀，`.ikcol.bytes` 优先于 `.bytes`
 */
export function formatByPath(path: string): KCESFormatDef | undefined {
    let lower = path.toLowerCase().replace(/\\/g, "/");
    lower = lower.split("/").pop() ?? lower;
    if (lower.endsWith(".json")) {
        lower = lower.slice(0, -".json".length);
    }
    if (lower.endsWith(".csv")) {
        return formatByKey("nei");
    }
    if (lower.endsWith(".ikcol.bytes")) {
        return formatByKey("ikcolbytes");
    }
    if (lower === "maid_collider.bytes" || lower === "maid_collider_touch.bytes") {
        return formatByKey("maidcollider");
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
        patterns.push(`${prefix}${suffix}.json`);
    }
    if (format.key === "nei") {
        patterns.push("*.csv");
    }
    return patterns.join(";");
}

// 支持的所有文件类型，用分号分隔
export const AllSupportedFileTypes = KCESFormats.map((format) => selectPattern(format)).join(";");
