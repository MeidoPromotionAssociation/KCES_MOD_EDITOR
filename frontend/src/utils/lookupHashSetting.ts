// "保存时重算 ID/GUID" 设置：仅影响 .menuassets / .materialassets / .model。
// ID 是文件名派生的查找哈希，游戏用它查找与引用部件；GUID 目前在 KCES2 代码中没有消费点。
// MeidoSerialization 写出时默认重算，这里允许用户关闭以按原值写出（可复现输出）。
import {RecalculateLookupHashKey} from "./LocalStorageKeys";

/** 读取"保存时重算 ID/GUID"设置，默认开启 */
export function shouldRecalculateLookupHash(): boolean {
    return localStorage.getItem(RecalculateLookupHashKey) !== "false";
}

/** 写入"保存时重算 ID/GUID"设置 */
export function setRecalculateLookupHash(value: boolean): void {
    localStorage.setItem(RecalculateLookupHashKey, JSON.stringify(value));
}
