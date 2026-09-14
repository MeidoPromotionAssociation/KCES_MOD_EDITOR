/**
 * KCES 枚举映射表，来源：game/KCES2 1.36.0/Assembly-CSharp/Parts/Menu.cs 与 Material.cs
 * Menu.Command.Type 与 Material.PropertType 都是按声明顺序的数字枚举
 */

// Menu.Command.Type 枚举名（下标即枚举值），逐名核对 KCES2 1.36.0 Menu.cs:513-587
// 反编译源码把标识符里的长音符 ー 写成 C# 转义 ー，这里用真实字符，
// 所以 28 号是「アイテムパラメータ」（メータ，末尾无长音），35/36 号是「パーツ」，38 号是「リソース」
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
    "タッチ範囲tex",         // 73
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

/**
 * Material.PropertType 纹理属性枚举（0 起）
 * 0-19 是 KCES 1.34.5 就有的，20-26 是 KCES2 1.36.0 新增
 */
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
    20: "_LightMap",
    21: "_EnvMap",
    22: "_HeightMap",
    23: "_GradationMap",
    24: "_GradationOffsetMap",
    25: "_HighlightStretchMap",
    26: "_RimMaskMap",
};

/** Material.PropertType 颜色属性枚举（100 起），110 是 KCES2 1.36.0 新增 */
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
    110: "_2ndHighlightColor",
};

/** Material.PropertType 浮点属性枚举（200 起），218-240 是 KCES2 1.36.0 新增 */
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
    218: "_EnvAlpha",
    219: "_EnvAdd",
    220: "_NormalMapFactor",
    221: "_HeightMapFactor",
    222: "_NyurinAlpha",
    223: "_ChikubiAlpha",
    224: "_Cull",
    225: "_SrcBlend",
    226: "_DstBlend",
    227: "_ZWrite",
    228: "_HighlightPosition",
    229: "_HighlightRange",
    230: "_HighlightOffsetMapRate",
    231: "_HighlightStretchMapRate",
    232: "_HighlightCameraAngleRate",
    233: "_HighlightRate",
    234: "_2ndHighlightRange",
    235: "_2ndHighlightRate",
    236: "_StencilRef",
    237: "_StencilComp",
    238: "_StencilPass",
    239: "_StencilFail",
    240: "_StencilZFail",
};

/**
 * Material.PropertType 关键字枚举（300 起，KCES2 1.36.0 新增）
 *
 * 游戏按 `keywordProp.type.ToString()` 直接取关键字名（PartsMaterialManager 里 EnableKeyword / DisableKeyword），
 * 所以名字必须与枚举拼写完全一致——304 的 USE_NYURIN 在源码里就没有前导下划线，不要「修正」成 _USE_NYURIN。
 */
export const KeywordPropNames: Record<number, string> = {
    300: "_USE_LIGHT_MAP_TEX",
    301: "_USE_REFLECTION_MAP",
    302: "_USE_TOON_RAMP_TEX",
    303: "_USE_NORMAL_MAP",
    304: "USE_NYURIN",
    305: "_ALPHATEST_ON",
    306: "_RECEIVE_SHADOWS_OFF",
    307: "_USE_HAIR_HIGHLIGHT",
    308: "_ALPHAPREMULTIPLY_ON",
};

/** 材质属性种类：纹理 / 颜色 / 向量 / 浮点 / 关键字 */
export type MaterialPropKind = "tex" | "col" | "vec" | "f" | "kw";

/** 某类属性用的枚举表；向量属性游戏侧没有专属取值，表为空，靠自由输入填数字 */
export function materialPropTable(kind: MaterialPropKind): Record<number, string> {
    switch (kind) {
        case "tex":
            return TexturePropNames;
        case "col":
            return ColorPropNames;
        case "f":
            return FloatPropNames;
        case "kw":
            return KeywordPropNames;
        default:
            return {};
    }
}

/** 属性枚举值 → 名称，未知值返回 #数字 */
export function materialPropName(kind: MaterialPropKind, type: number): string {
    return materialPropTable(kind)[type] ?? `#${type}`;
}

/** 属性名 → 枚举值；游戏侧是 Enum.TryParse(name, ignoreCase: true)，这里同样忽略大小写，认不出返回 null */
export function materialPropValue(kind: MaterialPropKind, name: string): number | null {
    const wanted = name.trim().toLowerCase();
    for (const [value, candidate] of Object.entries(materialPropTable(kind))) {
        if (candidate.toLowerCase() === wanted) {
            return Number(value);
        }
    }
    return null;
}

