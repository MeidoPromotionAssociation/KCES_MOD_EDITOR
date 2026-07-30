import {useEffect, useState} from 'react';
import {AppVersion, RetryInterval, SettingCheckUpdateKey, UpdateCheckInterval} from "./consts";
import {appMessage as message} from "./feedback";
import {t} from "i18next";
import {LastUpdateCheckTimeKey, LatestVersionKey, NewVersionAvailableKey, UpdateRetryKey} from "./LocalStorageKeys";
import {CheckLatestVersion} from "../../bindings/github.com/MeidoPromotionAssociation/KCES_MOD_EDITOR/internal/app.ts";


/**
 * 立刻检查更新并提示成功与否
 */
export async function checkForUpdatesWithMessage() {
    try {
        const result = await CheckLatestVersion();

        updateLastCheckTime();

        if (result.IsNewer) {
            localStorage.setItem(LatestVersionKey, result.LatestVersion);
            localStorage.setItem(NewVersionAvailableKey, 'true');
            message.success(t('Infos.check_update_success_new_version_available'));
            return true;
        } else {
            localStorage.setItem(LatestVersionKey, result.LatestVersion);
            localStorage.setItem(NewVersionAvailableKey, 'false');
            message.success(t('Infos.check_update_success_no_new_version'));
            return false;
        }
    } catch (error) {
        message.error(t('Errors.fail_to_check_update') + error);
        console.error('check update failed:', error);
        setRetryInterval();
        return false;
    }
}


/**
 * 检查更新
 * @param force 是否立即检查
 * @returns {Promise<boolean>} 是否有新版本
 */
export async function checkForUpdates(force: boolean = false): Promise<boolean> {
    try {
        const storedLatestVersion = localStorage.getItem(LatestVersionKey);
        const newVersionAvailable = localStorage.getItem(NewVersionAvailableKey);

        // 如果当前版本大于等于已存储的最新版本，清除相关本地存储
        if (storedLatestVersion && compareVersions(AppVersion, storedLatestVersion) >= 0) {
            clearUpdateInfo();
            return false;
        }

        if (!force) {
            if (newVersionAvailable === 'true') {
                return true;
            } else if (newVersionAvailable === 'false') {
                return false;
            }

            if (!shouldCheckForUpdate()) {
                return !!newVersionAvailable;
            }
        }

        const result = await CheckLatestVersion();

        updateLastCheckTime();

        if (result.IsNewer) {
            localStorage.setItem(LatestVersionKey, result.LatestVersion);
            localStorage.setItem(NewVersionAvailableKey, 'true');
            return true;
        } else {
            localStorage.setItem(LatestVersionKey, result.LatestVersion);
            localStorage.setItem(NewVersionAvailableKey, 'false');
            return false;
        }
    } catch (error) {
        console.error('check update failed:', error);
        setRetryInterval();
        return false;
    }
}

/**
 * 判断是否应该检查更新
 */
function shouldCheckForUpdate(): boolean {
    const check = localStorage.getItem(SettingCheckUpdateKey);
    if (check === null) {
        localStorage.setItem(SettingCheckUpdateKey, 'true');
    }
    if (check === 'false') {
        return false;
    }

    const lastCheckTime = localStorage.getItem(LastUpdateCheckTimeKey);
    if (!lastCheckTime) {
        return true;
    }

    const currentTime = new Date().getTime();
    const lastCheck = parseInt(lastCheckTime, 10);

    const interval = localStorage.getItem(UpdateRetryKey) === 'true'
        ? RetryInterval
        : UpdateCheckInterval;

    return currentTime - lastCheck >= interval;
}

/**
 * 更新上次检查时间
 */
function updateLastCheckTime(): void {
    const currentTime = new Date().getTime();
    localStorage.setItem(LastUpdateCheckTimeKey, currentTime.toString());

    if (localStorage.getItem(UpdateRetryKey) === 'true') {
        localStorage.removeItem(UpdateRetryKey);
    }
}

/**
 * 设置重试间隔
 */
function setRetryInterval(): void {
    localStorage.setItem(UpdateRetryKey, 'true');
}

/**
 * 清除更新相关信息
 */
function clearUpdateInfo(): void {
    localStorage.removeItem(NewVersionAvailableKey);
    localStorage.removeItem(LatestVersionKey);
}

/**
 * 比较版本号
 * @returns {number} 如果 ver1 > ver2 返回 1，如果 ver1 < ver2 返回 -1，相等返回 0
 */
function compareVersions(ver1: string, ver2: string): number {
    const v1 = ver1.startsWith('v') ? ver1.substring(1) : ver1;
    const v2 = ver2.startsWith('v') ? ver2.substring(1) : ver2;

    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const num1 = i < parts1.length ? parts1[i] : 0;
        const num2 = i < parts2.length ? parts2[i] : 0;

        if (num1 > num2) return 1;
        if (num1 < num2) return -1;
    }

    return 0;
}

/**
 * 使用自定义 Hook 监控版本更新
 * @returns {boolean} 是否有新版本可用
 */
export function useVersionCheck(): boolean {
    const [hasUpdate, setHasUpdate] = useState<boolean>(false);

    useEffect(() => {
        const checkUpdate = async () => {
            const result = await checkForUpdates();
            setHasUpdate(result);
        };

        checkUpdate().then(() => {
        });
    }, []);

    return hasUpdate;
}
