import {isLosslessNumber, LosslessNumber, parse, stringify} from "lossless-json";

/**
 * 无损 JSON 工具
 * KCES 数据大量使用 uint64 ID（FNV64 哈希），超出 JS Number 的安全整数范围，
 * 标准 JSON.parse 会静默丢失精度导致文件损坏。
 * 这里超出安全范围的整数解析为 LosslessNumber（保留原文本），其余解析为普通 number。
 */

// parseNumber 只对不安全的大整数保留 LosslessNumber，普通数值仍用 number 方便表单编辑
function parseNumber(value: string): number | LosslessNumber {
    const num = Number(value);
    if (Number.isInteger(num) && !Number.isSafeInteger(num)) {
        return new LosslessNumber(value);
    }
    return num;
}

/** 解析 JSON 文本，大整数保留为 LosslessNumber */
export function losslessParse(text: string): any {
    return parse(text, undefined, parseNumber);
}

/** 序列化为 JSON 文本，LosslessNumber 原样输出 */
export function losslessStringify(value: any, space?: number): string {
    return stringify(value, undefined, space) ?? "";
}

/** 判断是否为大整数包装值 */
export function isBigNumber(value: any): value is LosslessNumber {
    return isLosslessNumber(value);
}

/** 数值（number 或 LosslessNumber）转显示文本 */
export function numberToString(value: any): string {
    if (isLosslessNumber(value)) {
        return value.toString();
    }
    return String(value ?? "");
}

/** 将用户输入的整数文本转回存储值：不安全的大整数用 LosslessNumber 保存 */
export function stringToInteger(text: string): number | LosslessNumber | null {
    const trimmed = text.trim();
    if (!/^-?\d+$/.test(trimmed)) {
        return null;
    }
    const num = Number(trimmed);
    if (Number.isSafeInteger(num)) {
        return num;
    }
    return new LosslessNumber(trimmed);
}

export {LosslessNumber};
