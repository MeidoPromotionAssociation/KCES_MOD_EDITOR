/**
 * KCES 枚举映射表，来源：game/KCES 1.34.4/Assembly-CSharp/Parts/Menu.cs 与 Material.cs
 * Menu.Command.Type 与 Material.PropertType 都是按声明顺序的数字枚举
 */

// Menu.Command.Type 枚举名（下标即枚举值）
export const MenuCommandTypeNames: string[] = [
    "additem",            // 0
    "anime",              // 1
    "animematerial",      // 2
    "blendset",           // 3
    "bonemorph",          // 4
    "color",              // 5
    "commenttype",        // 6
    "delitem",            // 7
    "endcommand",         // 8
    "ifcommand",          // 9
    "length",             // 10
    "mancolor",           // 11
    "maskitem",           // 12
    "node消去",            // 13
    "node表示",            // 14
    "nofloory",           // 15
    "param2",             // 16
    "paramset",           // 17
    "prop",               // 18
    "saveitem",           // 19
    "set",                // 20
    "setname",            // 21
    "setslotitem",        // 22
    "shader",             // 23
    "tex",                // 24
    "useredit",           // 25
    "ver",                // 26
    "アイテム",             // 27
    "アイテムパラメータ",      // 28
    "アイテム条件",          // 29
    "アタッチポイントの設定",   // 30
    "テクスチャセット合成",     // 31
    "テクスチャ合成",         // 32
    "テクスチャ乗算",         // 33
    "テクスチャ変更",         // 34
    "パーツnode消去",        // 35
    "パーツnode表示",        // 36
    "マテリアル変更",         // 37
    "リソース参照",          // 38
    "半脱ぎ",              // 39
    "delitemnewattach",   // 40
    "partcolor",          // 41
    "partcolordef",       // 42
    "pattern",            // 43
    "material",           // 44
    "uv定義",              // 45
    "ほくろ合成",           // 46
    "タトゥ合成",           // 47
    "ネイル合成",           // 48
    "gradacolordef",      // 49
    "メイク合成",           // 50
    "ifdef",              // 51
    "elseifdef",          // 52
    "endifdef",           // 53
    "mugencolordef",      // 54
    "partcolorrgb",       // 55
    "meshmorph",          // 56
    "マテリアル参照",        // 57
    "addbonemorph",       // 58
    "乳首",               // 59
    "adjcutoff",          // 60
    "parthidemove",       // 61
    "房tex",              // 62
    "munekagergb",        // 63
    "mask消去",            // 64
    "munekage",           // 65
    "そばかす合成",          // 66
    "ちんこ",              // 67
    "ひげ合成",             // 68
    "しみ合成",             // 69
    "しわ合成",             // 70
    "体毛合成",             // 71
    "cutout消去",          // 72
];

// 命令名 → 枚举值
export const MenuCommandTypeByName: Map<string, number> = new Map(
    MenuCommandTypeNames.map((name, index) => [name, index])
);

/** 命令枚举值 → 名称，未知值返回 #数字 形式 */
export function menuCommandName(type: number): string {
    return MenuCommandTypeNames[type] ?? `#${type}`;
}

