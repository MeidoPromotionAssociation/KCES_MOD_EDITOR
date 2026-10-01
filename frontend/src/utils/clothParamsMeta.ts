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

/** 取字段对应的枚举选项，非枚举字段返回 undefined；labelOf 用来把枚举名换成当前语言的译名 */
export function clothEnumOptionsFor(
    field: string,
    labelOf?: (name: string) => string | null,
): Array<{ label: string; value: number }> | undefined {
    const table = EnumTables[field];
    if (!table) {
        return undefined;
    }
    // 有 labelOf（依赖当前语言）时不走缓存
    if (labelOf) {
        return numberEnumOptions(table, labelOf);
    }
    let options = enumOptionCache.get(field);
    if (!options) {
        options = numberEnumOptions(table);
        enumOptionCache.set(field, options);
    }
    return options;
}

/** 枚举取值名 → i18n key（ClothParamsEditor.enum_<枚举名>），用于给下拉选项加译名 */
export function clothEnumLabelKey(name: string): string {
    return `ClothParamsEditor.enum_${name}`;
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
 * BezierParam 曲线参数的参考范围
 * ----------------------------- */

/**
 * 数值曲线参数（BezierParam 的 startValue / endValue）的参考范围
 *
 * 游戏侧对 BezierParam 不做任何 clamp（ClothParams 没有 DataValidate，加载时写什么就是什么），
 * 所以这里不是"游戏强制的边界"，而是界面用的参考范围：
 * - 曲线图的纵轴以它为准（数据超出时会自动放宽，保证超范围的值也画得出来）
 * - 拖拽控制点时把值限制在里面，避免拖出荒唐的数
 * 取值依据逐条记在下面；真实样本里出现过的值都落在范围内（已校验）
 */
export interface BezierRange {
    min: number;
    max: number;
}

const BezierRanges: Record<string, BezierRange> = {
    // 粒子半径（m）：0.2 已经很大了
    radius: {min: 0, max: 0.2},
    // 粒子质量：样本里出现过 10
    mass: {min: 0, max: 20},
    // 重力加速度（m/s²）
    gravity: {min: -30, max: 30},
    // 空气阻力：代码里是 math.pow(1 - drag, ...)，drag > 1 会让底数变负
    drag: {min: 0, max: 1},
    // 速度上限（m/s）：默认 3
    maxVelocity: {min: 0, max: 10},
    // 世界移动 / 旋转影响：比例
    worldMoveInfluence: {min: 0, max: 1},
    worldRotationInfluence: {min: 0, max: 1},
    // 位置限制距离（m）
    clampPositionLength: {min: 0, max: 0.5},
    // 旋转限制角度（度）
    clampRotationAngle: {min: 0, max: 180},
    // 各种刚度 / 复原力 / 衰减比例：都是 0~1 的比例量
    structDistanceStiffness: {min: 0, max: 1},
    bendDistanceStiffness: {min: 0, max: 1},
    nearDistanceStiffness: {min: 0, max: 1},
    nearDistanceLength: {min: 0, max: 0.5},
    restoreRotation: {min: 0, max: 0.5},
    springDirectionAtten: {min: 0, max: 1},
    springDistanceAtten: {min: 0, max: 1},
    triangleBend: {min: 0, max: 1},
    volumeStretchStiffness: {min: 0, max: 1},
    volumeShearStiffness: {min: 0, max: 1},
    // 穿透相关的距离（m）：样本里到过 1
    penetrationConnectDistance: {min: 0, max: 0.5},
    penetrationDistance: {min: 0, max: 0.5},
    penetrationRadius: {min: 0, max: 2},
};

/** 取曲线参数的参考范围，没有记录则返回 undefined（此时界面不加限制） */
export function bezierRangeFor(field: string): BezierRange | undefined {
    return BezierRanges[field];
}

/**
 * curveValue 的权威范围
 * BezierParam.AutoSetup 里是 Mathf.Clamp(curveVal, -1f, 1f)；
 * 超出这个范围时控制点会跑到两端之外，曲线会剧烈外翻
 */
export const BezierCurveValueRange: BezierRange = {min: -1, max: 1};

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
