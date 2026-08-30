/**
 * 无限色参数与 RGB 的换算
 *
 * 取值上限照游戏源码 Com3d2Native/ColorPalette.cs 的常量核对：
 *   hueMaxNumber 255 / chromaMaxNumber 255 / brightnessMaxNumber 510
 *   contrastMaxNumber 200 / shadowRateMaxNumber 255
 *
 * 需要留意的是这组参数不是一个颜色值，而是「对源贴图像素做 HSL 调整」的参数：
 * ColorPalette.DllHslSet 传给原生 DLL 时 hue、sat 原样传（绝对值），
 * brightness 减 255、contrast 减 100（相对偏移），真正的像素运算在
 * Com3d2Native.dll 里，KCES 与 COM3D2 都没有托管实现可参照。
 *
 * 所以下面的换算只能作参考预览：假定源像素明度为中性（L = 0.5），于是
 *   H = hue / 255 × 360      S = chroma / 255      L = brightness / 510
 * brightness 的中性值 255 正好落在 L = 0.5，0 为纯黑、510 为纯白，与游戏里
 * 「亮度偏移 = brightness - 255」的语义一致。contrast 与阴影阈值体现不到色块上，
 * 选色器也不会去改它们。
 */

/** 色相上限（ColorPalette.hueMaxNumber） */
export const HueMax = 255;
/** 彩度上限（ColorPalette.chromaMaxNumber） */
export const ChromaMax = 255;
/** 明度上限（ColorPalette.brightnessMaxNumber），255 为中性 */
export const BrightnessMax = 510;
/** 对比度上限（ColorPalette.contrastMaxNumber），100 为中性 */
export const ContrastMax = 200;
/** 阴影混合比例上限（ColorPalette.shadowRateMaxNumber） */
export const ShadowRateMax = 255;

/** MaidEdit.FreeColor 里 brightness_ 是 -255..255 的偏移形式，与上面的 0..510 差一个 255 */
export const FreeColorBrightnessMin = -255;
export const FreeColorBrightnessMax = 255;

export interface InfinityColorTriple {
    /** 0..255 */
    hue: number;
    /** 0..255 */
    chroma: number;
    /** 0..510，255 为中性 */
    brightness: number;
}

function clamp(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) return min;
    return Math.min(Math.max(value, min), max);
}

/** hslToRgb 标准 HSL → RGB，各分量 0..1 进 0..255 出 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    if (s <= 0) {
        const gray = Math.round(l * 255);
        return [gray, gray, gray];
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const channel = (t: number) => {
        let shifted = t;
        if (shifted < 0) shifted += 1;
        if (shifted > 1) shifted -= 1;
        if (shifted < 1 / 6) return p + (q - p) * 6 * shifted;
        if (shifted < 1 / 2) return q;
        if (shifted < 2 / 3) return p + (q - p) * (2 / 3 - shifted) * 6;
        return p;
    };
    return [
        Math.round(channel(h + 1 / 3) * 255),
        Math.round(channel(h) * 255),
        Math.round(channel(h - 1 / 3) * 255),
    ];
}

/** rgbToHsl 标准 RGB → HSL，各分量 0..255 进 0..1 出 */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    const red = r / 255;
    const green = g / 255;
    const blue = b / 255;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const lightness = (max + min) / 2;
    if (max === min) {
        return [0, 0, lightness];
    }
    const delta = max - min;
    const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    let hue: number;
    if (max === red) {
        hue = ((green - blue) / delta + (green < blue ? 6 : 0)) / 6;
    } else if (max === green) {
        hue = ((blue - red) / delta + 2) / 6;
    } else {
        hue = ((red - green) / delta + 4) / 6;
    }
    return [hue, saturation, lightness];
}

/** infinityColorToCss 把无限色参数换成用于色块预览的 rgb() 字符串 */
export function infinityColorToCss(triple: Partial<InfinityColorTriple> | null | undefined): string {
    const hue = clamp(Number(triple?.hue ?? 0), 0, HueMax) / HueMax;
    const chroma = clamp(Number(triple?.chroma ?? 0), 0, ChromaMax) / ChromaMax;
    const brightness = clamp(Number(triple?.brightness ?? 0), 0, BrightnessMax) / BrightnessMax;
    const [r, g, b] = hslToRgb(hue, chroma, brightness);
    return `rgb(${r},${g},${b})`;
}

/** cssRgbToInfinityColor 把选色器给出的 RGB 换回无限色参数（整数，落在游戏的取值范围内） */
export function cssRgbToInfinityColor(r: number, g: number, b: number): InfinityColorTriple {
    const [hue, saturation, lightness] = rgbToHsl(r, g, b);
    return {
        hue: Math.round(hue * HueMax),
        chroma: Math.round(saturation * ChromaMax),
        brightness: Math.round(lightness * BrightnessMax),
    };
}