/** 命令名称 → 枚举值；同时接受纯数字与 #数字 形式（不限定于已知枚举），无法解析返回 null */
export function menuCommandType(name: string): number | null {
    const trimmed = name.trim();
    const known = MenuCommandTypeByName.get(trimmed);
    if (known !== undefined) {
        return known;
    }
    if (/^#?\d+$/.test(trimmed)) {
        return Number(trimmed.replace(/^#/, ""));
    }
    return null;
}

/** Material.PropertType 纹理属性枚举（0 起） */
export const TexturePropNames: Record<number, string> = {
    0: "_MainTex",
    1: "_BumpMap",
    2: "_ToonRamp",
    3: "_ShadowTex",
    4: "_ShadowRateToon",
    5: "_SpecularTex",
    6: "_AnisoTex",
    7: "_RenderTex",
    8: "_HiTex",
    9: "_OutlineTex",
    10: "_OutlineToonRamp",
    11: "_SpecularMap",
    12: "_MuscleNormalMap",
    13: "_MuscleHeightMap",
    14: "_MultiColTex",
    15: "_NormalMap",
    16: "_MovieSticker",
    17: "_OutlineWidthSampler",
    18: "_NyurinTex",
    19: "_ChikubiTex",
};

/** Material.PropertType 颜色属性枚举（100 起） */
export const ColorPropNames: Record<number, string> = {
    100: "_Color",
    101: "_ShadowColor",
    102: "_RimColor",
    103: "_SpecColor",
    104: "_Emission",
    105: "_ReflectColor",
    106: "_OutlineColor",
    107: "_MyLightColor0",
    108: "_MyLightColor1",
    109: "_TintColor",
};

/** Material.PropertType 浮点属性枚举（200 起） */
export const FloatPropNames: Record<number, string> = {
    200: "_Shininess",
    201: "_FurLength",
    202: "_OutlineWidth",
    203: "_Cutoff",
    204: "_AnisoOffset",
    205: "_RimPower",
    206: "_RimShift",
    207: "_HiRate",
    208: "_HiPow",
    209: "_FloatValue1",
    210: "_FloatValue2",
    211: "_FloatValue3",
    212: "_SetManualRenderQueue",
    213: "_MuscleNormalMapFactor",
    214: "_MuscleHeightMapFactor",
    215: "_ShadowToonBlend",
    216: "_ShininessDecal",
    217: "_ShininessDecalPow",
};

/** 属性枚举值 → 名称，未知值返回 #数字 */
export function materialPropName(kind: "tex" | "col" | "vec" | "f", type: number): string {
    const table = kind === "tex" ? TexturePropNames : kind === "col" ? ColorPropNames : kind === "f" ? FloatPropNames : {};
    return (table as Record<number, string>)[type] ?? `#${type}`;
}

/** 生成某类属性的 Select 选项 */
export function materialPropOptions(kind: "tex" | "col" | "vec" | "f"): Array<{ label: string; value: number }> {
    const table = kind === "tex" ? TexturePropNames : kind === "col" ? ColorPropNames : kind === "f" ? FloatPropNames : {};
    return Object.entries(table).map(([value, label]) => ({label: `${label} (${value})`, value: Number(value)}));
}

/* ==========================================================================
 *  颜色变体（Colvari）与贴图预合成（PreMulTexDatas）相关枚举
 *  取值全部照 KCES2 1.36.0 反编译源码逐个核对，注释里标出出处
 * ========================================================================== */

/** InfinityColorTexMgr2.InfColData.COLOR_TYPE，用于 colorType / colorTypeSub / infColType */
export const ColorTypeNames: Record<number, string> = {
    0: "NONE",
    1: "INF_COLOR",
    2: "PART_COLOR",
    3: "GRADA_COLOR",
};

/** MaidInfinityColor.PARTS_COLOR，用于 partsColorType / infColorId，NONE 为 -1，末尾 MAX 是哨兵不列入选项 */
export const PartsColorTypeNames: Record<number, string> = {
    [-1]: "NONE",
    0: "HAIR",
    1: "EYE_BROW",
    2: "UNDER_HAIR",
    3: "ASS_HAIR",
    4: "SKIN",
    5: "HAIR_OUTLINE",
    6: "SKIN_OUTLINE",
    7: "EYE_WHITE",
    8: "HOKURO",
    9: "TATOO",
    10: "SOBAKASU",
    11: "MATSUGE_UP",
    12: "MATSUGE_LOW",
    13: "FUTAE",
    14: "PART_COLOR",
    15: "GRADA_COLOR",
    16: "MAKE",
    17: "MUGEN_COLOR",
    18: "HIGE",
    19: "SHIMI",
    20: "SHIWA",
    21: "BODY_HAIR",
};

/**
 * GameUtility.SystemMaterial，用于 f_eBlendMode 与 preTexCompoTypeStr
 * 这两个字段在 JSON 里是字符串，游戏用 Enum.Parse 还原（PreMulTexDatas.OnAfterDeserialize），
 * 写入枚举外的字符串会让游戏加载时抛异常，所以只提供枚举名。末尾 Max 是哨兵不列入。
 */
export const SystemMaterialNames: string[] = [
    "Alpha",
    "BlendSelf",
    "Multiply",
    "InfinityColor",
    "InfinityColorPart",
    "InfinityColorGrada",
    "TexTo8bitTex",
    "AddNormal",
    "AlphaDstAlpha",
    "Screen",
];

/** Menu.Colvari.ColvariData.UseType 位标志（[Flags] byte） */
export const ColvariUseTypeFlags: Array<{ label: string; bit: number }> = [
    {label: "ALPHA", bit: 1},
    {label: "COLOR", bit: 2},
];

/**
 * 数值枚举表 → Select 选项，标签形如 NAME (值)
 * 按数值升序排：对象字面量里 -1 这类负数键属于普通字符串键，Object.entries 会把它排在
 * 0 起的整数索引键之后，不排一下 NONE 会跑到列表末尾
 */
export function numberEnumOptions(table: Record<number, string>): Array<{ label: string; value: number }> {
    return Object.entries(table)
        .map(([value, label]) => ({label: `${label} (${value})`, value: Number(value)}))
        .sort((a, b) => a.value - b.value);
}

/** 字符串枚举名列表 → Select 选项 */
export function stringEnumOptions(names: string[]): Array<{ label: string; value: string }> {
    return names.map((name) => ({label: name, value: name}));
}
