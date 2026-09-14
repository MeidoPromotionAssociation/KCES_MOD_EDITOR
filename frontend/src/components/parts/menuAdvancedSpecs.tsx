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
 *
 * 每项的 label 是显示名的 i18n key，按 MenuAdvanced.<结构>.<字段名> 组织，四种语言都要有；
 * 名字本身是库里的 JSON 键（数据路径），不能翻译。共用结构（maskData / vector4 等）只写一份。
 * 向量分量 x/y/z/w 不做 label——它们是数学记法，没有可译的东西。
 */

const colorTypeOptions = () => numberEnumOptions(ColorTypeNames);
const partsColorOptions = () => numberEnumOptions(PartsColorTypeNames);
const systemMaterialOptions = () => stringEnumOptions(SystemMaterialNames);

/** PartsColor 走专用控件，label 必填，避免漏翻 */
const colorField = (name: string, label: string): FieldSpec => ({
    kind: "custom",
    name,
    label,
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
    {kind: "str", name: "name", label: "MenuAdvanced.maskData.name", width: 240},
    {kind: "bool", name: "mask", label: "MenuAdvanced.maskData.mask"},
];

const newMaskData = () => ({name: null, mask: false});

/* -------------------------------------------------------------------------
 *  InfinityColorTexMgr2.PartColDef
 *  patternScale 默认 Vector2.one
 * ------------------------------------------------------------------------- */

const partColDefSpec = (): FieldSpec[] => [
    {kind: "str", name: "part_name", label: "MenuAdvanced.partColDef.part_name"},
    {kind: "vec", name: "patternScale", label: "MenuAdvanced.partColDef.patternScale", axes: ["x", "y"]},
    {kind: "float", name: "patternRot", label: "MenuAdvanced.partColDef.patternRot"},
    colorField("multi_col", "MenuAdvanced.partColDef.multi_col"),
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
    {kind: "str", name: "notUse", label: "MenuAdvanced.gradaColDef.notUse"},
    {kind: "int", name: "gradaNum", label: "MenuAdvanced.gradaColDef.gradaNum"},
    {kind: "numList", name: "gradaRates", label: "MenuAdvanced.gradaColDef.gradaRates"},
    {
        kind: "list",
        name: "gradaRateRanges",
        label: "MenuAdvanced.gradaColDef.gradaRateRanges",
        spec: vector4Spec,
        newItem: newVector4,
    },
    colorField("multi_col", "MenuAdvanced.gradaColDef.multi_col"),
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
    {kind: "enum", name: "infColType", label: "MenuAdvanced.infColData.infColType", options: colorTypeOptions()},
    {
        kind: "enum",
        name: "partsColorType",
        label: "MenuAdvanced.infColData.partsColorType",
        options: partsColorOptions(),
    },
    {
        kind: "bool",
        name: "isIndependenceMultiColor",
        label: "MenuAdvanced.infColData.isIndependenceMultiColor",
    },
    {kind: "bool", name: "gradaIsMugen", label: "MenuAdvanced.infColData.gradaIsMugen"},
    colorField("colData", "MenuAdvanced.infColData.colData"),
    {
        kind: "list",
        name: "partColDefs",
        label: "MenuAdvanced.infColData.partColDefs",
        spec: partColDefSpec,
        newItem: newPartColDef,
    },
    {
        kind: "obj",
        name: "gradaColDef",
        label: "MenuAdvanced.infColData.gradaColDef",
        spec: gradaColDefSpec,
        newValue: newGradaColDef,
    },
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
    {kind: "str", name: "tag", label: "MenuAdvanced.infColorParam.tag"},
    {kind: "enum", name: "infColType", label: "MenuAdvanced.infColorParam.infColType", options: colorTypeOptions()},
    {kind: "enum", name: "infColorId", label: "MenuAdvanced.infColorParam.infColorId", options: partsColorOptions()},
    {
        kind: "bool",
        name: "isIndependenceMultiColor",
        label: "MenuAdvanced.infColorParam.isIndependenceMultiColor",
    },
    {kind: "bool", name: "idTexIsRGB", label: "MenuAdvanced.infColorParam.idTexIsRGB"},
    {kind: "bool", name: "gradaIsMugen", label: "MenuAdvanced.infColorParam.gradaIsMugen"},
    {kind: "strList", name: "idTexName", label: "MenuAdvanced.infColorParam.idTexName"},
    colorField("pc", "MenuAdvanced.infColorParam.pc"),
    {
        kind: "list",
        name: "partCols",
        label: "MenuAdvanced.infColorParam.partCols",
        spec: partColDefSpec,
        newItem: newPartColDef,
    },
    {
        kind: "obj",
        name: "gradeCols",
        label: "MenuAdvanced.infColorParam.gradeCols",
        spec: gradaColDefSpec,
        newValue: newGradaColDef,
    },
    {
        kind: "list",
        name: "gradaLines",
        label: "MenuAdvanced.infColorParam.gradaLines",
        spec: vector4Spec,
        newItem: newVector4,
    },
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
    {kind: "str", name: "maskTexName", label: "MenuAdvanced.maskParam.maskTexName"},
    {kind: "str", name: "linkMaskName", label: "MenuAdvanced.maskParam.linkMaskName"},
    {kind: "int", name: "linkMaskNo", label: "MenuAdvanced.maskParam.linkMaskNo"},
    {kind: "str", name: "shareRtTargetPart", label: "MenuAdvanced.maskParam.shareRtTargetPart"},
    {
        kind: "list",
        name: "maskData",
        label: "MenuAdvanced.maskParam.maskData",
        spec: maskDataSpec,
        newItem: newMaskData
    },
    {
        kind: "list",
        name: "maskRanges",
        label: "MenuAdvanced.maskParam.maskRanges",
        spec: vector4Spec,
        newItem: newVector4,
    },
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
    {kind: "vec", name: "pos", label: "MenuAdvanced.transTexData.pos", axes: ["x", "y"]},
    {kind: "vec", name: "scale", label: "MenuAdvanced.transTexData.scale", axes: ["x", "y"]},
    {kind: "float", name: "rotDeg", label: "MenuAdvanced.transTexData.rotDeg"},
    {kind: "vec", name: "areaUV", label: "MenuAdvanced.transTexData.areaUV", axes: ["x", "y", "z", "w"]},
    {
        kind: "vec",
        name: "srcTexPixcel",
        label: "MenuAdvanced.transTexData.srcTexPixcel",
        axes: ["x", "y"],
        integer: true,
    },
    {
        kind: "obj",
        name: "defTrans",
        label: "MenuAdvanced.transTexData.defTrans",
        spec: transTexDataSpec,
        newValue: () => newTransTexData(),
    },
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
    {kind: "str", name: "slotId", label: "MenuAdvanced.preMulTexData.slotId", width: 150},
    {kind: "str", name: "saveTag", label: "MenuAdvanced.preMulTexData.saveTag", width: 150},
    {
        kind: "str",
        name: "f_strFileName",
        label: "MenuAdvanced.preMulTexData.f_strFileName",
        width: 220,
    },
    {kind: "str", name: "f_strPropName", label: "MenuAdvanced.preMulTexData.f_strPropName", width: 160},
    {
        kind: "strEnum",
        name: "f_eBlendMode",
        label: "MenuAdvanced.preMulTexData.f_eBlendMode",
        options: systemMaterialOptions(),
    },
    {
        kind: "strEnum",
        name: "preTexCompoTypeStr",
        label: "MenuAdvanced.preMulTexData.preTexCompoTypeStr",
        options: systemMaterialOptions(),
    },
    {kind: "int", name: "f_nMatNo", label: "MenuAdvanced.preMulTexData.f_nMatNo", width: 100},
    {kind: "int", name: "f_nLayerNo", label: "MenuAdvanced.preMulTexData.f_nLayerNo", width: 100},
    {kind: "bool", name: "f_bTexGroup", label: "MenuAdvanced.preMulTexData.f_bTexGroup"},
    {
        kind: "int",
        name: "f_nLayNoInGroup",
        label: "MenuAdvanced.preMulTexData.f_nLayNoInGroup",
        width: 130,
    },
    {kind: "float", name: "f_fAlpha", label: "MenuAdvanced.preMulTexData.f_fAlpha", width: 100},
    {
        kind: "int",
        name: "f_nTargetBodyTexSize",
        label: "MenuAdvanced.preMulTexData.f_nTargetBodyTexSize",
        width: 150,
    },
    {
        kind: "str",
        name: "posDefHokuroTatooSlotId",
        label: "MenuAdvanced.preMulTexData.posDefHokuroTatooSlotId",
        width: 190,
    },
    {kind: "int", name: "version", label: "MenuAdvanced.preMulTexData.version", width: 100},
    {
        kind: "obj",
        name: "maskParam",
        label: "MenuAdvanced.preMulTexData.maskParam",
        spec: maskParamSpec,
        newValue: newMaskParam,
    },
    {
        kind: "obj",
        name: "infColParam",
        label: "MenuAdvanced.preMulTexData.infColParam",
        spec: infColorParamSpec,
        newValue: newInfColorParam,
    },
    {
        kind: "list",
        name: "preMaskData",
        label: "MenuAdvanced.preMulTexData.preMaskData",
        spec: maskDataSpec,
        newItem: newMaskData,
    },
    {
        kind: "list",
        name: "preTransTexData",
        label: "MenuAdvanced.preMulTexData.preTransTexData",
        spec: transTexDataSpec,
        newItem: newTransTexData,
    },
    {
        kind: "obj",
        name: "preInfColData",
        label: "MenuAdvanced.preMulTexData.preInfColData",
        spec: infColDataSpec,
        newValue: newInfColData,
    },
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
    {kind: "str", name: "mpn", label: "MenuAdvanced.colvariData.mpn", width: 180},
    {kind: "str", name: "layerName", label: "MenuAdvanced.colvariData.layerName", width: 150},
    {kind: "str", name: "viewName", label: "MenuAdvanced.colvariData.viewName", width: 150},
    {kind: "enum", name: "colorType", label: "MenuAdvanced.colvariData.colorType", options: colorTypeOptions()},
    {
        kind: "enum",
        name: "colorTypeSub",
        label: "MenuAdvanced.colvariData.colorTypeSub",
        options: colorTypeOptions(),
    },
    {kind: "flags", name: "useType", label: "MenuAdvanced.colvariData.useType", flags: ColvariUseTypeFlags},
    {kind: "float", name: "alpha", label: "MenuAdvanced.colvariData.alpha", width: 100},
    {kind: "str", name: "mamaFileName", label: "MenuAdvanced.colvariData.mamaFileName", width: 200},
    {
        kind: "str",
        name: "saveInfColDataLinkLayer",
        label: "MenuAdvanced.colvariData.saveInfColDataLinkLayer",
        width: 200,
    },
    {kind: "int", name: "version", label: "MenuAdvanced.colvariData.version", width: 100},
    colorField("colData", "MenuAdvanced.colvariData.colData"),
    {
        kind: "list",
        name: "maskData",
        label: "MenuAdvanced.colvariData.maskData",
        spec: maskDataSpec,
        newItem: newMaskData,
    },
    {
        kind: "list",
        name: "partColDefs",
        label: "MenuAdvanced.colvariData.partColDefs",
        spec: partColDefSpec,
        newItem: newPartColDef,
    },
    {
        kind: "obj",
        name: "gradaColDef",
        label: "MenuAdvanced.colvariData.gradaColDef",
        spec: gradaColDefSpec,
        newValue: newGradaColDef,
    },
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
    {kind: "str", name: "iconFileName", label: "MenuAdvanced.colvari.iconFileName"},
    {kind: "str", name: "reqDefine", label: "MenuAdvanced.colvari.reqDefine"},
    {kind: "int", name: "version", label: "MenuAdvanced.colvari.version"},
    colorField("iconColor", "MenuAdvanced.colvari.iconColor"),
    {
        kind: "list",
        name: "colvariDatas",
        label: "MenuAdvanced.colvari.colvariDatas",
        spec: colvariDataSpec,
        newItem: newColvariData,
    },
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
 *  Item2 是 KCES2 读的版本号（Menu.cs 按 100-199 / 300+ 分支判发型与部件世代），
 *  Item1 全代码库无人读取，真实样本里就是 "unknown"
 * ------------------------------------------------------------------------- */

export const partsVerSpec = (): FieldSpec[] => [
    {kind: "str", name: "item1", label: "MenuAdvanced.partsVer.item1"},
    {kind: "int", name: "item2", label: "MenuAdvanced.partsVer.item2"},
];

export function newPartsVer(): any {
    return {item1: "unknown", item2: 300};
}
