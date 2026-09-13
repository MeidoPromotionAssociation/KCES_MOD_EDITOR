import {
    BoneMorphTypeNames,
    ChikubiStateNames,
    ChinkoStateNames,
    ColorTypeNames,
    MPNOptionsWithId,
    MenuDefineNames,
    MeshMorphTagNames,
    MoveHideModeNames,
    PartHideTypeNames,
    PartsColorTypeNames,
    SlotIDNames,
    SystemMaterialNames,
    TexturePropNames,
} from "./kcesEnums";

/**
 * KCES menu 命令的参数规格表（KCES2 1.36.0）
 *
 * 逐条对照 `KCES2 1.36.0/Assembly-CSharp/PartsMenuManager.cs` 的 `Exec`（233-1819 行）
 * 以及它调用到的 TBody / TBodySkin / MaterialMgr / Maid 方法写成。
 * 只描述「参数在第几位、叫什么、能填什么」，供 Monaco 自动补全与 snippet 使用；
 * 参数的语义说明放在 i18n 的 `MenuAssetsEditor.commands.<命令名>` 里。
 */

/** 单个参数的规格 */
export interface MenuArgSpec {
    /** 占位名，插入 snippet 时作为 tabstop 文本；统一用英文标识，不随语言变化 */
    placeholder: string;
    /** 该位置的候选值；补全时逐条列出 */
    values?: string[];
    /** 可省略的参数，不进入 snippet 骨架 */
    optional?: boolean;
    /** 从该位置起可重复出现任意多次，重复位置沿用同一候选表 */
    repeat?: boolean;
}

/** 一条命令的一种写法 */
export interface MenuCommandForm {
    /** 形式标签，用于在补全列表里区分同一命令的多种写法；主形式留空 */
    label?: string;
    args: MenuArgSpec[];
}

export interface MenuCommandSpec {
    /** 该命令的全部写法，第一个是主形式（决定 snippet 骨架） */
    forms: MenuCommandForm[];
}

/* -----------------------------
 *   候选值集合
 * ----------------------------- */

const slot = SlotIDNames;
const mpn = MPNOptionsWithId.map((item) => item.value);
const partsColor = Object.values(PartsColorTypeNames);
const colorType = Object.values(ColorTypeNames);
const blendMode = SystemMaterialNames;
const texProp = Object.values(TexturePropNames);

/** tex / テクスチャ変更 的 args[4]，PARTS_COLOR 名，GRADA_COLOR 可再接 `|MUGEN_COLOR` 副类型 */
const texPartsColor = [...partsColor, "GRADA_COLOR|MUGEN_COLOR"];

/** tex / テクスチャ変更 的 args[5]，决定 args[6] 按哪套颜色系统解析 */
const colorReference = ["mugen", "grada", "grada|mugen"];

/* -----------------------------
 *   规格表
 * ----------------------------- */

const a = (placeholder: string, values?: string[]): MenuArgSpec => ({placeholder, values});
const opt = (placeholder: string, values?: string[]): MenuArgSpec => ({placeholder, values, optional: true});
const rep = (placeholder: string, values?: string[]): MenuArgSpec => ({placeholder, values, repeat: true});
const optRep = (placeholder: string, values?: string[]): MenuArgSpec => ({
    placeholder,
    values,
    optional: true,
    repeat: true,
});

const form = (args: MenuArgSpec[], label?: string): MenuCommandForm => ({label, args});

/** 合成类命令共用：`del` 或 `hash <ulong>` */
const hashForms: MenuCommandForm[] = [
    form([a("hash-marker", ["hash"]), a("hash-value")], "hash"),
    form([a("del-marker", ["del"])], "del"),
];

/** テクスチャセット合成 / テクスチャ合成 / テクスチャ乗算 共用 */
const mulTexForms: MenuCommandForm[] = [
    form([
        a("slot", slot),
        a("material-selector"),
        a("property-name", texProp),
        a("layer-index"),
        a("texture-file"),
        a("blend-mode", blendMode),
        opt("parts-color", texPartsColor),
        opt("layer-index-in-group"),
        opt("alpha-param"),
        opt("save-layer-tag"),
        opt("trans-tex-data"),
    ]),
    form([
        a("del-marker", ["del"]),
        a("slot", slot),
        a("material-index"),
        a("property-name", texProp),
        a("layer-index"),
    ], "del"),
];

