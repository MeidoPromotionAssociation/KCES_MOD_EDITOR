import {numberEnumOptions} from "./kcesEnums.ts";

/**
 * MagicaCloth2 ClothSerializeData（.db2conf / .dsb2conf / .dsl2conf 的载荷）字段元数据
 *
 * 全部取自游戏内的 MagicaClothV2 源码，KCES2 1.36.0 与 COM3D2_5 3.49.2 的两份 ClothSerializeData.cs
 * 逐字节相同，下列出处按 KCES2 1.36.0 的 MagicaClothV2/MagicaCloth2/ 记：
 * - 枚举取值：ClothProcess.ClothType、ClothMeshWriteMode、ClothSerializeData.PaintMode、
 *   RenderSetupData.BoneConnectionMode、ClothUpdateMode、NormalAlignmentSettings.AlignmentMode、
 *   CullingSettings.CameraCullingMode / CameraCullingMethod、ClothNormalAxis、
 *   InertiaConstraint.TeleportMode、ColliderCollisionConstraint.Mode、SelfCollisionConstraint.SelfCollisionMode
 * - min/max：各 DataValidate() 里的 Mathf.Clamp / Mathf.Clamp01 / Mathf.Max，即游戏实际接受的边界
 * - sliderMin/sliderMax：字段上的 [Range] 特性（Inspector 拖动条范围），与 min/max 不同才写
 * - def：字段初始化器或 SerializeData 构造函数里的出厂默认值
 *
 * 另外记录 ignored：ClothSerializeData.ImportJson 的流程是
 * `new TempBuffer(this)` → `JsonUtility.FromJsonOverwrite(json, this)` → `tempBuffer.Pop(this)`，
 * TempBuffer 在反序列化前抓下场景里的现值、之后再写回去，所以 Pop 覆盖到的成员
 * 无论文件里写什么都不生效。三个格式的读取入口（DynamicYureBone.LoadMagica2Setting、
 * DynamicKCES2SkirtBone.LoadMagica2Params、DynamicSleeveBone.LoadMagica2Params）都走 ImportJson。
 */

/** 数值字段的取值信息 */
export interface NumberMeta {
    /** 游戏接受的下界（DataValidate），没有下界则不填 */
    min?: number;
    /** 游戏接受的上界（DataValidate），没有上界则不填 */
    max?: number;
    /** 拖动条下界，不填时回退到 min */
    sliderMin?: number;
    /** 拖动条上界，不填时回退到 max */
    sliderMax?: number;
    /** 拖动步长，不填时按区间跨度推算 */
    step?: number;
    /** 出厂默认值 */
    def?: number;
    /** 整数字段 */
    integer?: boolean;
}

/* -----------------------------
 * 枚举
 * ----------------------------- */

const ClothTypeNames: Record<number, string> = {
    0: "MeshCloth",
    1: "BoneCloth",
    10: "BoneSpring",
};

const MeshWriteModeNames: Record<number, string> = {
    0: "PositionAndNormal",
    1: "PositionAndNormalTangent",
};

const PaintModeNames: Record<number, string> = {
    0: "Manual",
    1: "Texture_Fixed_Move",
    2: "Texture_Fixed_Move_Limit",
};

const BoneConnectionModeNames: Record<number, string> = {
    0: "Line",
    1: "AutomaticMesh",
    2: "SequentialLoopMesh",
    3: "SequentialNonLoopMesh",
};

const UpdateModeNames: Record<number, string> = {
    0: "Normal",
    1: "UnityPhysics",
    2: "Unscaled",
    10: "AnimatorLinkage",
};

const AlignmentModeNames: Record<number, string> = {
    0: "None",
    1: "BoundingBoxCenter",
    2: "Transform",
};

const CameraCullingModeNames: Record<number, string> = {
    0: "Off",
    10: "Reset",
    20: "Keep",
    30: "AnimatorLinkage",
};

const CameraCullingMethodNames: Record<number, string> = {
    0: "AutomaticRenderer",
    10: "ManualRenderer",
};

