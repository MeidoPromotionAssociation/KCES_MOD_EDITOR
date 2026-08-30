import type {FieldSpec} from "../common/SpecFields";
import PartsColorField, {newPartsColor} from "./PartsColorField";
import {
    ColorTypeNames,
    ColvariUseTypeFlags,
    numberEnumOptions,
    PartsColorTypeNames,
    stringEnumOptions,
    SystemMaterialNames,
} from "../../utils/kcesEnums";

/**
 * menuAdvancedSpecs .menuassets 高级字段的结构描述与新建模板
 *
 * 字段构成、枚举取值与默认值全部照 KCES2 1.36.0 反编译源码核对：
 *   Parts/Menu.cs                Menu.PreMulTexDatas / Menu.Colvari / Menu.Colvari.ColvariData
 *   TexLay.cs                    TexLay.MaskParam / MaskData / TransTexData / InfColorParam
 *   InfinityColorTexMgr2.cs      InfColData / PartColDef / GradaColDef / COLOR_TYPE
 *   MaidInfinityColor.cs         PartsColor / PARTS_COLOR
 *   Scourt/Utility/GameUtility.cs GameUtility.SystemMaterial
 *
 * 新建模板里可空的对象与数组一律给 null，而不是空对象/空数组：库按游戏字段可空性序列化，
 * 把 null 写成 {} 或 [] 会改变游戏侧的读取分支。
 */

const colorTypeOptions = () => numberEnumOptions(ColorTypeNames);
const partsColorOptions = () => numberEnumOptions(PartsColorTypeNames);
const systemMaterialOptions = () => stringEnumOptions(SystemMaterialNames);

/** PartsColor 走专用控件 */
const colorField = (name: string): FieldSpec => ({
    kind: "custom",
    name,
    render: (value, onChange) => <PartsColorField value={value} onChange={onChange}/>,
});

/* -------------------------------------------------------------------------
 *  Vector（库里以 {x,y}/{x,y,z,w} 对象形式出现）
 * ------------------------------------------------------------------------- */

const vector4Spec = (): FieldSpec[] => [
    {kind: "float", name: "x"},
    {kind: "float", name: "y"},
    {kind: "float", name: "z"},
    {kind: "float", name: "w"},
];

const newVector4 = () => ({x: 0, y: 0, z: 0, w: 0});

/* -------------------------------------------------------------------------
 *  TexLay.MaskData
 * ------------------------------------------------------------------------- */

const maskDataSpec = (): FieldSpec[] => [
    {kind: "str", name: "name", width: 240},
    {kind: "bool", name: "mask"},
];

const newMaskData = () => ({name: null, mask: false});

/* -------------------------------------------------------------------------
 *  InfinityColorTexMgr2.PartColDef
 *  patternScale 默认 Vector2.one
 * ------------------------------------------------------------------------- */

const partColDefSpec = (): FieldSpec[] => [
    {kind: "str", name: "part_name"},
    {kind: "vec", name: "patternScale", axes: ["x", "y"]},
    {kind: "float", name: "patternRot"},
    colorField("multi_col"),
];

const newPartColDef = () => ({
    part_name: null,
    multi_col: newPartsColor(),
    patternScale: {x: 1, y: 1},
    patternRot: 0,
});

/* -------------------------------------------------------------------------
 *  InfinityColorTexMgr2.GradaColDef
 * ------------------------------------------------------------------------- */

const gradaColDefSpec = (): FieldSpec[] => [
    {kind: "str", name: "notUse"},
    {kind: "int", name: "gradaNum"},
    {kind: "numList", name: "gradaRates"},
    {kind: "list", name: "gradaRateRanges", spec: vector4Spec, newItem: newVector4},
    colorField("multi_col"),
];

const newGradaColDef = () => ({
    notUse: null,
    gradaNum: 0,
    gradaRates: null,
    gradaRateRanges: null,
    multi_col: newPartsColor(),
});

/* -------------------------------------------------------------------------
 *  InfinityColorTexMgr2.InfColData
 *  partsColorType 默认 PARTS_COLOR.NONE = -1
 * ------------------------------------------------------------------------- */

const infColDataSpec = (): FieldSpec[] => [
    {kind: "enum", name: "infColType", options: colorTypeOptions()},
    {kind: "enum", name: "partsColorType", options: partsColorOptions()},
    {kind: "bool", name: "isIndependenceMultiColor"},
    {kind: "bool", name: "gradaIsMugen"},
    colorField("colData"),
    {kind: "list", name: "partColDefs", spec: partColDefSpec, newItem: newPartColDef},
    {kind: "obj", name: "gradaColDef", spec: gradaColDefSpec, newValue: newGradaColDef},
];