/** tex / テクスチャ変更 共用 */
const changeTexForm: MenuCommandForm[] = [
    form([
        a("slot", slot),
        a("material-selector"),
        a("property-name", texProp),
        a("texture-file"),
        opt("parts-color", texPartsColor),
        opt("color-reference", colorReference),
        opt("color-definition-name"),
        opt("save-layer-tag"),
    ]),
];

/** partcolor / partcolorrgb 共用 */
const partColorForm: MenuCommandForm[] = [
    form([
        a("slot", slot),
        a("material-index"),
        a("property-name", texProp),
        a("texture-file"),
        a("id-textures"),
        rep("color-name"),
    ]),
];

/** ifdef / elseifdef 共用 */
const ifdefForms: MenuCommandForm[] = [
    form([a("condition", ["mpn", "isplugin", "ismanhead", "ismanbody"]), a("relation", ["==", "in"]), a("operand")]),
    form([a("define-flag", MenuDefineNames)], "define"),
];

/** node消去 / node表示 共用 */
const nodeForm: MenuCommandForm[] = [
    form([a("node-name"), optRep("slot-override", slot.map((s) => `slot=${s}`))]),
];

/** パーツnode消去 / パーツnode表示 共用 */
const partsNodeForm: MenuCommandForm[] = [
    form([a("parts-slot", slot), a("node-name"), optRep("slot-override", slot.map((s) => `slot=${s}`))]),
];