/** 生成某类属性的 AutoComplete 选项（值与名字都显示，方便直接照抄数字） */
export function materialPropOptions(kind: MaterialPropKind): Array<{ label: string; value: string }> {
    return Object.entries(materialPropTable(kind)).map(([value, label]) => ({
        label: `${label} (${value})`,
        value: label,
    }));
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

/* ==========================================================================
 *  menu 命令参数用到的枚举（KCES2 1.36.0）
 * ========================================================================== */

/**
 * TBody.SlotID（TBody.cs:4207-4353），下标即枚举值。
 * 哨兵 none(-1) 与 end 不列入，它们不是可写入 menu 的槽位名。
 *
 * 注意大小写：走 TBody.hashSlotName 查表的命令（maskitem / node消去 / node表示 /
 * パーツnode消去 / パーツnode表示 / param2 / useredit / material / マテリアル参照 /
 * length 等）只接受「原样拼写 / 全小写 / 全大写」三种形式（TBody.cs:211-213 建表时
 * 只登记这三种键）；走 Parse.TryParse<SlotID> 的命令则大小写不敏感。
 * 照抄本表的原样拼写总是安全的。
 */
export const SlotIDNames: string[] = [
    "body", "head", "eye", "hairF", "hairR", "hairS",
    "hairS_2", "hairT", "hairT_2", "wear", "skirt", "onepiece",
    "mizugi", "mizugi_top", "mizugi_buttom", "panz", "slip", "bra",
    "stkg", "shoes", "headset", "glove", "jacket", "vest",
    "shirt", "accHead", "accHead_2", "hairAho", "accHana", "accHa",
    "accKami_1_", "accMiMiR", "accKamiSubR", "accNipR", "HandItemR", "accKubi",
    "accKubiwa", "accHeso", "accUde", "accUde_2", "accAshi", "accAshi_2",
    "accSenaka", "accShippo", "accKoshi", "accAnl", "accVag", "kubiwa",
    "megane", "accXXX", "chinko", "chikubi", "accFace", "accHat",
    "accHat_2", "kousoku_upper", "kousoku_lower", "seieki_naka", "seieki_hara", "seieki_face",
    "seieki_mune", "seieki_hip", "seieki_ude", "seieki_ashi", "accNipL", "accMiMiL",
    "accKamiSubL", "accKami_2_", "accKami_3_", "HandItemL", "underhair", "asshair",
    "moza",
    ...Array.from({length: 72}, (_, i) => `accAcc${i + 1}`),
];

/** MaterialMgr.ALPHA_TYPE（MaterialMgr.cs:2095），用于 tex / partcolor 系列的 `名称:类型=百分比` 后缀 */
export const AlphaTypeNames: string[] = ["ALPHA_NONE", "ALPHA_TEX", "ALPHA_MAT"];

/** TBodySkin.CHIKUBI_STATE（TBodySkin.cs:1528），用于 乳首 命令 */
export const ChikubiStateNames: string[] = ["None", "固定凸", "基本凹"];

/** TBodySkin.CHINKO_STATE（TBodySkin.cs:1535），用于 ちんこ 命令 */
export const ChinkoStateNames: string[] = ["None", "しまう"];

/** TBody.MOVE_HIDE_MODE（TBody.cs:4365）[Flags]，parthidemove 用 `&` 连接，走 Enum.Parse 区分大小写 */
export const MoveHideModeNames: string[] = ["NONE", "MOVE", "HIDE"];

/** TBody.PART_HIDE_TYPE（TBody.cs:4372），用于 parthidemove */
export const PartHideTypeNames: string[] = ["TYPE_SLOT_VISIBLE", "TYPE_BONE_WEIGHT"];

/** TMorphSkin.BaseBlendValue.Tag，meshmorph 的第一参数；MAX 是哨兵不列入 */
export const MeshMorphTagNames: string[] = ["パンツ", "靴下"];

/** Menu.DEFINE（Menu.cs:595）[Flags] ulong，defineTagNames 为各标签按位或，也用于 ifdef / elseifdef 的 DEFINE 条件 */
export const MenuDefineNames: string[] = ["NONE", "COLOR_MAMA", "COLOR_MUGEN", "COLOR_BUBUN", "COLOR_GRADA"];

/** Menu.DEFINE 各标签的位值（NONE = 0） */
export const MenuDefineNameBits: Record<string, number> = {
    NONE: 0,
    COLOR_MAMA: 1,
    COLOR_MUGEN: 2,
    COLOR_BUBUN: 4,
    COLOR_GRADA: 8,
};

/** Menu.Attribute（Menu.cs:612）[Flags] ulong，attribute 的位标签 */
export const MenuAttributeNames: string[] = ["None", "WomanReccomend", "ManReccomend", "ManSuits", "NoExpressionFace", "NoMoveTatooHokuro"];

/** Menu.Attribute 各标签的位值（None = 0） */
export const MenuAttributeBits: Record<string, number> = {
    None: 0,
    WomanReccomend: 1,
    ManReccomend: 2,
    ManSuits: 4,
    NoExpressionFace: 8,
    NoMoveTatooHokuro: 16,
};

/** Menu.TargetBodyType（Menu.cs:605）非 Flags 的普通枚举，游戏侧全用 == 比较，单选 */
export const MenuTargetBodyTypeNames: string[] = ["None", "Woman", "Man"];

/** Menu.HaraYureLimitType（Menu.cs:623）非 Flags 普通枚举，isHarayureAvailable 的取值，游戏侧用 == 比较 */
export const MenuHaraYureLimitTypeNames: string[] = ["None", "YureAvailable", "YureDisable"];

/** bonemorph 的 9 参数形式的类型标记（PartsMenuManager.cs:1310-1360，比较前会 ToLower） */
export const BoneMorphTypeNames: string[] = ["pos", "rot", "scl"];


export enum MPN {
    null_mpn = 0,
    Hara,
    KubiScl,
    UdeScl,
    DouPer,
    sintyou,
    kata,
    MuneL,
    MuneS,
    MuneM,
    MuneUpDown,
    MuneYori,
    MuneYawaraka,
    MunePosX,
    MunePosY,
    MuneThick,
    MuneLong,
    MuneDir,
    DouThick1X,
    DouThick1Y,
    DouThick2X,
    DouThick2Y,
    DouThick3X,
    DouThick3Y,
    ShoulderThick,
    UpperArmThickX,
    UpperArmThickY,
    LowerArmThickX,
    LowerArmThickY,
    ElbowThickX,
    ElbowThickY,
    NeckThickX,
    NeckThickY,
    HandSize,
    DouThick4X,
    DouThick4Y,
    DouThick5X,
    DouThick5Y,
    WaistPos,
    HipSize,
    HipRot,
    ThighThickX,
    ThighThickY,
    KneeThickX,
    KneeThickY,
    CalfThickX,
    CalfThickY,
    AnkleThickX,
    AnkleThickY,
    FootSize,
    UpperArmLowerThickX,
    UpperArmLowerThickY,
    WristThickX,
    WristThickY,
    ClavicleThick,
    ShoulderTension,
    ThighLowerThickX,
    ThighLowerThickY,
    ThighShin,
    HaraN,
    ChikubiH,
    ChikubiK1,
    ChikubiK2,
    ChikubiK2_MuneS,
    ChikubiR,
    ChikubiW,
    Nyurin1,
    Nyurin2,
    Nyurin3,
    Nyurin4,
    Nyurin5,
    Nyurin6,
    Nyurin7,
    Nyurin8,
    ChikubiWearTotsu,
    NyurinScale,
    FatUpper,
    FatUnder,
    MuscleSkin,
    HipYawaraka,
    HaraYawaraka,
    MuneSpringPower,
    MuneSpringMove,
    HaraSpringPower,
    HaraSpringMove,
    HipSpringPower,
    HipSpringMove,
    HeadX,
    HeadY,
    FaceShape,
    FaceShapeSlim,
    EyeSclX,
    EyeSclY,
    EyePosX,
    EyePosY,
    EyePosX_2,
    EyePosY_2,
    EyeClose,
    EyeBallPosY,
    EyeBallSclX,
    EyeBallSclY,
    EarNone,
    EarElf,
    EarRot,
    EarScl,
    NosePos,
    NoseScl,
    MayuShapeIn,
    MayuShapeOut,
    MayuX,
    MayuY,
    MayuY_2,
    MayuRot,
    MayuThick,
    MayuLong,
    Yorime,
    MabutaUpIn,
    MabutaUpIn2,
    MabutaUpMiddle,
    MabutaUpOut,
    MabutaUpOut2,
    MabutaLowIn,
    MabutaLowMiddle,
    MabutaLowOut,
    Eyedel,
    Itome,
    Ha1,
    Ha2,
    Ha3,
    Ha4,
    Ha5,
    Ha6,
    FutaePosX,
    FutaePosY,
    FutaeRot,
    HitomiHiPosX,
    HitomiHiPosY,
    HitomiHiSclY,
    HitomiShapeUp,
    HitomiShapeLow,
    HitomiShapeIn,
    HitomiShapeOutUp,
    HitomiShapeOutLow,
    HitomiRot,
    HohoShape,
    LipThick,
    WearSuso,
    WearMuneShadowRate,
    KuikomiPants,
    KuikomiStkg,
    CheekRate,
    FaceglossRate,
    MayuRate,
    EyeShadowRate,
    EyeHiRateL,
    EyeHiRateR,
    LipRate,
    LipTsuyaRate,
    NailTsuyaRate,
    SkinHiyakeRate,
    ArmpitHairRate,
    UnderHairRate,
    AssHairRate,
    StkgRate,
    LipShadowRate,
    Hanasuji,
    Washibana,
    EyeDel_shadowRate,
    Nose_RimlightMask,
    Ago_Back_Foward,
    Ago_Long_Short,
    Ago_Sharp,
    AgoHaba_Large_Small,
    AgoNiku_Fat_Slim,
    AgoSentan_Back_Foward,
    AgoSentan_Long_Short,
    AgoSentan_Sharp,
    AgoSentanHaba_Large_Small,
    AgoSide_Back_Foward,
    Cheekbone_Sharp,
    Cheekbone_Slim_Fat,
    Era_Sharp,
    EyePosZ,
    Face_Slim,
    Face_UnderBack_Foward,
    Face_UnderLarge_Small,
    Ho_UnderBack_Foward,
    Ho_UpperBack_Foward,
    Ho_Sharp,
    Ho_Down_Up,
    Ho_Hukurami,
    Hanasuji_Back_Foward,
    NoseSentan_Marumi,
    NoseSentan_Sharp,
    Nose_Shape,
    body,
    moza,
    head,
    hairf,
    hairr,
    hairt,
    hairs,
    hairaho,
    haircolor,
    skin,
    skin_nikukan,
    skin_hiyake,
    acctatoo,
    accnail,
    underhair,
    asshair,
    armpithair,
    hokuro,
    mayu,
    lip,
    lip_tsuya,
    chikubi,
    nyurin,
    eye,
    eye_r,
    eye_hi,
    eye_hi_r,
    eyewhite,
    eyewhite_r,
    nose,
    facegloss,
    matsuge_up,
    matsuge_low,
    futae,
    hoho_some,
    eye_shadow,
    cheek,
    EyeDel_shadow,
    nail_hi,
    kuchi_naka,
    sobakasu,
    hige,
    shiwa,
    shimiibo,
    bodyhair,
    wear,
    skirt,
    mizugi,
    mizugi_top,
    mizugi_buttom,
    bra,
    panz,
    slip,
    stkg,
    shoes,
    headset,
    glove,
    acchead,
    accha,
    acchana,
    accface,
    acckamisub,
    acckami,
    accmimi,
    accnip,
    acckubi,
    acckubiwa,
    accheso,
    accude,
    accashi,
    accsenaka,
    accshippo,
    acckoshi,
    accanl,
    accvag,
    megane,
    accxxx,
    handitem,
    acchat,
    onepiece,
    outerwear,
    jacket,
    vest,
    shirt,
    accAcc1,
    accAcc2,
    accAcc3,
    accAcc4,
    accAcc5,
    accAcc6,
    accAcc7,
    accAcc8,
    accAcc9,
    accAcc10,
    accAcc11,
    accAcc12,
    accAcc13,
    accAcc14,
    accAcc15,
    accAcc16,
    accAcc17,
    accAcc18,
    accAcc19,
    accAcc20,
    accAcc21,
    accAcc22,
    accAcc23,
    accAcc24,
    set_maidwear,
    set_mywear,
    set_underwear,
    set_body,
    set_face,
    folder_eye,
    folder_mayu,
    folder_underhair,
    folder_asshair,
    folder_skin,
    folder_eyewhite,
    folder_chikubi,
    folder_nyurin,
    folder_matsuge_up,
    folder_matsuge_low,
    folder_futae,
    folder_lip,
    folder_cheek,
    folder_eye_shadow,
    NyurinSelect,
    kousoku_upper,
    kousoku_lower,
    seieki_naka,
    seieki_hara,
    seieki_face,
    seieki_mune,
    seieki_hip,
    seieki_ude,
    seieki_ashi
}


export const MPNOptionsWithId = Object.entries(MPN)
    .filter(([key]) => isNaN(Number(key))) // 过滤掉反向映射的数字键
    .map(([name, val]) => ({
        value: name,
        label: `${name} (${val})`,
    }));