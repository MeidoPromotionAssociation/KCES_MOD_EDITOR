// CheckUpdate
export const LastUpdateCheckTimeKey = "LastUpdateCheckTime"; // 存储上次检查时间的键

export const NewVersionAvailableKey = "NewVersionAvailable"; // 存储新版本是否可用的键

export const LatestVersionKey = "LatestVersion"; // 存储最新版本号的键

export const UpdateRetryKey = "UpdateRetry"; // 存储是否重试的键

// Common
export const DisclaimerAgreedKey = "DisclaimerAgreedKey"; // 存储免责声明同意状态的键

export const FileTypeStrictModeKey = "FileTypeStrictMode"; // 存储文件类型判断的严格模式设置

export const ThemeModeKey = "ThemeMode"; // 存储主题模式（system / light / dark）

export const ThemeColorKey = "ThemeColor"; // 存储自定义主题色（hex，空表示默认色）

export const RecalculateLookupHashKey = "RecalculateLookupHash"; // 存储保存时是否重算 ID/GUID 查找字段（默认重算）

export const AssetListWidthKey = "AssetListWidth"; // 存储 xxxassets 编辑器左侧资产列表的宽度（px）

// 每个格式编辑器的视图模式键统一由此函数生成
export function editorViewModeKey(formatKey: string): string {
    return `${formatKey}EditorViewMode`;
}
