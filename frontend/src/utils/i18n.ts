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
        fallbackLng: {
            'default': ['zh-CN']
        },
        interpolation: {
            escapeValue: false, // react 默认转义
        },
    });

export default i18n;
