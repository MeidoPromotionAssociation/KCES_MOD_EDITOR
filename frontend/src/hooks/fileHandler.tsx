import {useTranslation} from "react-i18next";
import {useNavigate} from "react-router-dom";
import {appMessage as message} from "../utils/feedback";
import React, {useState} from "react";
import {formatByFileType, formatByPath} from "../utils/consts";
import {FileTypeStrictModeKey} from "../utils/LocalStorageKeys";
import {
    DetermineFileType, GetFileSize,
    SelectFile
} from "../../bindings/github.com/MeidoPromotionAssociation/KCES_MOD_EDITOR/internal/app.ts";
import {FileInfo} from "../../bindings/github.com/MeidoPromotionAssociation/MeidoSerialization/service/COM3D2";

/**
 * useFileHandlers 文件选择、打开分发与保存的统一入口
 * 与 COM3D2_MOD_EDITOR 的 fileHandler 相同的职责：
 * 判断文件类型后跳转到对应编辑器页面，并通过 ref 调用编辑器的保存方法
 */
const useFileHandlers = () => {
    const {t} = useTranslation();
    const navigate = useNavigate();

    // 文件类型判断的严格模式设置：开启后识别失败不再按扩展名回退
    const [strictMode, setStrictMode] = useState<boolean>(() => {
        const saved = localStorage.getItem(FileTypeStrictModeKey);
        return saved ? JSON.parse(saved) : false;
    });

    // 更新严格模式设置
    const updateStrictMode = (newStrictMode: boolean) => {
        setStrictMode(newStrictMode);
        localStorage.setItem(FileTypeStrictModeKey, JSON.stringify(newStrictMode));
    };

    // handleSelectFile 选择文件，并转跳到对应页面
    // fileTypes: 要选择的文件类型，例如 "*.menuassets;*.menuassets.json"
    // description: 选择文件对话框的描述
    const handleSelectFile = async (fileTypes: string, description: string) => {
        try {
            const filePath = await SelectFile(fileTypes, description);
            if (!filePath) return;
            await fileNavigateHandler(filePath);
        } catch (err) {
            message.error(t('Errors.file_selection_error_colon') + err);
        }
    };

    // handleOpenedFile 处理已打开的文件（拖放/文件关联），转跳到对应页面
    const handleOpenedFile = async (filePath: string) => {
        await fileNavigateHandler(filePath);
    };

    // handleSaveFile 保存文件，如果有 ref，则调用 ref.current.handleSaveFile()，否则提示没有文件要保存
    const handleSaveFile = (ref: React.RefObject<any> | undefined) => {
        if (ref) {
            try {
                ref.current.handleSaveFile();
            } catch (err) {
                message.error(t('Errors.save_file_failed_colon') + err);
            }
            return;
        }
        message.warning(t('Errors.no_file_to_save'));
    };

    // handleSaveAsFile 另存为文件
    const handleSaveAsFile = (ref: React.RefObject<any> | undefined) => {
        if (ref) {
            try {
                ref.current.handleSaveAsFile();
            } catch (err) {
                message.error(t('Errors.save_as_file_failed_colon') + err);
            }
            return;
        }
        message.warning(t('Errors.no_file_to_save'));
    };

    // fileNavigateHandler 判断文件类型并跳转到对应编辑器页面
    const fileNavigateHandler = async (filePath: string) => {
        if (!filePath) return;
        try {
            const fileInfo = await DetermineFileType(filePath);

            const format = formatByFileType(fileInfo.FileType);
            if (format) {
                navigate(`/${format.key}-editor`, {state: {fileInfo}});
                return;
            }

            // 类型识别未命中（例如 psk/nei/csv 等共用格式或编辑 JSON），按扩展名回退
            if (!strictMode) {
                if (await navigateByExtension(filePath)) return;
            }

            message.error(t('Errors.file_type_not_supported'));
        } catch (err) {
            console.error("Error determining file type:", err);

            // 严格模式下不继续处理错误
            if (strictMode) {
                message.error(t('Errors.read_file_failed_colon') + ' ' + err);
                return;
            }

            if (await navigateByExtension(filePath)) return;

            message.error(t('Errors.file_type_not_supported') + ' ' + err);
        }
    };

    // navigateByExtension 按扩展名回退跳转，返回是否成功
    const navigateByExtension = async (filePath: string): Promise<boolean> => {
        const format = formatByPath(filePath);
        if (!format) {
            return false;
        }

        const fileInfo = new FileInfo();
        fileInfo.Path = filePath;
        fileInfo.Game = "KCES";
        fileInfo.FileType = format.fileType;
        fileInfo.StorageFormat = filePath.toLowerCase().endsWith(".json") ? "json" : "binary";

        try {
            fileInfo.Size = await GetFileSize(filePath);
        } catch (sizeErr: any) {
            console.warn('GetFileSize failed: ', sizeErr);
        }

        navigate(`/${format.key}-editor`, {state: {fileInfo}});
        return true;
    };

    return {
        handleSelectFile,
        handleOpenedFile,
        handleSaveFile,
        handleSaveAsFile,
        strictMode,
        updateStrictMode
    };
};


export default useFileHandlers;
