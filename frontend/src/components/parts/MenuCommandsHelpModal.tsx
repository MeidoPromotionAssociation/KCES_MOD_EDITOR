import React from "react";
import {Button, Divider, Modal, Space, Table, Tag, Typography} from "antd";
import {useTranslation} from "react-i18next";
import {Browser} from "@wailsio/runtime";
import {LinkOutlined} from "@ant-design/icons";
import {KCESMenuCommandDocUrl} from "../../utils/consts";

/**
 * MenuCommandsHelpModal 命令编辑器的帮助弹窗
 * 列出 Monaco 常用快捷键、自动补全的触发方式，并给出 KCES menu 命令文档外链。
 * 只在 menuassets 编辑器（MenuCommandsEditor）里使用。
 */

interface ShortcutRow {
    key: string;
    keys: string[];
    action: string;
}

const MenuCommandsHelpModal: React.FC<{
    open: boolean;
    onClose: () => void;
}> = ({open, onClose}) => {
    const {t} = useTranslation();

    // 快捷键取自 Monaco 默认键位，Ctrl+W 是本项目在 menuMonacoConfig 里自定义的删行
    const shortcuts: ShortcutRow[] = [
        {key: "suggest", keys: ["Ctrl", "Space"], action: t("MenuAssetsEditor.help.shortcut_suggest")},
        {key: "hover", keys: ["Ctrl", "K", "Ctrl", "I"], action: t("MenuAssetsEditor.help.shortcut_hover")},
        {key: "deleteLine", keys: ["Ctrl", "W"], action: t("MenuAssetsEditor.help.shortcut_delete_line")},
        {key: "moveLine", keys: ["Alt", "↑/↓"], action: t("MenuAssetsEditor.help.shortcut_move_line")},
        {key: "copyLine", keys: ["Shift", "Alt", "↑/↓"], action: t("MenuAssetsEditor.help.shortcut_copy_line")},
        {key: "find", keys: ["Ctrl", "F"], action: t("MenuAssetsEditor.help.shortcut_find")},
        {key: "replace", keys: ["Ctrl", "H"], action: t("MenuAssetsEditor.help.shortcut_replace")},
        {key: "multiCursor", keys: ["Alt", t("MenuAssetsEditor.help.mouse_click")], action: t("MenuAssetsEditor.help.shortcut_multi_cursor")},
        {key: "selectNext", keys: ["Ctrl", "D"], action: t("MenuAssetsEditor.help.shortcut_select_next")},
        {key: "undo", keys: ["Ctrl", "Z"], action: t("MenuAssetsEditor.help.shortcut_undo")},
        {key: "palette", keys: ["F1"], action: t("MenuAssetsEditor.help.shortcut_palette")},
    ];

    const columns = [
        {
            title: t("MenuAssetsEditor.help.column_keys"),
            dataIndex: "keys",
            key: "keys",
            width: "42%",
            render: (keys: string[]) => (
                <Space size={4} wrap>
                    {keys.map((k, i) => (
                        <Tag key={`${k}-${i}`} style={{marginInlineEnd: 0}}>{k}</Tag>
                    ))}
                </Space>
            ),
        },
        {
            title: t("MenuAssetsEditor.help.column_action"),
            dataIndex: "action",
            key: "action",
        },
    ];

    return (
        <Modal
            open={open}
            onCancel={onClose}
            title={t("MenuAssetsEditor.help.title")}
            width={720}
            footer={
                <Button type="primary" onClick={onClose}>
                    {t("MenuAssetsEditor.help.close")}
                </Button>
            }
        >
            <Typography.Paragraph type="secondary" style={{marginTop: 0}}>
                {t("MenuAssetsEditor.help.intro")}
            </Typography.Paragraph>

            <Divider style={{marginBlock: 12}}>
                {t("MenuAssetsEditor.help.completion_section")}
            </Divider>
            <Typography.Paragraph style={{marginBottom: 8}}>
                {/* 全局 #root 是 text-align:center，这里显式左对齐，否则列表文字会居中 */}
                <ul style={{paddingInlineStart: 20, margin: 0, textAlign: "left"}}>
                    <li>{t("MenuAssetsEditor.help.completion_command_line")}</li>
                    <li>{t("MenuAssetsEditor.help.completion_param_line")}</li>
                    <li>{t("MenuAssetsEditor.help.completion_snippet")}</li>
                    <li>{t("MenuAssetsEditor.help.completion_hover")}</li>
                    <li>{t("MenuAssetsEditor.help.completion_manual")}</li>
                </ul>
            </Typography.Paragraph>
            <Typography.Paragraph type="secondary" style={{marginBottom: 0}}>
                {t("MenuAssetsEditor.help.completion_note")}
            </Typography.Paragraph>

            <Divider style={{marginBlock: 12}}>
                {t("MenuAssetsEditor.help.shortcut_section")}
            </Divider>
            <Table<ShortcutRow>
                size="small"
                pagination={false}
                columns={columns}
                dataSource={shortcuts}
                rowKey="key"
            />

            <Divider style={{marginBlock: 12}}>
                {t("MenuAssetsEditor.help.doc_section")}
            </Divider>
            <Typography.Paragraph style={{marginBottom: 8}}>
                {t("MenuAssetsEditor.help.doc_intro")}
            </Typography.Paragraph>
            <Button
                icon={<LinkOutlined/>}
                onClick={() => Browser.OpenURL(KCESMenuCommandDocUrl)}
            >
                {t("MenuAssetsEditor.help.doc_link")}
            </Button>
        </Modal>
    );
};

export default MenuCommandsHelpModal;
