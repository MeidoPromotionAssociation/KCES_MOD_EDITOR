// App.tsx
import React, {useEffect, useState} from "react";
import {Route, Routes} from "react-router-dom";
import {App as AntdApp, ConfigProvider, theme} from "antd";
import {Events} from "@wailsio/runtime";
import HomePage from "./components/HomePage";
import SettingsPage from "./components/SettingsPage";
import EditorPageShell from "./components/EditorPageShell";
import DisclaimerDialog from "./components/DisclaimerDialog";
import {DefaultThemeColor, useDarkMode, useThemeColor} from "./hooks/themeSwitch";
import useFileHandlers from "./hooks/fileHandler";
import {DisclaimerAgreedKey} from "./utils/LocalStorageKeys";
import {KCESFormats} from "./utils/consts";
import {registerEditingSchemas} from "./utils/monacoSchemas";
import {StartupFile} from "../bindings/github.com/MeidoPromotionAssociation/KCES_MOD_EDITOR/internal/app.ts";
import {bindMessage, bindModal} from "./utils/feedback";
import {resolveUiLanguage} from "./utils/i18n.ts";
import {Locale} from "antd/es/locale";
import zhCN from "antd/locale/zh_CN";
import enUS from "antd/locale/en_US";
import jaJP from "antd/locale/ja_JP";
import koKR from "antd/locale/ko_KR";

// MessageBinder 把组件树内（可消费主题上下文）的 message 与 modal 实例绑定到全局桥
const MessageBinder: React.FC = () => {
    const {message, modal} = AntdApp.useApp();
    useEffect(() => {
        bindMessage(message);
        bindModal(modal);
    }, [message, modal]);
    return null;
};

// antd 组件文案跟随界面语言，未覆盖的语言回落到英文
const AntdLocales: Record<string, Locale> = {
    "en-US": enUS,
    "zh-CN": zhCN,
    "ja-JP": jaJP,
    "ko-KR": koKR,
};


const App: React.FC = () => {
    const isDarkMode = useDarkMode();
    const [themeColor] = useThemeColor();
    const {handleOpenedFile} = useFileHandlers();
    const [showDisclaimer, setShowDisclaimer] = useState(() => {
        return localStorage.getItem(DisclaimerAgreedKey) !== 'true';
    });

    // 用户同意免责声明
    const handleAgreeDisclaimer = () => {
        setShowDisclaimer(false);
        localStorage.setItem(DisclaimerAgreedKey, 'true');
    };

    // 注册各格式的编辑 JSON Schema（Monaco 校验/补全/悬停）
    useEffect(() => {
        registerEditingSchemas();
    }, []);

    // 通过文件关联启动时打开传入的文件
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const path = await StartupFile();
                if (!cancelled && path) {
                    await handleOpenedFile(path);
                }
            } catch (err) {
                console.error("open startup file failed:", err);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // 用户拖放文件，或外部工具通过 kces-mod-editor:// 协议请求打开文件
    // 协议请求由单实例机制转交过来，冷启动时则已经在 StartupFile 里处理过
    useEffect(() => {
        const openFromEvent = async (event: any) => {
            const data = event?.data;
            const path = Array.isArray(data) ? data[0] : data;
            if (typeof path === "string" && path) {
                await handleOpenedFile(path);
            }
        };
        const offDropped = Events.On('editor:file-dropped', openFromEvent);
        const offProtocol = Events.On('editor:protocol-open', openFromEvent);
        return () => {
            offDropped();
            offProtocol();
        };
    }, [handleOpenedFile]);

    // antd 的 locale 键必须是实际有翻译的四个语言码，webview 报 en-GB 这类标签时要先收敛
    const antdLocale = AntdLocales[resolveUiLanguage()] ?? enUS;

    return (
        <ConfigProvider
            locale={antdLocale}
            theme={{
                algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
                // 未自定义时用 DefaultThemeColor，而不是留空让 antd 回落到它自己的主色
                token: {colorPrimary: themeColor ?? DefaultThemeColor},
            }}>
            <AntdApp component={false}>
                <MessageBinder/>
                <DisclaimerDialog visible={showDisclaimer} onAgree={handleAgreeDisclaimer}/>
                {!showDisclaimer && (
                    <Routes>
                        <Route path="/" element={<HomePage/>}/>
                        {KCESFormats.map((format) => (
                            <Route
                                key={format.key}
                                path={`/${format.key}-editor`}
                                element={<EditorPageShell format={format}/>}
                            />
                        ))}
                        <Route path="/settings" element={<SettingsPage/>}/>
                    </Routes>
                )}
            </AntdApp>
        </ConfigProvider>
    );
};

export default App;
