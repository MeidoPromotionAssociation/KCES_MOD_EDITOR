// frontend/src/components/SettingsPage.tsx
import {
    Button,
    Card,
    Col,
    ColorPicker,
    Dropdown,
    Layout,
    List,
    MenuProps,
    Row,
    Segmented,
    Space,
    Switch,
    Tag,
    Tooltip,
    Typography
} from "antd";
import {useTranslation} from "react-i18next";
import NavBar from "./NavBar";
import {Content} from "antd/es/layout/layout";
import useFileHandlers from "../hooks/fileHandler";
import {DefaultThemeColor, ThemeMode, useThemeColor, useThemeMode} from "../hooks/themeSwitch";
import React, {useEffect, useState} from "react";
import {
    CloseCircleOutlined,
    DownOutlined,
    QuestionCircleOutlined,
    SyncOutlined,
    TranslationOutlined
} from "@ant-design/icons";
import {checkForUpdatesWithMessage} from "../utils/CheckUpdate";
import {setRecalculateLookupHash, shouldRecalculateLookupHash} from "../utils/lookupHashSetting";
import {AllSupportedFileTypes, SettingCheckUpdateKey} from "../utils/consts";
import {NewVersionAvailableKey} from "../utils/LocalStorageKeys";
import {
    GetSettings,
    ProtocolStatus,
    SetSingleInstance
} from "../../bindings/github.com/MeidoPromotionAssociation/KCES_MOD_EDITOR/internal/app.ts";
import {appMessage as message} from "../utils/feedback";