const NormalAxisNames: Record<number, string> = {
    0: "Right",
    1: "Up",
    2: "Forward",
    3: "InverseRight",
    4: "InverseUp",
    5: "InverseForward",
};

const TeleportModeNames: Record<number, string> = {
    0: "None",
    1: "Reset",
    2: "Keep",
};

const CollisionModeNames: Record<number, string> = {
    0: "None",
    1: "Point",
    2: "Edge",
};

const SelfCollisionModeNames: Record<number, string> = {
    0: "None",
    2: "FullMesh",
};

/** 路径 → 枚举取值表 */
const EnumTables: Record<string, Record<number, string>> = {
    "clothType": ClothTypeNames,
    "meshWriteMode": MeshWriteModeNames,
    "paintMode": PaintModeNames,
    "connectionMode": BoneConnectionModeNames,
    "updateMode": UpdateModeNames,
    "normalAlignmentSetting.alignmentMode": AlignmentModeNames,
    "cullingSettings.cameraCullingMode": CameraCullingModeNames,
    "cullingSettings.cameraCullingMethod": CameraCullingMethodNames,
    "normalAxis": NormalAxisNames,
    "inertiaConstraint.teleportMode": TeleportModeNames,
    "colliderCollisionConstraint.mode": CollisionModeNames,
    "selfCollisionConstraint.selfMode": SelfCollisionModeNames,
    "selfCollisionConstraint.syncMode": SelfCollisionModeNames,
};

/** 枚举选项缓存，避免每次渲染都重新排序 */
const enumOptionCache = new Map<string, Array<{ label: string; value: number }>>();

/** 取路径对应的枚举选项，非枚举字段返回 undefined */
export function enumOptionsFor(path: string): Array<{ label: string; value: number }> | undefined {
    const table = EnumTables[path];
    if (!table) {
        return undefined;
    }
    let options = enumOptionCache.get(path);
    if (!options) {
        options = numberEnumOptions(table);
        enumOptionCache.set(path, options);
    }
    return options;
}

/* -----------------------------
 * 数值范围
 * ----------------------------- */

// 0..1 的比例字段太多，单列一个构造器少写点
function ratio(def: number): NumberMeta {
    return {min: 0, max: 1, step: 0.01, def};
}

