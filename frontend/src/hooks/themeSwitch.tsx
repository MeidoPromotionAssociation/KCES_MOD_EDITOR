import {useEffect, useState} from "react";
import {ThemeModeKey} from "../utils/LocalStorageKeys";

/** 主题模式：跟随系统 / 浅色 / 深色 */
export type ThemeMode = "system" | "light" | "dark";

// 模块级主题模式存储，广播给所有使用主题的组件（antd ConfigProvider 与各 Monaco 编辑器）
let currentMode: ThemeMode = readStoredMode();
const listeners = new Set<() => void>();

function readStoredMode(): ThemeMode {
    const saved = localStorage.getItem(ThemeModeKey);
    return saved === "light" || saved === "dark" ? saved : "system";
}

/** getThemeMode 返回当前主题模式 */
export function getThemeMode(): ThemeMode {
    return currentMode;
}

/** setThemeMode 切换主题模式并持久化，通知所有订阅组件 */
export function setThemeMode(mode: ThemeMode): void {
    currentMode = mode;
    localStorage.setItem(ThemeModeKey, mode);
    listeners.forEach((listener) => listener());
}

function systemPrefersDark(): boolean {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function effectiveDark(mode: ThemeMode): boolean {
    return mode === "dark" || (mode === "system" && systemPrefersDark());
}

/** useThemeMode 返回当前主题模式及切换函数（供设置页使用） */
export function useThemeMode(): [ThemeMode, (mode: ThemeMode) => void] {
    const [mode, setMode] = useState(currentMode);

    useEffect(() => {
        const listener = () => setMode(currentMode);
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    }, []);

    return [mode, setThemeMode];
}

/** useDarkMode 返回当前是否应使用深色主题（综合用户设置与系统偏好） */
export function useDarkMode() {
    const [isDarkMode, setIsDarkMode] = useState(() => effectiveDark(currentMode));

    useEffect(() => {
        const update = () => setIsDarkMode(effectiveDark(currentMode));

        // 系统主题变化（仅在跟随系统时生效，effectiveDark 内部判断）
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        mediaQuery.addEventListener("change", update);
        // 用户手动切换主题模式
        listeners.add(update);
        return () => {
            mediaQuery.removeEventListener("change", update);
            listeners.delete(update);
        };
    }, []);

    return isDarkMode;
}