const SettingsPage: React.FC = () => {
    const {t, i18n} = useTranslation();
    const {handleSelectFile, handleSaveFile, strictMode, updateStrictMode} = useFileHandlers();
    const [language, setLanguage] = useState(i18n.language);
    const [themeMode, setThemeMode] = useThemeMode();
    const [themeColor, setThemeColor] = useThemeColor();

    const [checkUpdates, setCheckUpdates] = useState(() => {
        const saved = localStorage.getItem(SettingCheckUpdateKey);
        return saved ? JSON.parse(saved) : true;
    });

    const [recalculateHash, setRecalculateHashState] = useState(shouldRecalculateLookupHash);

    // 单实例存在后端配置文件里而不是 localStorage：它要在窗口创建之前就被读到
    // 初值跟后端默认值一致，否则读到之前开关会先显示成开着的，看起来像被自己改掉了
    // Single instance lives in the backend settings file rather than localStorage because it is read before the window exists
    // The initial value matches the backend default, otherwise the switch would show as on until the read lands
    const [singleInstance, setSingleInstance] = useState(false);
    const [protocolScheme, setProtocolScheme] = useState("");
    const [protocolRegistered, setProtocolRegistered] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [settings, protocol] = await Promise.all([GetSettings(), ProtocolStatus()]);
                if (cancelled) return;
                setSingleInstance(settings.singleInstance);
                setProtocolScheme(protocol.scheme);
                setProtocolRegistered(protocol.registered);
            } catch (error) {
                console.warn('read startup settings failed:', error);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // 开关先跟着点击动，写失败再退回去：设置页的开关卡住不动比短暂闪回更让人困惑
    // The switch follows the click first and reverts on failure, since a frozen switch confuses more than a brief flip back
    const handleSingleInstanceChange = (checked: boolean) => {
        setSingleInstance(checked);
        SetSingleInstance(checked)
            .then(() => message.success(t('SettingsPage.single_instance_restart')))
            .catch((err) => {
                setSingleInstance(!checked);
                message.error(String(err));
            });
    };

    const handleRecalculateHashChange = (checked: boolean) => {
        setRecalculateHashState(checked);
        setRecalculateLookupHash(checked);
    };

    const handleUpdateCheck = (checked: boolean) => {
        setCheckUpdates(checked);
        localStorage.setItem(SettingCheckUpdateKey, JSON.stringify(checked));
    };

    const handleDismissUpdate = () => {
        localStorage.setItem(NewVersionAvailableKey, 'false');
    };

    const handleLanguageChange: MenuProps['onClick'] = (e) => {
        i18n.changeLanguage(e.key).then(() => {
        });
        setLanguage(e.key);
    };

    const languageMenu: MenuProps = {
        items: [
            {label: '简体中文 (Simplified Chinese)', key: "zh-CN"},
            {label: 'English (American English)', key: "en-US"},
            {label: '日本語 (Japanese)', key: "ja-JP"},
            {label: '韓國語 (Korean)', key: "ko-KR"},
        ],
        onClick: handleLanguageChange,
    };

    const languageLabel = (value: string) => {
        switch (value) {
            case 'zh-CN':
                return '简体中文 (Simplified Chinese)';
            case 'en-US':
                return 'English (American English)';
            case 'ja-JP':
                return '日本語 (Japanese)';
            case 'ko-KR':
                return '韓國語 (Korean)';
            default:
                return '简体中文 (Simplified Chinese)';
        }
    };

    return (
        <Layout style={{height: "100vh"}}>
            <NavBar
                onSelectFile={() => handleSelectFile(AllSupportedFileTypes, t('Infos.kces_mod_files'))}
                onSaveFile={() => handleSaveFile(undefined)}
                onSaveAsFile={() => handleSaveFile(undefined)}
            />
            <Content style={{padding: 24, height: "100%", overflow: "auto"}}>
                <Row gutter={[16, 16]}>
                    <Col span={24} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <Typography.Title level={4}
                                          style={{margin: 0}}>{t('EditorNavBar.SettingsPage')}</Typography.Title>
                    </Col>

                    {/* 通用设置区域 */}
                    <Col xs={24} lg={12}>
                        <Card
                            title={<Typography.Title level={5}>{t('SettingsPage.general_settings')}</Typography.Title>}
                            style={{borderRadius: 8}}
                        >
                            <List
                                split={false}
                                dataSource={[
                                    {
                                        title: t('SettingsPage.file_type_strict_mode'),
                                        tooltip: t('SettingsPage.file_type_strict_mode_tip'),
                                        checked: strictMode,
                                        onChange: updateStrictMode,
                                        type: 'switch'
                                    },
                                    {
                                        title: t('SettingsPage.recalculate_lookup_hash'),
                                        tooltip: t('SettingsPage.recalculate_lookup_hash_tip'),
                                        checked: recalculateHash,
                                        onChange: handleRecalculateHashChange,
                                        type: 'switch'
                                    },
                                    {
                                        title: t('Common.choose_language'),
                                        type: 'language',
                                        value: language
                                    },
                                    {
                                        title: t('SettingsPage.theme_mode'),
                                        tooltip: t('SettingsPage.theme_mode_tip'),
                                        type: 'theme'
                                    },
                                    {
                                        title: t('SettingsPage.theme_color'),
                                        tooltip: t('SettingsPage.theme_color_tip'),
                                        type: 'themeColor'
                                    }
                                ]}
                                renderItem={(item: any) => (
                                    <List.Item
                                        style={{padding: '16px 0'}}
                                        actions={[
                                            item.type === 'switch' ? (
                                                <Switch
                                                    key="switch"
                                                    checked={item.checked}
                                                    onChange={item.onChange}
                                                />
                                            ) : item.type === 'theme' ? (
                                                <Segmented
                                                    key="theme"
                                                    value={themeMode}
                                                    onChange={(value) => setThemeMode(value as ThemeMode)}
                                                    options={[
                                                        {label: t('SettingsPage.theme_system'), value: 'system'},
                                                        {label: t('SettingsPage.theme_light'), value: 'light'},
                                                        {label: t('SettingsPage.theme_dark'), value: 'dark'},
                                                    ]}
                                                />
                                            ) : item.type === 'themeColor' ? (
                                                <Space key="themeColor">
                                                    {themeColor ? (
                                                        <Button size="small" onClick={() => setThemeColor(null)}>
                                                            {t('SettingsPage.theme_color_reset')}
                                                        </Button>
                                                    ) : null}
                                                    <ColorPicker
                                                        value={themeColor ?? DefaultThemeColor}
                                                        showText
                                                        disabledAlpha
                                                        presets={[{
                                                            label: t('SettingsPage.theme_color_presets'),
                                                            colors: [...new Set([
                                                                DefaultThemeColor, '#1890ff', '#f5222d', '#fa541c', '#fa8c16',
                                                                '#faad14', '#a0d911', '#52c41a', '#13c2c2',
                                                                '#2f54eb', '#722ed1', '#eb2f96', '#8c8c8c', '#389E0D',
                                                            ])],
                                                        }]}
                                                        onChangeComplete={(color) => setThemeColor(color.toHexString())}
                                                    />
                                                </Space>
                                            ) : (
                                                <Dropdown key="language" menu={languageMenu} placement="bottomRight">
                                                    <Button>
                                                        {languageLabel(item.value)} <TranslationOutlined/>
                                                        <DownOutlined style={{marginLeft: 8}}/>
                                                    </Button>
                                                </Dropdown>
                                            )
                                        ]}
                                    >
                                        <Space>
                                            <span>{item.title}</span>
                                            {item.tooltip ? (
                                                <Tooltip title={item.tooltip}>
                                                    <QuestionCircleOutlined style={{color: '#aaa'}}/>
                                                </Tooltip>
                                            ) : null}
                                        </Space>
                                    </List.Item>
                                )}
                            />
                        </Card>
                    </Col>

                    {/* 更新设置区域 */}
                    <Col xs={24} lg={12}>
                        <Card
                            title={<Typography.Title level={5}>{t('SettingsPage.update_settings')}</Typography.Title>}
                            style={{borderRadius: 8}}
                        >
                            <List
                                split={false}
                                dataSource={[
                                    {
                                        title: t('SettingsPage.is_check_update'),
                                        tooltip: t('SettingsPage.is_check_update_tip'),
                                        checked: checkUpdates,
                                        onChange: handleUpdateCheck,
                                        type: 'switch'
                                    },
                                    {
                                        title: t('SettingsPage.dismiss_update_note'),
                                        tooltip: t('SettingsPage.dismiss_update_note_tip'),
                                        type: 'button',
                                        icon: <CloseCircleOutlined/>,
                                        onClick: handleDismissUpdate
                                    },
                                    {
                                        title: t('SettingsPage.check_update_now'),
                                        tooltip: '',
                                        type: 'button',
                                        icon: <SyncOutlined/>,
                                        onClick: () => checkForUpdatesWithMessage()
                                    },
                                ]}
                                renderItem={(item: any) => (
                                    <List.Item
                                        style={{padding: '16px 0'}}
                                        actions={[
                                            item.type === 'switch' ? (
                                                <Switch
                                                    key="switch"
                                                    checked={item.checked}
                                                    onChange={item.onChange}
                                                />
                                            ) : (
                                                <Button
                                                    key="button"
                                                    icon={item.icon}
                                                    onClick={item.onClick}
                                                    style={{borderRadius: 4}}
                                                >
                                                    {item.title}
                                                </Button>
                                            )
                                        ]}
                                    >
                                        <Space>
                                            <span>{item.title}</span>
                                            {item.tooltip ? (
                                                <Tooltip title={item.tooltip}>
                                                    <QuestionCircleOutlined style={{color: '#aaa'}}/>
                                                </Tooltip>
                                            ) : null}
                                        </Space>
                                    </List.Item>
                                )}
                            />
                        </Card>
                    </Col>

                    {/* 启动与集成区域：这些设置在窗口创建之前就要读到，因此存在后端配置文件里 */}
                    {/* Launch and integration: these are read before the window exists, so they live in the backend settings file */}
                    <Col xs={24} lg={12}>
                        <Card
                            title={<Typography.Title level={5}>{t('SettingsPage.launch_settings')}</Typography.Title>}
                            style={{borderRadius: 8}}
                        >
                            <List
                                split={false}
                                dataSource={[
                                    {
                                        title: t('SettingsPage.single_instance'),
                                        tooltip: t('SettingsPage.single_instance_tip'),
                                        checked: singleInstance,
                                        onChange: handleSingleInstanceChange,
                                        type: 'switch'
                                    },
                                    {
                                        title: t('SettingsPage.url_protocol'),
                                        tooltip: t('SettingsPage.url_protocol_tip', {scheme: protocolScheme || 'kces-mod-editor'}),
                                        type: 'protocol'
                                    },
                                ]}
                                renderItem={(item: any) => (
                                    <List.Item
                                        style={{padding: '16px 0'}}
                                        actions={[
                                            item.type === 'switch' ? (
                                                <Switch
                                                    key="switch"
                                                    checked={item.checked}
                                                    onChange={item.onChange}
                                                />
                                            ) : (
                                                <Space key="protocol" wrap>
                                                    {/* 复制出来的是可直接补上路径的前缀，外部工具接的就是这一段 */}
                                                    {/* Copying yields the prefix a path can be appended to, which is what external tools consume */}
                                                    <Typography.Text
                                                        code
                                                        copyable={protocolScheme ? {text: `${protocolScheme}://open?path=`} : false}
                                                    >
                                                        {protocolScheme ? `${protocolScheme}://` : '-'}
                                                    </Typography.Text>
                                                    {/* 只在确知没注册时报警：非 Windows 平台查不到注册情况，不能反过来断言已注册 */}
                                                    {/* Warning only when we know it is missing: registration is unqueryable outside Windows, so the opposite cannot be claimed */}
                                                    {protocolScheme && !protocolRegistered ? (
                                                        <Tag color="orange">{t('SettingsPage.url_protocol_unregistered')}</Tag>
                                                    ) : null}
                                                </Space>
                                            )
                                        ]}
                                    >
                                        <Space>
                                            <span>{item.title}</span>
                                            {item.tooltip ? (
                                                <Tooltip title={item.tooltip}>
                                                    <QuestionCircleOutlined style={{color: '#aaa'}}/>
                                                </Tooltip>
                                            ) : null}
                                        </Space>
                                    </List.Item>
                                )}
                            />
                        </Card>
                    </Col>
                </Row>
            </Content>
        </Layout>
    );
};

export default SettingsPage;
