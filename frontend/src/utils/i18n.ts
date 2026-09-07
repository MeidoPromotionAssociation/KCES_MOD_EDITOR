// frontend/src/utils/i18n.ts
import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';

import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import {Locale} from "antd/es/locale";
import enUS from "antd/locale/en_US";
import zhCN from "antd/locale/zh_CN";
import jaJP from "antd/locale/ja_JP";
import koKR from "antd/locale/ko_KR";

i18n
    // 从 /public/locales 加载翻译
    .use(Backend)
    // 检测用户语言
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        debug: false,
        load: 'currentOnly',
        nonExplicitSupportedLngs: true,
        // 不要加 supportedLngs：它和 nonExplicitSupportedLngs 同时存在时，
        // i18next 会把每个语言都判成不受支持，backend 一个请求都不发，
        // 结果是四种语言全都加载不出来、界面只剩 i18n key 原文
        //
        // webview 有时只报主语言（zh / en / ja / ko）或 zh-Hans-CN 这类扩展标签，
        fallbackLng: {
            // === 简体中文及地区/脚本变体 ===
            'zh': ['zh-CN'],
            'zh-CN': ['zh-CN'],
            'zh-Hans': ['zh-CN'],
            'zh-Hans-CN': ['zh-CN'],
            'zh-Hans-HK': ['zh-CN'],
            'zh-Hans-MO': ['zh-CN'],
            'zh-Hans-SG': ['zh-CN'],
            'zh-SG': ['zh-CN'],

            // === 繁体中文变体 ===
            'zh-Hant': ['zh-CN'],
            'zh-Hant-TW': ['zh-CN'],
            'zh-Hant-HK': ['zh-CN'],
            'zh-Hant-MO': ['zh-CN'],
            'zh-TW': ['zh-CN'],
            'zh-HK': ['zh-CN'],
            'zh-MO': ['zh-CN'],

            // === 英语及变体 ===
            'en': ['en-US'],
            'en-US': ['en-US'],
            'en-GB': ['en-US'],
            'en-AU': ['en-US'],
            'en-CA': ['en-US'],
            'en-NZ': ['en-US'],
            'en-IE': ['en-US'],
            'en-ZA': ['en-US'],
            'en-IN': ['en-US'],
            'en-SG': ['en-US'],

            // === 日语及变体 ===
            'ja': ['ja-JP'],
            'ja-JP': ['ja-JP'],

            // === 韩语及变体 ===
            'ko': ['ko-KR'],
            'ko-KR': ['ko-KR'],
            'ko-KP': ['ko-KR'],

            'default': ['en-US']
        },
        interpolation: {
            escapeValue: false, // react 默认转义
        },
    });

export default i18n;

/** UiLanguages 实际提供翻译文件的语言码，顺序即设置页语言菜单的顺序 */
export const UiLanguages = ['en-US', 'zh-CN', 'ja-JP', 'ko-KR'] as const;

/**
 * resolveUiLanguage 把检测到的语言收敛到实际有翻译的四个语言码
 * webview 报 en-GB 时 i18n.language 就是 en-GB，直接拿它去查 antd locale 或语言菜单会落空，
 * 而 i18n.languages 已经是展开后的解析层级（['en-GB', 'en-US']），取第一个命中的即可
 */
export function resolveUiLanguage(): string {
    const candidates = i18n.languages ?? [];
    for (const candidate of candidates) {
        if ((UiLanguages as readonly string[]).includes(candidate)) {
            return candidate;
        }
    }
    return 'en-US';
}


// antd 组件文案跟随界面语言，未覆盖的语言回落到英文
const antdLocales: Record<string, Locale> = {
    "en-US": enUS,
    "zh-CN": zhCN,
    "ja-JP": jaJP,
    "ko-KR": koKR,
};


// antd 的 locale 键必须是实际有翻译的四个语言码，webview 报 en-GB 这类标签时要先收敛
export function getAntdLocale(): Locale {
    return antdLocales[resolveUiLanguage()] ?? enUS;
}