const NumberMetas: Record<string, NumberMeta> = {
    // 构建与场景设置
    "paintMapUvChannel": {min: 0, max: 7, step: 1, def: 0, integer: true},
    "rotationalInterpolation": ratio(0.5),
    "rootRotation": ratio(0.5),
    "animationPoseRatio": ratio(0),
    "stablizationTimeAfterReset": ratio(0.1),
    "blendWeight": ratio(1),
    "reductionSetting.simpleDistance": {min: 0, max: 0.2, step: 0.001, def: 0},
    "reductionSetting.shapeDistance": {min: 0, max: 0.2, step: 0.001, def: 0},
    "cullingSettings.distanceCullingLength.value": {min: 0, max: 100, step: 1, def: 30},
    "cullingSettings.distanceCullingFadeRatio": ratio(0.2),

    // 运行参数
    // gravity 的 [Range] 是 0..10，DataValidate 却按 0..20 收，取宽的做边界、窄的做拖动条
    "gravity": {min: 0, max: 20, sliderMax: 10, step: 0.1, def: 5},
    "gravityFalloff": ratio(0),
    "damping.value": {min: 0, max: 1, step: 0.01, def: 0.05},
    "radius.value": {min: 0.001, max: 1, step: 0.001, def: 0.02},

    // 惯性
    "inertiaConstraint.anchorInertia": ratio(0),
    "inertiaConstraint.worldInertia": ratio(1),
    // 早期布局的两个成员，当前源码里已被 worldInertia / localInertia 取代（FormerlySerializedAs）
    "inertiaConstraint.movementInertia": {min: 0, max: 1, step: 0.01},
    "inertiaConstraint.rotationInertia": {min: 0, max: 1, step: 0.01},
    "inertiaConstraint.movementInertiaSmoothing": ratio(0.4),
    "inertiaConstraint.movementSpeedLimit.value": {min: 0, max: 10, step: 0.1, def: 5},
    "inertiaConstraint.rotationSpeedLimit.value": {min: 0, max: 1440, step: 10, def: 720},
    "inertiaConstraint.localInertia": ratio(1),
    "inertiaConstraint.localMovementSpeedLimit.value": {min: 0, max: 10, step: 0.1, def: 5},
    "inertiaConstraint.localRotationSpeedLimit.value": {min: 0, max: 1440, step: 10, def: 720},
    "inertiaConstraint.depthInertia": ratio(0),
    "inertiaConstraint.centrifualAcceleration": ratio(0),
    "inertiaConstraint.particleSpeedLimit.value": {min: 0, max: 10, step: 0.1, def: 4},
    "inertiaConstraint.teleportDistance": {min: 0, step: 0.1, def: 0.5},
    "inertiaConstraint.teleportRotation": {min: 0, step: 1, def: 90},

    // 约束
    "tetherConstraint.distanceCompression": ratio(0.4),
    "distanceConstraint.stiffness.value": {min: 0, max: 1, step: 0.01, def: 1},
    "triangleBendingConstraint.stiffness": ratio(1),
    "angleRestorationConstraint.stiffness.value": {min: 0, max: 1, step: 0.01, def: 0.2},
    "angleRestorationConstraint.velocityAttenuation": ratio(0.8),
    "angleRestorationConstraint.gravityFalloff": ratio(0),
    "angleLimitConstraint.limitAngle.value": {min: 0, max: 180, step: 1, def: 60},
    "angleLimitConstraint.stiffness": ratio(1),
    "motionConstraint.maxDistance.value": {min: 0, max: 5, step: 0.01, def: 0.3},
    "motionConstraint.backstopRadius": {min: 0, max: 10, sliderMin: 0.1, step: 0.1, def: 10},
    "motionConstraint.backstopDistance.value": {min: 0, max: 1, step: 0.01, def: 0},
    "motionConstraint.stiffness": ratio(1),

    // 碰撞
    "colliderCollisionConstraint.friction": {min: 0, max: 0.5, step: 0.005, def: 0.05},
    "colliderCollisionConstraint.limitDistance.value": {min: 0, max: 1, step: 0.01, def: 0.05},
    "selfCollisionConstraint.surfaceThickness.value": {min: 0.001, max: 0.05, step: 0.001, def: 0.005},
    "selfCollisionConstraint.clothMass": ratio(0),

    // 风
    "wind.influence": {min: 0, max: 2, step: 0.01, def: 1},
    "wind.frequency": {min: 0, max: 2, step: 0.01, def: 1},
    "wind.turbulence": {min: 0, max: 2, step: 0.01, def: 1},
    "wind.blend": ratio(0.7),
    "wind.synchronization": ratio(0.7),
    "wind.depthWeight": ratio(0),
    "wind.movingWind": {min: 0, max: 10, step: 0.1, def: 0},

    // 弹簧
    // springPower 的 [Range] 是 0.001..0.2，DataValidate 按 0.001..1 收；
    // limitDistance 的 [Range] 是 0..0.5，DataValidate 只做 Mathf.Max(0) 没有上界
    "springConstraint.springPower": {min: 0.001, max: 1, sliderMax: 0.2, step: 0.001, def: 0.04},
    "springConstraint.limitDistance": {min: 0, sliderMin: 0, sliderMax: 0.5, step: 0.01, def: 0.1},
    "springConstraint.normalLimitRatio": ratio(1),
    "springConstraint.springNoise": ratio(0),
};

/** 取路径对应的数值范围信息 */
export function numberMetaFor(path: string): NumberMeta | undefined {
    return NumberMetas[path];
}

/** 按区间跨度推算拖动步长 */
export function defaultStep(min: number, max: number): number {
    const span = Math.abs(max - min);
    if (span <= 0.1) return 0.001;
    if (span <= 2) return 0.01;
    if (span <= 20) return 0.1;
    if (span <= 200) return 1;
    return 10;
}

