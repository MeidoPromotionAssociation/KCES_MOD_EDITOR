import React, {useEffect, useState} from 'react';
import {Button, Dropdown, MenuProps, Modal} from 'antd';
import {useTranslation} from 'react-i18next';
import {DisclaimerAgreedKey} from '../utils/LocalStorageKeys';
import i18n from "i18next";
import {DownOutlined, TranslationOutlined} from "@ant-design/icons";
import {Application} from "@wailsio/runtime";

interface DisclaimerDialogProps {
    onAgree: () => void;
    visible: boolean;
}

const LANGUAGE_OPTIONS = [
    { label: 'English (American English)', key: 'en-US' },
    { label: '简体中文 (Simplified Chinese)', key: 'zh-CN' },
    { label: '日本語 (Japanese)', key: 'ja-JP' },
    { label: '韓國語 (Korean)', key: 'ko-KR' },
];

const DisclaimerDialog: React.FC<DisclaimerDialogProps> = ({onAgree, visible}) => {
    const {t} = useTranslation();
    const [disclaimerText, setDisclaimerText] = useState('');
    // 初始值建议优先读取 i18n 当前语言，若没有则兜底 'en-US'
    const [language, setLanguage] = useState(i18n.language || 'en-US');

    useEffect(() => {
        fetch('/Disclaimer.md')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok when fetching disclaimer.');
                }
                return response.text();
            })
            .then(text => setDisclaimerText(text))
            .catch(error => {
                console.error('Failed to load disclaimer:', error);
                setDisclaimerText(t('Disclaimer.load_error', 'Failed to load disclaimer content. Please try again later or contact support.'));
            });
    }, [t]);

    const handleAgree = () => {
        localStorage.setItem(DisclaimerAgreedKey, 'true');
        onAgree();
    };

    const handleLanguageChange: MenuProps['onClick'] = (e) => {
        i18n.changeLanguage(e.key);
        setLanguage(e.key);
    };

    const languageMenu: MenuProps = {
        items: LANGUAGE_OPTIONS,
        onClick: handleLanguageChange,
    };

    // 查找当前选中的 label
    const currentLanguageLabel = LANGUAGE_OPTIONS.find(item => item.key === language)?.label || language;

    return (
        <Modal
            title={t('Disclaimer.title')}
            open={visible}
            closable={false}
            mask={{closable: false}}
            width="80vw"
            footer={[
                <Dropdown key="language" menu={languageMenu} placement="topLeft">
                    <Button>
                        <TranslationOutlined/> {currentLanguageLabel} <DownOutlined/>
                    </Button>
                </Dropdown>,
                <Button key="cancel" onClick={() => {
                    Application.Quit();
                }}>
                    {t('Disclaimer.disagree')}
                </Button>,
                <Button key="agree" type="primary" onClick={handleAgree}>
                    {t('Disclaimer.agree')}
                </Button>
            ]}
        >
            <div style={{
                maxHeight: '60vh',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                textAlign: 'left'
            }}>
                {disclaimerText}
            </div>
        </Modal>
    );
};

export default DisclaimerDialog;