const newInfColData = () => ({
    isIndependenceMultiColor: false,
    infColType: 0,
    partsColorType: -1,
    colData: newPartsColor(),
    partColDefs: null,
    gradaColDef: null,
    gradaIsMugen: false,
});

/* -------------------------------------------------------------------------
 *  TexLay.InfColorParam
 *  infColorId 默认 PARTS_COLOR.NONE = -1；gradeCols 沿用游戏拼写
 * ------------------------------------------------------------------------- */

const infColorParamSpec = (): FieldSpec[] => [
    {kind: "str", name: "tag"},
    {kind: "enum", name: "infColType", options: colorTypeOptions()},
    {kind: "enum", name: "infColorId", options: partsColorOptions()},
    {kind: "bool", name: "isIndependenceMultiColor"},
    {kind: "bool", name: "idTexIsRGB"},
    {kind: "bool", name: "gradaIsMugen"},
    {kind: "strList", name: "idTexName"},
    colorField("pc"),
    {kind: "list", name: "partCols", spec: partColDefSpec, newItem: newPartColDef},
    {kind: "obj", name: "gradeCols", spec: gradaColDefSpec, newValue: newGradaColDef},
    {kind: "list", name: "gradaLines", spec: vector4Spec, newItem: newVector4},
];

const newInfColorParam = () => ({
    tag: null,
    infColType: 0,
    infColorId: -1,
    isIndependenceMultiColor: false,
    pc: newPartsColor(),
    idTexName: null,
    partCols: null,
    gradeCols: null,
    gradaLines: null,
    idTexIsRGB: false,
    gradaIsMugen: false,
});

/* -------------------------------------------------------------------------
 *  TexLay.MaskParam
 * ------------------------------------------------------------------------- */

const maskParamSpec = (): FieldSpec[] => [
    {kind: "str", name: "maskTexName"},
    {kind: "str", name: "linkMaskName"},
    {kind: "int", name: "linkMaskNo"},
    {kind: "str", name: "shareRtTargetPart"},
    {kind: "list", name: "maskData", spec: maskDataSpec, newItem: newMaskData},
    {kind: "list", name: "maskRanges", spec: vector4Spec, newItem: newVector4},
];

const newMaskParam = () => ({
    maskData: null,
    maskTexName: null,
    maskRanges: null,
    linkMaskName: null,
    linkMaskNo: 0,
    shareRtTargetPart: null,
});

/* -------------------------------------------------------------------------
 *  TexLay.TransTexData
 *  scale 默认 Vector2.one，areaUV 默认 (0,0,1,1)，defTrans 自引用同一结构
 * ------------------------------------------------------------------------- */

const transTexDataSpec = (): FieldSpec[] => [
    {kind: "vec", name: "pos", axes: ["x", "y"]},
    {kind: "vec", name: "scale", axes: ["x", "y"]},
    {kind: "float", name: "rotDeg"},
    {kind: "vec", name: "areaUV", axes: ["x", "y", "z", "w"]},
    {kind: "vec", name: "srcTexPixcel", axes: ["x", "y"], integer: true},
    {kind: "obj", name: "defTrans", spec: transTexDataSpec, newValue: () => newTransTexData()},
];

function newTransTexData(): any {
    return {
        pos: {x: 0, y: 0},
        scale: {x: 1, y: 1},
        rotDeg: 0,
        areaUV: {x: 0, y: 0, z: 1, w: 1},
        srcTexPixcel: {x: 0, y: 0},
        defTrans: null,
    };
}

/* -------------------------------------------------------------------------
 *  Menu.PreMulTexDatas（FixVersion 1001）
 *  f_nLayNoInGroup 默认 -1，f_fAlpha 默认 1，preTexCompoTypeStr 默认 "Alpha"
 * ------------------------------------------------------------------------- */

