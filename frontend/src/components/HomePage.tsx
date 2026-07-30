// frontend/src/components/HomePage.tsx
import React, {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {Button, FloatButton, Layout, Space} from "antd";
import NavBar from "./NavBar";
import {useTranslation} from "react-i18next";
import {GithubOutlined, SettingOutlined} from "@ant-design/icons";
import {Browser, Window} from "@wailsio/runtime";
import {
    AllSupportedFileTypes,
    AppTitle,
    AppVersion,
    ChineseMODGuideUrl,
    GitHubReleaseUrl,
    GitHubUrl
} from "../utils/consts";
import {useVersionCheck} from "../utils/CheckUpdate";
import useFileHandlers from "../hooks/fileHandler";

const {Content} = Layout;

const HomePage: React.FC = () => {
    const {t} = useTranslation();
    const hasUpdate = useVersionCheck();
    const {handleSelectFile, handleSaveFile} = useFileHandlers();
    const navigate = useNavigate();
    const [language] = useState(() => {
        return localStorage.getItem('i18nextLng');
    });

    // 设置窗口标题
    useEffect(() => {
        const setTitle = async () => {
            await Window.SetTitle(AppTitle);
        };
        setTitle().then(() => {
        });
    });


    return (
        <Layout style={{height: "100vh"}}>
            {/* 统一的导航栏；首页只传入打开文件回调 */}
            <NavBar
                onSelectFile={() => handleSelectFile(AllSupportedFileTypes, t('Infos.kces_mod_files'))}
                onSaveFile={() => handleSaveFile(undefined)}
                onSaveAsFile={() => handleSaveFile(undefined)}
            />

            <Content
                style={{
                    padding: 20,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100%",
                }}
            >

                {/* 页面顶部 */}
                {hasUpdate && (
                    <div style={{
                        width: "100%",
                        display: "flex",
                        justifyContent: "center",
                        padding: "5px 0",
                    }}>
                        <Button
                            type="primary"
                            danger
                            style={{width: "20%"}}
                            onClick={() => Browser.OpenURL(GitHubReleaseUrl)}
                        >
                            {t('HomePage.new_version_button')}
                        </Button>
                    </div>
                )}

                {/* 页面中部 */}
                <div style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center"
                }}>
                    <Space orientation="vertical">
                        <Button type="primary"
                                onClick={() => handleSelectFile(AllSupportedFileTypes, t('Infos.kces_mod_files'))}>{t('Infos.choose_file')}</Button>
                    </Space>
                    <p style={{marginTop: 20, color: "#666"}}>
                        {t('Infos.pls_select_a_file_to_edit')}
                    </p>

                    <p>
                        {AppVersion}
                    </p>
                </div>


                {/* 页面底部 */}
                <div style={{
                    marginTop: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '0px 0'
                }}>
                    <FloatButton
                        style={{marginTop: 20}}
                        onClick={() => navigate("/settings")}
                        icon={<SettingOutlined/>}
                    >
                    </FloatButton>


                    <Button type="text" size="large" style={{color: "#666"}}
                            onClick={() => Browser.OpenURL(GitHubUrl)}>
                        <GithubOutlined/>
                    </Button>

                    {language === "zh-CN" && (
                        <Button type='text'
                                onClick={() => Browser.OpenURL(ChineseMODGuideUrl)}>
                            <p>简明 MOD 教程</p>
                        </Button>
                    )}

                    <Button type="text" size="large" style={{color: "#666"}}
                            onClick={() => Browser.OpenURL(GitHubUrl)}>
                        <p>Made With ❤ By 90135</p>
                    </Button>

                </div>

            </Content>
        </Layout>
    );
};

export default HomePage;
