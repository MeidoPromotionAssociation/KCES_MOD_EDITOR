import {BrightnessMax, ChromaMax, HueMax} from "./infinityColor";

/**
 * 识别 JSON 对象里的无限色结构，用于给通用递归表单挂上色块选择器
 *
 * 库里有三种字段名不同、明度约定也不同的无限色结构，都照库定义与游戏源码核对过：
 *
 *   MaidInfinityColor.PartsColor（menuassets）
 *     m_nMainHue / m_nMainChroma / m_nMainBrightness + m_nShadow*，明度 0..510，255 中性
 *   KCESPresetInfinityPartsColor / ...Point（preset）
 *     mainHue / mainChroma / mainBrightness + shadow*，明度同样 0..510
 *     （真实样本 KCES2/share_*.preset 实测 mainBrightness 0..510、mainChroma 0..255）
 *   ColorPresetFreeColor（preset 内嵌的 ColorPreset）
 *     hue / saturation / brightness / contrast；brightness 是 MaidEdit.FreeColor 的私有
 *     brightness_，取值 -255..255、0 为中性，比上面两种整体少 255
 */

export interface ColorTripleRef {
    /** 这一组是主色还是影色，用于取 i18n 标签 */
    group: "main" | "shadow";
    hueKey: string;
    chromaKey: string;
    brightnessKey: string;
    /** 该结构的明度值加上这个偏移才是 0..510 表示 */
    brightnessOffset: number;
}

/** 三种结构的主色/影色键定义 */
const Shapes: Array<{ probe: string; triples: ColorTripleRef[] }> = [
    {
        probe: "m_nMainHue",
        triples: [
            {
                group: "main",
                hueKey: "m_nMainHue",
                chromaKey: "m_nMainChroma",
                brightnessKey: "m_nMainBrightness",
                brightnessOffset: 0,
            },
            {
                group: "shadow",
                hueKey: "m_nShadowHue",
                chromaKey: "m_nShadowChroma",
                brightnessKey: "m_nShadowBrightness",
                brightnessOffset: 0,
            },
        ],
    },
    {
        probe: "mainHue",
        triples: [
            {
                group: "main",
                hueKey: "mainHue",
                chromaKey: "mainChroma",
                brightnessKey: "mainBrightness",
                brightnessOffset: 0,
            },
            {
                group: "shadow",
                hueKey: "shadowHue",
                chromaKey: "shadowChroma",
                brightnessKey: "shadowBrightness",
                brightnessOffset: 0,
            },
        ],
    },
    {
        // MaidEdit.FreeColor：brightness 存的是 -255..255 的偏移形式，没有影色分组
        probe: "saturation",
        triples: [
            {
                group: "main",
                hueKey: "hue",
                chromaKey: "saturation",
                brightnessKey: "brightness",
                brightnessOffset: 255,
            },
        ],
    },
];

function isNumber(value: any): boolean {
    return typeof value === "number" && Number.isFinite(value);
}

/** 三个键都在且都是普通数字才算命中，避免把同名的其它结构误判成颜色 */
function matches(object: Record<string, any>, triple: ColorTripleRef): boolean {
    return isNumber(object[triple.hueKey])
        && isNumber(object[triple.chromaKey])
        && isNumber(object[triple.brightnessKey]);
}

/** detectInfinityColorTriples 返回该对象里可以挂选色器的颜色分组，没有则为空数组 */
export function detectInfinityColorTriples(object: Record<string, any>): ColorTripleRef[] {
    for (const shape of Shapes) {
        if (!isNumber(object[shape.probe])) continue;
        const hit = shape.triples.filter((triple) => matches(object, triple));
        if (hit.length > 0) return hit;
    }
    return [];
}

/** readTriple 按键定义读出 0..510 明度表示的三元组 */
export function readTriple(object: Record<string, any>, triple: ColorTripleRef) {
    return {
        hue: clampInt(object?.[triple.hueKey], HueMax),
        chroma: clampInt(object?.[triple.chromaKey], ChromaMax),
        brightness: clampInt(Number(object?.[triple.brightnessKey] ?? 0) + triple.brightnessOffset, BrightnessMax),
    };
}

/** writeTriple 把选色结果写回对象，明度按该结构的偏移换算回去 */
export function writeTriple(
    object: Record<string, any>,
    triple: ColorTripleRef,
    next: { hue: number; chroma: number; brightness: number },
): Record<string, any> {
    return {
        ...object,
        [triple.hueKey]: next.hue,
        [triple.chromaKey]: next.chroma,
        [triple.brightnessKey]: next.brightness - triple.brightnessOffset,
    };
}

function clampInt(value: any, max: number): number {
    const num = Number(value ?? 0);
    if (!Number.isFinite(num)) return 0;
    return Math.min(Math.max(Math.round(num), 0), max);
}
