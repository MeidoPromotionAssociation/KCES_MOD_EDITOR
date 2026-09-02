import {
    DB2ConfService,
    DBColService,
    DBConfService,
    DSB2ConfService,
    DSBConfService,
    DSL2ConfService,
    DSLColService,
    DSLConfService,
    MaterialAssetsService,
    MenuAssetsService,
    ModelService,
    NeiService,
    NSONService,
    PresetService,
    PriorityMaterialAssetsService,
    UndressDataService,
    UndressPartsDataService,
} from "../../bindings/github.com/MeidoPromotionAssociation/MeidoSerialization/v2/service/KCES";
import {
    ConvertStructuredJsonToNative,
    ReadStructuredFile,
    WriteStructuredFile
} from "../../bindings/github.com/MeidoPromotionAssociation/KCES_MOD_EDITOR/internal/app.ts";
import {shouldRecalculateLookupHash} from "./lookupHashSetting";


/**
 * 单个格式的读写与转换能力。
 * 读写走 App 的 JSON 字符串通道（ReadStructuredFile/WriteStructuredFile），
 * 避免 uint64 大整数经 wails runtime 的 JSON.parse 丢失精度；
 * 转换（大文件直接转换）仍直接调用 MeidoSerialization 的 service 包
 */
export interface FormatService {
    /** 读取原生文件，返回结构化数据的 JSON 文本 */
    read: (path: string) => Promise<string>;
    /** 将结构化数据 JSON 文本写入原生文件 */
    write: (path: string, jsonText: string) => Promise<void>;
    /** 原生文件 → 编辑 JSON 文件（大文件直接转换用），可选 */
    toJson?: (inputPath: string, outputPath: string, maxOutputBytes: number) => Promise<void>;
    /** 编辑 JSON 文件 → 原生文件（大文件直接转换用），可选 */
    toNative?: (inputPath: string, outputPath: string, maxOutputBytes: number) => Promise<void>;
}

// 转换输出大小上限：1 GB
export const MaxConvertBytes = 1 << 30;

// structured 生成一个格式的读写通道
function structured(formatKey: string): Pick<FormatService, "read" | "write"> {
    return {
        read: (path) => ReadStructuredFile(formatKey, path),
        write: (path, jsonText) => WriteStructuredFile(formatKey, path, jsonText, shouldRecalculateLookupHash()),
    };
}

export const formatServices: Record<string, FormatService> = {
    // 服装部件 / Parts
    // menuassets/materialassets/model 的 JSON → 原生转换走 App 通道，
    // 以便应用"保存时重算 ID/GUID"设置（库自身的转换服务固定重算）
    menuassets: {
        ...structured("menuassets"),
        toJson: (input, output, max) => MenuAssetsService.ConvertMenuAssetsToJson(input, output, max),
        toNative: (input, output, max) => ConvertStructuredJsonToNative("menuassets", input, output, max, shouldRecalculateLookupHash()),
    },
    materialassets: {
        ...structured("materialassets"),
        toJson: (input, output, max) => MaterialAssetsService.ConvertMaterialAssetsToJson(input, output, max),
        toNative: (input, output, max) => ConvertStructuredJsonToNative("materialassets", input, output, max, shouldRecalculateLookupHash()),
    },
    pmatassets: {
        ...structured("pmatassets"),
        toJson: (input, output, max) => PriorityMaterialAssetsService.ConvertPriorityMaterialAssetsToJson(input, output, max),
        toNative: (input, output, max) => PriorityMaterialAssetsService.ConvertJsonToPriorityMaterialAssets(input, output, max),
    },
    model: {
        ...structured("model"),
        toJson: (input, output, max) => ModelService.ConvertModelToJson(input, output, max),
        toNative: (input, output, max) => ConvertStructuredJsonToNative("model", input, output, max, shouldRecalculateLookupHash()),
    },
    // 物理 / Physics
    dbconf: {
        ...structured("dbconf"),
        toJson: (input, output, max) => DBConfService.ConvertDBConfToJson(input, output, max),
        toNative: (input, output, max) => DBConfService.ConvertJsonToDBConf(input, output, max),
    },
    dbcol: {
        ...structured("dbcol"),
        toJson: (input, output, max) => DBColService.ConvertDBColToJson(input, output, max),
        toNative: (input, output, max) => DBColService.ConvertJsonToDBCol(input, output, max),
    },
    db2conf: {
        ...structured("db2conf"),
        toJson: (input, output, max) => DB2ConfService.ConvertDB2ConfToJson(input, output, max),
        toNative: (input, output, max) => DB2ConfService.ConvertJsonToDB2Conf(input, output, max),
    },
    dsbconf: {
        ...structured("dsbconf"),
        toJson: (input, output, max) => DSBConfService.ConvertDSBConfToJson(input, output, max),
        toNative: (input, output, max) => DSBConfService.ConvertJsonToDSBConf(input, output, max),
    },
    dsb2conf: {
        ...structured("dsb2conf"),
        toJson: (input, output, max) => DSB2ConfService.ConvertDSB2ConfToJson(input, output, max),
        toNative: (input, output, max) => DSB2ConfService.ConvertJsonToDSB2Conf(input, output, max),
    },
    dslconf: {
        ...structured("dslconf"),
        toJson: (input, output, max) => DSLConfService.ConvertDSLConfToJson(input, output, max),
        toNative: (input, output, max) => DSLConfService.ConvertJsonToDSLConf(input, output, max),
    },
    dsl2conf: {
        ...structured("dsl2conf"),
        toJson: (input, output, max) => DSL2ConfService.ConvertDSL2ConfToJson(input, output, max),
        toNative: (input, output, max) => DSL2ConfService.ConvertJsonToDSL2Conf(input, output, max),
    },
    dslcol: {
        ...structured("dslcol"),
        toJson: (input, output, max) => DSLColService.ConvertDSLColToJson(input, output, max),
        toNative: (input, output, max) => DSLColService.ConvertJsonToDSLCol(input, output, max),
    },
    // 角色 / Character
    preset: {
        ...structured("preset"),
        toJson: (input, output, max) => PresetService.ConvertPresetToJson(input, output, max),
        toNative: (input, output, max) => PresetService.ConvertJsonToPreset(input, output, max),
    },
    // 数据 / Data
    nson: {
        ...structured("nson"),
        toJson: (input, output, max) => NSONService.ConvertNSONToJson(input, output, max),
        toNative: (input, output, max) => NSONService.ConvertJsonToNSON(input, output, max),
    },
    undressdat: {
        ...structured("undressdat"),
        toJson: (input, output, max) => UndressDataService.ConvertUndressDataToJson(input, output, max),
        toNative: (input, output, max) => UndressDataService.ConvertJsonToUndressData(input, output, max),
    },
    undresspdat: {
        ...structured("undresspdat"),
        toJson: (input, output, max) => UndressPartsDataService.ConvertUndressPartsDataToJson(input, output, max),
        toNative: (input, output, max) => UndressPartsDataService.ConvertJsonToUndressPartsData(input, output, max),
    },
    nei: {
        ...structured("nei"),
    },
};

/** 将 CSV 转换为 .nei 文件（NeiEditor 专用） */
export const convertCsvToNei = (input: string, output: string) => NeiService.ConvertCSVToNei(input, output);

/** 将 .nei 文件转换为 CSV（NeiEditor 专用） */
export const convertNeiToCsv = (input: string, output: string) => NeiService.ConvertNeiToCSV(input, output);