export const preMulTexDataSpec = (): FieldSpec[] => [
    {kind: "str", name: "slotId", width: 150},
    {kind: "str", name: "saveTag", width: 150},
    {kind: "str", name: "f_strFileName", width: 220},
    {kind: "str", name: "f_strPropName", width: 160},
    {kind: "strEnum", name: "f_eBlendMode", options: systemMaterialOptions()},
    {kind: "strEnum", name: "preTexCompoTypeStr", options: systemMaterialOptions()},
    {kind: "int", name: "f_nMatNo", width: 100},
    {kind: "int", name: "f_nLayerNo", width: 100},
    {kind: "bool", name: "f_bTexGroup"},
    {kind: "int", name: "f_nLayNoInGroup", width: 130},
    {kind: "float", name: "f_fAlpha", width: 100},
    {kind: "int", name: "f_nTargetBodyTexSize", width: 150},
    {kind: "str", name: "posDefHokuroTatooSlotId", width: 190},
    {kind: "int", name: "version", width: 100},
    {kind: "obj", name: "maskParam", spec: maskParamSpec, newValue: newMaskParam},
    {kind: "obj", name: "infColParam", spec: infColorParamSpec, newValue: newInfColorParam},
    {kind: "list", name: "preMaskData", spec: maskDataSpec, newItem: newMaskData},
    {kind: "list", name: "preTransTexData", spec: transTexDataSpec, newItem: newTransTexData},
    {kind: "obj", name: "preInfColData", spec: infColDataSpec, newValue: newInfColData},
];

export function newPreMulTexData(): any {
    return {
        version: 1001,
        slotId: null,
        saveTag: null,
        f_nMatNo: 0,
        f_strPropName: null,
        f_nLayerNo: 0,
        f_strFileName: null,
        f_eBlendMode: null,
        maskParam: null,
        infColParam: null,
        f_bTexGroup: false,
        f_nLayNoInGroup: -1,
        f_fAlpha: 1,
        f_nTargetBodyTexSize: 0,
        posDefHokuroTatooSlotId: null,
        preMaskData: null,
        preTransTexData: null,
        preInfColData: null,
        preTexCompoTypeStr: "Alpha",
    };
}

/* -------------------------------------------------------------------------
 *  Menu.Colvari.ColvariData（FixVersion 1000）
 * ------------------------------------------------------------------------- */

const colvariDataSpec = (): FieldSpec[] => [
    {kind: "str", name: "mpn", width: 180},
    {kind: "str", name: "layerName", width: 150},
    {kind: "str", name: "viewName", width: 150},
    {kind: "enum", name: "colorType", options: colorTypeOptions()},
    {kind: "enum", name: "colorTypeSub", options: colorTypeOptions()},
    {kind: "flags", name: "useType", flags: ColvariUseTypeFlags},
    {kind: "float", name: "alpha", width: 100},
    {kind: "str", name: "mamaFileName", width: 200},
    {kind: "str", name: "saveInfColDataLinkLayer", width: 200},
    {kind: "int", name: "version", width: 100},
    colorField("colData"),
    {kind: "list", name: "maskData", spec: maskDataSpec, newItem: newMaskData},
    {kind: "list", name: "partColDefs", spec: partColDefSpec, newItem: newPartColDef},
    {kind: "obj", name: "gradaColDef", spec: gradaColDefSpec, newValue: newGradaColDef},
];

export function newColvariData(): any {
    return {
        version: 1000,
        mpn: null,
        layerName: null,
        colorType: 0,
        maskData: null,
        alpha: 0,
        colData: newPartsColor(),
        partColDefs: null,
        gradaColDef: null,
        mamaFileName: null,
        colorTypeSub: 0,
        useType: 0,
        saveInfColDataLinkLayer: null,
        viewName: null,
    };
}

/* -------------------------------------------------------------------------
 *  Menu.Colvari（FixVersion 1000）
 * ------------------------------------------------------------------------- */

export const colvariSpec = (): FieldSpec[] => [
    {kind: "str", name: "iconFileName"},
    {kind: "str", name: "reqDefine"},
    {kind: "int", name: "version"},
    colorField("iconColor"),
    {kind: "list", name: "colvariDatas", spec: colvariDataSpec, newItem: newColvariData},
];

export function newColvari(): any {
    return {
        version: 1000,
        iconColor: newPartsColor(),
        iconFileName: null,
        reqDefine: null,
        colvariDatas: [],
    };
}

/* -------------------------------------------------------------------------
 *  Tuple<string, int> partsVer
 * ------------------------------------------------------------------------- */

export const partsVerSpec = (): FieldSpec[] => [
    {kind: "str", name: "item1"},
    {kind: "int", name: "item2"},
];

export function newPartsVer(): any {
    return {item1: null, item2: 0};
}