/** 命令名 → 参数规格 */
export const MenuCommandSpecs: Record<string, MenuCommandSpec> = {
    additem: {
        forms: [
            form([
                a("model-file"),
                opt("slot", [...slot, "body", "handitemr", "handiteml"]),
                opt("attach-kind", ["ボーンにアタッチ", "アタッチ"]),
                opt("bone-or-attach-slot"),
                opt("attach-point"),
                optRep("split-option"),
            ]),
        ],
    },
    anime: {forms: [form([a("slot", slot), a("anime-file"), opt("loop", ["loop"])])]},
    animematerial: {forms: [form([a("slot", slot), a("material-index")])]},
    blendset: {forms: [form([a("blendset-name"), rep("morph-name"), rep("value")])]},
    bonemorph: {
        forms: [
            form([
                a("type", BoneMorphTypeNames),
                a("property-name"),
                a("bone-name"),
                a("min-x"), a("min-y"), a("min-z"),
                a("max-x"), a("max-y"), a("max-z"),
            ], "9 args"),
            form([
                a("property-name"),
                a("bone-name"),
                a("min-x"), a("min-y"), a("min-z"),
                a("max-x"), a("max-y"), a("max-z"),
            ], "8 args (pos)"),
        ],
    },
    color: {
        forms: [form([
            a("slot", slot),
            a("material-index"),
            a("property-name"),
            a("r"), a("g"), a("b"), a("a"),
        ])],
    },
    commenttype: {forms: [form([optRep("comment")])]},
    delitem: {forms: [form([opt("slot", slot)])]},
    endcommand: {forms: [form([])]},
    ifcommand: {
        forms: [form([
            a("test-expression", mpn.map((m) => `maidprop[${m}]`)),
            a("equal", ["=="]),
            a("nothing", ["nothing"]),
            a("question", ["?"]),
            a("target-expression", mpn.map((m) => `setprop[${m}]`)),
            a("assign", ["="]),
            a("value-expression", mpn.map((m) => `getprop[${m}]`)),
        ])],
    },
    length: {
        forms: [form([
            a("slot", slot),
            a("group-name"),
            a("bone-search-type", ["fbrother", "fchild", "all"]),
            a("bone-name"),
            a("scale-min-x"), a("scale-min-y"), a("scale-min-z"),
            a("scale-max-x"), a("scale-max-y"), a("scale-max-z"),
        ])],
    },
    mancolor: {
        forms: [form([
            a("ignored-slot"), a("ignored-material"), a("ignored-property"),
            a("r"), a("g"), a("b"),
        ])],
    },
    maskitem: {forms: [form([a("mask-slot", slot)])]},
    "node消去": {forms: nodeForm},
    "node表示": {forms: nodeForm},
    nofloory: {forms: [form([a("ignored"), a("slot", slot)])]},
    param2: {forms: [form([a("slot", slot), a("parameter-name"), a("value")])]},
    paramset: {forms: [form([a("paramset-name"), rep("value"), rep("entry-name")])]},
    prop: {forms: [form([a("mpn", mpn), a("value")])]},
    saveitem: {forms: [form([optRep("ignored")])]},
    set: {forms: [form([optRep("ignored")])]},
    setname: {forms: [form([optRep("ignored")])]},
    setslotitem: {forms: [form([a("mpn", mpn), a("resource-id")])]},
    shader: {forms: [form([a("slot", slot), a("material-index"), a("shader-name")])]},
    tex: {forms: changeTexForm},
    useredit: {
        forms: [form([
            a("save-tag"),
            a("edit-type", ["Material"]),
            a("slot", slot),
            a("material-index"),
            a("property-name"),
            a("property-type", ["DEFINE", "TEX_OFFSET", "TEX_SCALE", "Color"]),
            a("value"),
        ])],
    },
    ver: {
        forms: [
            form([a("version")]),
            form([a("ignored-slot", slot), a("version")], "2 args"),
        ],
    },
    "アイテム": {forms: [form([a("menu-file"), optRep("option")])]},
    "アイテムパラメータ": {forms: [form([a("slot", slot), a("parameter-name"), a("value")])]},
    "アイテム条件": {
        forms: [
            form([
                a("slot", slot),
                a("presence-keyword", ["に何か"]),
                a("presence", ["有る", "無い"]),
                a("then", ["なら"]),
                a("menu-file"),
            ], "に何か"),
            form([
                a("slot", slot),
                a("compare", ["が"]),
                a("model-file"),
                a("then", ["なら"]),
                a("menu-file"),
            ], "が"),
            form([
                a("slot", slot),
                a("parameter-keyword", ["のアイテムパラメータの"]),
                a("parameter-name"),
                a("compare", ["が"]),
                a("value"),
                a("then", ["なら"]),
                a("menu-file"),
            ], "のアイテムパラメータの"),
        ],
    },
    "アタッチポイントの設定": {
        forms: [form([
            a("attach-point-name"),
            a("pos-x"), a("pos-y"), a("pos-z"),
            a("rot-x"), a("rot-y"), a("rot-z"),
        ])],
    },
    "テクスチャセット合成": {forms: mulTexForms},
    "テクスチャ合成": {forms: mulTexForms},
    "テクスチャ乗算": {forms: mulTexForms},
    "テクスチャ変更": {forms: changeTexForm},
    "パーツnode消去": {forms: partsNodeForm},
    "パーツnode表示": {forms: partsNodeForm},
    "マテリアル変更": {forms: [form([a("slot", slot), a("material-index"), a("mate-file")])]},
    "リソース参照": {forms: [form([a("reference-key"), a("menu-file")])]},
    "半脱ぎ": {forms: [form([a("menu-file")])]},
    delitemnewattach: {forms: [form([])]},
    partcolor: {forms: partColorForm},
    partcolordef: {forms: [form([a("slot", slot), rep("color-name"), rep("hsl")])]},
    pattern: {forms: [form([a("texture-or-del", ["del"]), opt("parts-color", partsColor)])]},
    material: {
        forms: [form([
            a("slot", slot),
            a("material-index"),
            a("property-name"),
            a("property-type", ["DEFINE", "TEX_OFFSET", "TEX_SCALE", "Color"]),
            a("value"),
        ])],
    },
    "uv定義": {forms: [form([a("slot", slot), a("tag"), a("uv")])]},
    "ほくろ合成": {forms: hashForms},
    "タトゥ合成": {forms: hashForms},
    "ネイル合成": {forms: hashForms},
    gradacolordef: {
        forms: [form([
            a("slot", slot),
            a("definition-name"),
            a("rate-texture-or-lines"),
            a("grada-rates"),
            a("grada-ranges"),
            a("grada-colors"),
        ])],
    },
    "メイク合成": {
        forms: [
            form([
                a("slot", slot),
                a("material-index"),
                a("property-name", texProp),
                a("layer-index"),
                a("texture-file"),
                a("blend-mode", blendMode),
                a("color-type", colorType),
                a("uv"),
                opt("hsl"),
            ]),
            form([
                a("del-marker", ["del"]),
                a("slot", slot),
                a("material-index"),
                a("property-name", texProp),
                a("layer-index"),
            ], "del"),
        ],
    },
    ifdef: {forms: ifdefForms},
    elseifdef: {forms: ifdefForms},
    endifdef: {forms: [form([])]},
    mugencolordef: {forms: [form([a("slot", slot), a("layer-name"), a("hsl")])]},
    partcolorrgb: {forms: partColorForm},
    meshmorph: {forms: [form([a("tag", MeshMorphTagNames), a("morph-name"), a("default-value", ["def=100"])])]},
    "マテリアル参照": {
        forms: [form([
            a("dest-slot", slot),
            a("dest-material-index"),
            a("source-slot", slot),
            a("source-material-index"),
        ])],
    },
    addbonemorph: {
        forms: [form([
            a("slot", ["wear"]),
            a("morph-name", ["裾"]),
            rep("bone-name"),
            rep("transform"),
        ])],
    },
    "乳首": {forms: [form([a("state", ChikubiStateNames)])]},
    adjcutoff: {
        forms: [form([a("material-index"), a("property-name", ["_Cutoff"]), rep("threshold")])],
    },
    parthidemove: {
        forms: [form([
            a("part-name"),
            a("mode", [...MoveHideModeNames, "MOVE&HIDE"]),
            a("hide-type", PartHideTypeNames),
            a("slot", slot),
            optRep("option", ["hide=true", "hide=false", "center="]),
        ])],
    },
    "房tex": {
        forms: [form([
            a("slot", slot),
            a("index-and-label"),
            a("mask-texture"),
            a("mask-range"),
            rep("label-and-texture"),
        ])],
    },
    munekagergb: {
        forms: [form([
            a("slot", slot),
            a("material-index"),
            a("property-name", texProp),
            a("shadow-texture"),
            a("blend-mode", blendMode),
            a("id-textures"),
        ])],
    },
    "mask消去": {forms: [form([a("slot", slot), a("mask-texture")])]},
    munekage: {
        forms: [form([
            a("slot", slot),
            a("material-index"),
            a("property-name", texProp),
            a("shadow-texture"),
            a("blend-mode", blendMode),
        ])],
    },
    "そばかす合成": {forms: hashForms},
    "ちんこ": {forms: [form([a("state", ChinkoStateNames)])]},
    "ひげ合成": {forms: hashForms},
    "しみ合成": {forms: hashForms},
    "しわ合成": {forms: hashForms},
    "体毛合成": {forms: hashForms},
    "cutout消去": {forms: [form([a("slot", slot), a("cutout-texture")])]},
    "タッチ範囲tex": {forms: [form([a("slot", slot), a("material-index"), a("texture-file")])]},
};

