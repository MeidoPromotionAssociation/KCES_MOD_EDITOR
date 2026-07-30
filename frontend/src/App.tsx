// App.tsx
import React, {useEffect, useState} from "react";
import {Route, Routes} from "react-router-dom";
import {ConfigProvider, theme} from "antd";
import {Events} from "@wailsio/runtime";
import HomePage from "./components/HomePage";
import SettingsPage from "./components/SettingsPage";
import EditorPageShell from "./components/EditorPageShell";
import DisclaimerDialog from "./components/DisclaimerDialog";
import {useDarkMode} from "./hooks/themeSwitch";
import useFileHandlers from "./hooks/fileHandler";
import {DisclaimerAgreedKey} from "./utils/LocalStorageKeys";
import {KCESFormats} from "./utils/consts";
import {registerEditingSchemas} from "./utils/monacoSchemas";
import {StartupFile} from "../bindings/github.com/MeidoPromotionAssociation/KCES_MOD_EDITOR/internal/app.ts";

const App: React.FC = () => {
    const isDarkMode = useDarkMode();
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

    // 用户拖放文件
    useEffect(() => {
        const off = Events.On('editor:file-dropped', async (event: any) => {
            const data = event?.data;
            const path = Array.isArray(data) ? data[0] : data;
            if (typeof path === "string" && path) {
                await handleOpenedFile(path);
            }
        });
        return () => {
            off();
        };
    }, [handleOpenedFile]);

    return (
        <ConfigProvider
            theme={{
                algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
            }}>
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
        </ConfigProvider>
    );
};

export default App;
