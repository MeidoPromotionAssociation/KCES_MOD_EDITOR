// frontend/src/utils/i18n.ts
import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';

import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

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
            'zh': ['zh-CN'],
            'zh-Hans': ['zh-CN'],
            'zh-Hans-CN': ['zh-CN'],
            'zh-SG': ['zh-CN'],
            'en': ['en-US'],
            'ja': ['ja-JP'],
            'ko': ['ko-KR'],
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
