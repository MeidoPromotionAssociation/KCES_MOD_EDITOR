import {numberEnumOptions} from "./kcesEnums.ts";

/**
 * MagicaCloth（v1）ClothParams 字段元数据（.dsbconf / .dslconf 的载荷）
 *
 * 全部取自游戏内 MagicaCloth v1 源码，出处按 KCES2 1.36.0 的 MagicaCloth/ClothParams.cs 记：
 * - 枚举取值：ClothParams.TeleportMode / AdjustMode / PenetrationMode / PenetrationAxis
 * - def：字段初始化器里的出厂默认值（与库 NewClothParams 一致，逐个考证）
 *
 * 与 MagicaCloth2（magicaClothMeta.ts）不同：.dsbconf / .dslconf 的加载入口
 * （DynamicKCESSkirtBone.LoadParams、DynamicSleeveBone）是整段 MessagePackSerializer.Deserialize，
 * 不走 ImportJson，也不做 DataValidate 的 clamp——文件里写什么就应用什么。
 * 因此这里没有「加载时被忽略」的成员，也没有游戏强制的取值范围
 */

/* -----------------------------
 * 枚举
 * ----------------------------- */

const AdjustModeNames: Record<number, string> = {
    0: "Fixed",
    1: "XYMove",
    2: "XZMove",
    3: "YZMove",
};

const PenetrationModeNames: Record<number, string> = {
    0: "SurfacePenetration",
    1: "ColliderPenetration",
};

const PenetrationAxisNames: Record<number, string> = {
    0: "X",
    1: "Y",
    2: "Z",
    3: "InverseX",
    4: "InverseY",
    5: "InverseZ",
};

const TeleportModeNames: Record<number, string> = {
    0: "Reset",
    1: "Keep",
};

/** 字段名 → 枚举取值表 */
const EnumTables: Record<string, Record<number, string>> = {
    "adjustMode": AdjustModeNames,
    "penetrationMode": PenetrationModeNames,
    "penetrationAxis": PenetrationAxisNames,
    "teleportMode": TeleportModeNames,
};

/** 枚举选项缓存，避免每次渲染都重新排序 */
const enumOptionCache = new Map<string, Array<{ label: string; value: number }>>();

/** 取字段对应的枚举选项，非枚举字段返回 undefined */
export function clothEnumOptionsFor(field: string): Array<{ label: string; value: number }> | undefined {
    const table = EnumTables[field];
    if (!table) {
        return undefined;
    }
    let options = enumOptionCache.get(field);
    if (!options) {
        options = numberEnumOptions(table);
        enumOptionCache.set(field, options);
    }
    return options;
}

/* -----------------------------
 * 数值出厂默认值
 * 只收 def 与 integer：v1 加载不做 clamp，没有可考证的取值范围
 * ----------------------------- */

export interface ClothNumberDefault {
    /** 出厂默认值（ClothParams.cs 字段初始化器） */
    def: number;
    /** 整数字段 */
    integer?: boolean;
}

const NumberDefaults: Record<string, ClothNumberDefault> = {
    massInfluence: {def: 0.3},
    windInfluence: {def: 1},
    windRandomScale: {def: 0.7},
    disableDistance: {def: 20},
    disableFadeDistance: {def: 5},
    teleportDistance: {def: 0.2},
    teleportRotation: {def: 45},
    resetStabilizationTime: {def: 0.1},
    clampDistanceMinRatio: {def: 0.7},
    clampDistanceMaxRatio: {def: 1.1},
    clampDistanceVelocityInfluence: {def: 0.2},
    clampPositionRatioX: {def: 1},
    clampPositionRatioY: {def: 1},
    clampPositionRatioZ: {def: 1},
    clampPositionVelocityInfluence: {def: 0.2},
    clampRotationVelocityInfluence: {def: 0.2},
    clampRotationVelocityLimit: {def: 1},
    restoreDistanceVelocityInfluence: {def: 1},
    bendDistanceMaxCount: {def: 2, integer: true},
    nearDistanceMaxCount: {def: 3, integer: true},
    nearDistanceMaxDepth: {def: 1},
    restoreRotationVelocityInfluence: {def: 0.2},
    springPower: {def: 0.017},
    springRadius: {def: 0.1},
    springScaleX: {def: 1},
    springScaleY: {def: 1},
    springScaleZ: {def: 1},
    springIntensity: {def: 1},
    adjustRotationPower: {def: 5},
    maxVolumeLength: {def: 0.1},
    friction: {def: 0.2},
    penetrationMaxDepth: {def: 1},
    maxMoveSpeed: {def: 10},
    maxRotationSpeed: {def: 360},
};

/** 取字段对应的出厂默认值信息，没有记录则返回 undefined */
export function clothNumberDefaultFor(field: string): ClothNumberDefault | undefined {
    return NumberDefaults[field];
}

/* -----------------------------
 * 分组
 * 组与组内顺序沿用 ClothParams 的 Set* 方法结构：每组以 use* 开关领头，随后是它启用的参数
 * ----------------------------- */

/** 一个折叠面板：i18n 键后缀 + 该组包含的顶层成员 */
export interface ClothParamGroup {
    key: string;
    members: string[];
}