/** 把拖动条给出的值对齐到步长，顺手抹掉浮点尾差 */
export function snapToStep(value: number, step: number): number {
    const decimals = Math.max(0, Math.ceil(-Math.log10(step)));
    return Number((Math.round(value / step) * step).toFixed(decimals));
}

/* -----------------------------
 * 加载时被忽略的成员
 * ----------------------------- */

// 与 ClothSerializeData.TempBuffer.Pop 的赋值列表一一对应
const IgnoredPaths = [
    "clothType",
    "sourceRenderers",
    "meshWriteMode",
    "paintMode",
    "paintMaps",
    "paintMapUvChannel",
    "rootBones",
    "connectionMode",
    "rotationalInterpolation",
    "rootRotation",
    "updateMode",
    "animationPoseRatio",
    "reductionSetting",
    "customSkinningSetting",
    "normalAlignmentSetting",
    "normalAxis",
    "stablizationTimeAfterReset",
    "blendWeight",
    "cullingSettings",
    "colliderCollisionConstraint.colliderList",
    "colliderCollisionConstraint.collisionBones",
    "selfCollisionConstraint.syncPartner",
    "inertiaConstraint.anchor",
    "inertiaConstraint.anchorInertia",
];

/** 判断路径是否落在被忽略的成员（含其子成员）里 */
export function isIgnoredPath(path: string): boolean {
    return IgnoredPaths.some((ignored) => path === ignored || path.startsWith(ignored + "."));
}

/* -----------------------------
 * 分组
 * ----------------------------- */

/** 一个折叠面板：i18n 键后缀 + 该组包含的顶层成员 */
export interface MagicaGroup {
    key: string;
    members: string[];
}

// 先生效的参数、后被忽略的构建设置；组内顺序沿用 ClothSerializeData 的字段声明顺序
export const MagicaGroups: MagicaGroup[] = [
    {key: "runtime", members: ["gravity", "gravityDirection", "gravityFalloff", "damping", "radius"]},
    {key: "inertia", members: ["inertiaConstraint"]},
    {
        key: "constraints",
        members: [
            "tetherConstraint",
            "distanceConstraint",
            "triangleBendingConstraint",
            "angleRestorationConstraint",
            "angleLimitConstraint",
            "motionConstraint",
        ],
    },
    {key: "collision", members: ["colliderCollisionConstraint", "selfCollisionConstraint"]},
    {key: "wind", members: ["wind"]},
    {key: "spring", members: ["springConstraint"]},
    {
        key: "scene",
        members: [
            "clothType",
            "updateMode",
            "connectionMode",
            "normalAxis",
            "rotationalInterpolation",
            "rootRotation",
            "animationPoseRatio",
            "blendWeight",
            "stablizationTimeAfterReset",
            "meshWriteMode",
            "paintMode",
            "paintMapUvChannel",
            "reductionSetting",
            "customSkinningSetting",
            "normalAlignmentSetting",
            "cullingSettings",
            "sourceRenderers",
            "rootBones",
            "paintMaps",
        ],
    },
];

/** 整组都被忽略、不必逐字段标注的分组 */
export const FullyIgnoredGroups = new Set(["scene"]);

/**
 * 把文档的顶层成员按分组切开，落在分组之外的成员进 other 组
 * 文件由不同时期的 MagicaCloth2 版本写出，成员集合会变，所以只渲染文档里实际存在的成员
 */
export function splitIntoGroups(document: Record<string, any>): MagicaGroup[] {
    const keys = Object.keys(document ?? {});
    const present = new Set(keys);
    const groups: MagicaGroup[] = [];
    const taken = new Set<string>();

    for (const group of MagicaGroups) {
        const members = group.members.filter((member) => present.has(member));
        for (const member of members) {
            taken.add(member);
        }
        if (members.length > 0) {
            groups.push({key: group.key, members});
        }
    }

    const rest = keys.filter((member) => !taken.has(member));
    if (rest.length > 0) {
        groups.push({key: "other", members: rest});
    }
    return groups;
}