/** 展开重复参数后，取第 index 位的规格；越界时回落到最后一个 repeat 参数 */
export function argSpecAt(form: MenuCommandForm, index: number): MenuArgSpec | null {
    if (index < form.args.length) {
        return form.args[index];
    }
    // 末尾若是可重复参数，按 repeat 段长度循环取用（如 partcolordef 的 name/hsl 交替）
    const tail: MenuArgSpec[] = [];
    for (let i = form.args.length - 1; i >= 0; i--) {
        if (!form.args[i].repeat) break;
        tail.unshift(form.args[i]);
    }
    if (tail.length === 0) return null;
    const offset = index - (form.args.length - tail.length);
    return tail[offset % tail.length];
}

/** 汇总某命令第 index 位在所有写法下的候选值（去重，保持出现顺序） */
export function argValuesAt(commandName: string, index: number): string[] {
    const spec = MenuCommandSpecs[commandName];
    if (!spec) return [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const f of spec.forms) {
        for (const value of argSpecAt(f, index)?.values ?? []) {
            if (!seen.has(value)) {
                seen.add(value);
                result.push(value);
            }
        }
    }
    return result;
}

/** 某命令第 index 位的占位名（取主形式；主形式没有则退到后续写法） */
export function argPlaceholderAt(commandName: string, index: number): string | null {
    const spec = MenuCommandSpecs[commandName];
    if (!spec) return null;
    for (const f of spec.forms) {
        const found = argSpecAt(f, index);
        if (found) return found.placeholder;
    }
    return null;
}

/** 主形式的必填参数占位名，用于生成 snippet 骨架 */
export function requiredPlaceholders(commandName: string): string[] {
    const spec = MenuCommandSpecs[commandName];
    if (!spec || spec.forms.length === 0) return [];
    return spec.forms[0].args.filter((arg) => !arg.optional).map((arg) => arg.placeholder);
}