export const ClothParamGroups: ClothParamGroup[] = [
    {key: "basic", members: ["radius", "mass"]},
    {key: "gravity", members: ["useGravity", "gravity", "gravityDirection"]},
    {key: "drag", members: ["useDrag", "drag"]},
    {key: "maxVelocity", members: ["useMaxVelocity", "maxVelocity"]},
    {
        key: "worldInfluence",
        members: ["worldMoveInfluence", "worldRotationInfluence", "maxMoveSpeed", "maxRotationSpeed"],
    },
    {key: "externalForce", members: ["massInfluence", "windInfluence", "windRandomScale"]},
    {key: "distanceDisable", members: ["useDistanceDisable", "disableDistance", "disableFadeDistance"]},
    {
        key: "teleport",
        members: ["useResetTeleport", "teleportDistance", "teleportRotation", "teleportMode", "resetStabilizationTime"],
    },
    {
        key: "clampDistance",
        members: [
            "useClampDistanceRatio",
            "clampDistanceMinRatio",
            "clampDistanceMaxRatio",
            "clampDistanceVelocityInfluence",
        ],
    },
    {
        key: "clampPosition",
        members: [
            "useClampPositionLength",
            "clampPositionLength",
            "clampPositionRatioX",
            "clampPositionRatioY",
            "clampPositionRatioZ",
            "clampPositionVelocityInfluence",
        ],
    },
    {
        key: "clampRotation",
        members: [
            "useClampRotation",
            "clampRotationAngle",
            "clampRotationVelocityLimit",
            "clampRotationVelocityInfluence",
        ],
    },
    {
        key: "restoreDistance",
        members: [
            "restoreDistanceVelocityInfluence",
            "structDistanceStiffness",
            "useBendDistance",
            "bendDistanceMaxCount",
            "bendDistanceStiffness",
            "useNearDistance",
            "nearDistanceMaxCount",
            "nearDistanceMaxDepth",
            "nearDistanceLength",
            "nearDistanceStiffness",
        ],
    },
    {key: "restoreRotation", members: ["useRestoreRotation", "restoreRotation", "restoreRotationVelocityInfluence"]},
    {
        key: "spring",
        members: [
            "useSpring",
            "springPower",
            "springRadius",
            "springScaleX",
            "springScaleY",
            "springScaleZ",
            "springIntensity",
            "springDirectionAtten",
            "springDistanceAtten",
        ],
    },
    {key: "adjust", members: ["adjustMode", "adjustRotationPower"]},
    {key: "triangleBend", members: ["useTriangleBend", "triangleBend"]},
    {key: "volume", members: ["useVolume", "maxVolumeLength", "volumeStretchStiffness", "volumeShearStiffness"]},
    {key: "collision", members: ["useCollision", "friction", "keepInitialShape"]},
    {
        key: "penetration",
        members: [
            "usePenetration",
            "penetrationMode",
            "penetrationAxis",
            "penetrationMaxDepth",
            "penetrationConnectDistance",
            "penetrationDistance",
            "penetrationRadius",
        ],
    },
    {key: "rotationOption", members: ["useLineAvarageRotation", "useFixedNonRotation"]},
];

/**
 * 由某个 use* 开关整体控制的功能分组：开关关闭时该组参数在游戏里不生效，默认折起
 * 没列进来的分组（basic / worldInfluence / externalForce / adjust / restoreDistance / rotationOption）
 * 要么常驻生效、要么由组内多个独立开关分别控制，一律默认展开
 */
const GatedGroups: Record<string, string> = {
    gravity: "useGravity",
    drag: "useDrag",
    maxVelocity: "useMaxVelocity",
    distanceDisable: "useDistanceDisable",
    teleport: "useResetTeleport",
    clampDistance: "useClampDistanceRatio",
    clampPosition: "useClampPositionLength",
    clampRotation: "useClampRotation",
    restoreRotation: "useRestoreRotation",
    spring: "useSpring",
    triangleBend: "useTriangleBend",
    volume: "useVolume",
    collision: "useCollision",
    penetration: "usePenetration",
};

/** 分组默认是否展开：功能组的开关为 false 时折起，其余一律展开 */
export function isClothGroupActive(groupKey: string, document: Record<string, any>): boolean {
    const gate = GatedGroups[groupKey];
    return gate === undefined || (document ?? {})[gate] !== false;
}

/** 已知分组覆盖到的全部成员，用来识别落在分组之外的成员 */
const KnownMembers = new Set(ClothParamGroups.flatMap((group) => group.members));

export function isKnownClothGroup(key: string): boolean {
    return ClothParamGroups.some((group) => group.key === key) || key === "other";
}

/**
 * 把文档的顶层成员按分组切开，落在分组之外的成员进 other 组
 * 文件由不同时期的 MagicaCloth 版本写出，成员集合会变，所以只渲染文档里实际存在的成员
 */
export function splitClothParamsIntoGroups(document: Record<string, any>): ClothParamGroup[] {
    const present = new Set(Object.keys(document ?? {}));
    const groups: ClothParamGroup[] = [];

    for (const group of ClothParamGroups) {
        const members = group.members.filter((member) => present.has(member));
        if (members.length > 0) {
            groups.push({key: group.key, members});
        }
    }

    const rest = Object.keys(document ?? {}).filter((member) => !KnownMembers.has(member));
    if (rest.length > 0) {
        groups.push({key: "other", members: rest});
    }
    return groups;
}
