package internal

import (
	"encoding/json"
	"fmt"

	serializationKCES "github.com/MeidoPromotionAssociation/MeidoSerialization/v2/serialization/KCES"
)

// newPayloadDocument 按扩展名构造该扩展名的载荷根对象
// 默认值使用库的 C# 构造默认（NewDynamicBoneStatus/NewClothParams），碰撞体包为空列表
func newPayloadDocument(extension string) (any, error) {
	descriptor, ok := serializationKCES.DescribeKCESPayload(extension)
	if !ok {
		return nil, fmt.Errorf("unknown payload extension %q", extension)
	}
	switch descriptor.Kind {
	case serializationKCES.PayloadKindDynamicBoneStatus:
		return serializationKCES.NewDynamicBoneStatus(), nil
	case serializationKCES.PayloadKindColliderPackage:
		return &serializationKCES.ColliderPackage{
			Version:        1000,
			Colliders:      []*serializationKCES.ColliderRef{},
			LimbEnableList: []*serializationKCES.ColliderState{},
		}, nil
	case serializationKCES.PayloadKindClothParams:
		return serializationKCES.NewClothParams(), nil
	case serializationKCES.PayloadKindLimbCollider:
		return &serializationKCES.LimbColliderPackage{
			Version: 1000,
			Items:   []*serializationKCES.LimbColliderItem{},
		}, nil
	case serializationKCES.PayloadKindIKCollider:
		return &serializationKCES.IKColliderPackage{
			Version: 1000,
			Groups:  []*serializationKCES.IKColliderGroup{},
		}, nil
	case serializationKCES.PayloadKindJSONString:
		// MagicaCloth2 系（.db2conf/.dsb2conf/.dsl2conf）的载荷是 ClothSerializeData
		return newMagicaClothDefault(), nil
	default:
		return nil, fmt.Errorf("payload kind %q has no new-document template", descriptor.Kind)
	}
}

// stringPtr 返回字符串指针
func stringPtr(value string) *string {
	return &value
}

// int32Ptr 返回 int32 指针
func int32Ptr(value int32) *int32 {
	return &value
}

// float32Ptr 返回 float32 指针
func float32Ptr(value float32) *float32 {
	return &value
}

// boolPtr 返回 bool 指针
func boolPtr(value bool) *bool {
	return &value
}

/* -----------------------------
 * MagicaCloth2 出厂默认值模板
 * 按 KCES 1.34.4 的 MagicaClothV2 源码逐字段考证：
 * ClothSerializeData 的字段初始化器与各约束 SerializeData 构造函数
 * 库 v2 已把这份文档建模为 MagicaClothSerializeData，成员全是可选指针，
 * 这里逐个显式赋值，模板才带齐出厂默认值
 * ----------------------------- */

// mcKeyframe 构造 Unity 序列化关键帧（AnimationCurve.Linear 产物，权重为 0）
func mcKeyframe(time, value, inSlope, outSlope float32) serializationKCES.UnityKeyframe {
	return serializationKCES.UnityKeyframe{
		SerializedVersion: stringPtr("3"),
		Time:              float32Ptr(time),
		Value:             float32Ptr(value),
		InSlope:           float32Ptr(inSlope),
		OutSlope:          float32Ptr(outSlope),
		TangentMode:       int32Ptr(0),
		WeightedMode:      int32Ptr(0),
		InWeight:          float32Ptr(0),
		OutWeight:         float32Ptr(0),
	}
}

// mcLinearCurve 构造 AnimationCurve.Linear(0, v0, 1, v1) 的序列化形态
func mcLinearCurve(v0, v1 float32) *serializationKCES.UnityAnimationCurve {
	slope := v1 - v0
	frames := []serializationKCES.UnityKeyframe{
		mcKeyframe(0, v0, 0, slope),
		mcKeyframe(1, v1, slope, 0),
	}
	return &serializationKCES.UnityAnimationCurve{
		SerializedVersion: stringPtr("2"),
		Curve:             &frames,
		PreInfinity:       int32Ptr(2),
		PostInfinity:      int32Ptr(2),
		RotationOrder:     int32Ptr(4),
	}
}

// mcCurveData 构造 MagicaCloth CurveSerializeData（value + useCurve + Linear 曲线）
func mcCurveData(value, curveStart, curveEnd float32, useCurve bool) *serializationKCES.MagicaCurveSerializeData {
	return &serializationKCES.MagicaCurveSerializeData{
		Value:    float32Ptr(value),
		UseCurve: boolPtr(useCurve),
		Curve:    mcLinearCurve(curveStart, curveEnd),
	}
}

// mcSlider 构造 CheckSliderSerializeData
func mcSlider(use bool, value float32) *serializationKCES.MagicaToggleValue {
	return &serializationKCES.MagicaToggleValue{Value: float32Ptr(value), Use: boolPtr(use)}
}

// mcNullRef 构造空的 Unity 对象引用
func mcNullRef() *serializationKCES.UnityInstanceReference {
	return &serializationKCES.UnityInstanceReference{InstanceID: int32Ptr(0)}
}

// mcNoRefs 构造空的 Unity 对象引用数组
func mcNoRefs() *[]serializationKCES.UnityInstanceReference {
	refs := []serializationKCES.UnityInstanceReference{}
	return &refs
}

// newMagicaClothDefault 构造 ClothSerializeData 的出厂默认文档
// clothType 使用 BoneCloth(1)：KCES 服装布料实际使用的类型（C# 零值 MeshCloth 对 KCES 场景无意义）
func newMagicaClothDefault() *serializationKCES.MagicaClothSerializeData {
	return &serializationKCES.MagicaClothSerializeData{
		ClothType:               int32Ptr(1),
		SourceRenderers:         mcNoRefs(),
		MeshWriteMode:           int32Ptr(0),
		PaintMode:               int32Ptr(0),
		PaintMaps:               mcNoRefs(),
		PaintMapUvChannel:       int32Ptr(0),
		RootBones:               mcNoRefs(),
		ConnectionMode:          int32Ptr(0),
		RotationalInterpolation: float32Ptr(0.5),
		RootRotation:            float32Ptr(0.5),
		UpdateMode:              int32Ptr(10), // ClothUpdateMode.AnimatorLinkage
		AnimationPoseRatio:      float32Ptr(0),
		ReductionSetting: &serializationKCES.MagicaReductionSettings{
			SimpleDistance: float32Ptr(0),
			ShapeDistance:  float32Ptr(0),
		},
		CustomSkinningSetting: &serializationKCES.MagicaCustomSkinningSettings{
			Enable:        boolPtr(false),
			SkinningBones: mcNoRefs(),
		},
		NormalAlignmentSetting: &serializationKCES.MagicaNormalAlignmentSettings{
			AlignmentMode:       int32Ptr(0),
			AdjustmentTransform: mcNullRef(),
		},
		CullingSettings: &serializationKCES.MagicaCullingSettings{
			CameraCullingMode:              int32Ptr(30), // CameraCullingMode.AnimatorLinkage
			CameraCullingMethod:            int32Ptr(0),  // CameraCullingMethod.AutomaticRenderer
			CameraCullingRenderers:         mcNoRefs(),
			DistanceCullingLength:          mcSlider(false, 30),
			DistanceCullingFadeRatio:       float32Ptr(0.2),
			DistanceCullingReferenceObject: mcNullRef(),
		},
		NormalAxis:                 int32Ptr(1), // ClothNormalAxis.Up
		Gravity:                    float32Ptr(5),
		GravityDirection:           &serializationKCES.Vector3{X: 0, Y: -1, Z: 0},
		GravityFalloff:             float32Ptr(0),
		StablizationTimeAfterReset: float32Ptr(0.1),
		BlendWeight:                float32Ptr(1),
		Damping:                    mcCurveData(0.05, 1, 1, false),
		Radius:                     mcCurveData(0.02, 1, 1, false),
		InertiaConstraint: &serializationKCES.MagicaInertiaConstraint{
			Anchor:                   mcNullRef(),
			AnchorInertia:            float32Ptr(0),
			WorldInertia:             float32Ptr(1),
			MovementInertiaSmoothing: float32Ptr(0.4),
			MovementSpeedLimit:       mcSlider(true, 5),
			RotationSpeedLimit:       mcSlider(true, 720),
			LocalInertia:             float32Ptr(1),
			LocalMovementSpeedLimit:  mcSlider(false, 5),
			LocalRotationSpeedLimit:  mcSlider(false, 720),
			DepthInertia:             float32Ptr(0),
			CentrifualAcceleration:   float32Ptr(0),
			ParticleSpeedLimit:       mcSlider(true, 4),
			TeleportMode:             int32Ptr(0), // TeleportMode.None
			TeleportDistance:         float32Ptr(0.5),
			TeleportRotation:         float32Ptr(90),
		},
		TetherConstraint: &serializationKCES.MagicaTetherConstraint{
			DistanceCompression: float32Ptr(0.4),
		},
		DistanceConstraint: &serializationKCES.MagicaDistanceConstraint{
			Stiffness: mcCurveData(1, 1, 0.5, false),
		},
		TriangleBendingConstraint: &serializationKCES.MagicaTriangleBendingConstraint{
			Stiffness: float32Ptr(1),
		},
		AngleRestorationConstraint: &serializationKCES.MagicaAngleRestorationConstraint{
			UseAngleRestoration: boolPtr(true),
			Stiffness:           mcCurveData(0.2, 1, 0.2, true),
			VelocityAttenuation: float32Ptr(0.8),
			GravityFalloff:      float32Ptr(0),
		},
		AngleLimitConstraint: &serializationKCES.MagicaAngleLimitConstraint{
			UseAngleLimit: boolPtr(false),
			LimitAngle:    mcCurveData(60, 0, 1, true),
			Stiffness:     float32Ptr(1),
		},
		MotionConstraint: &serializationKCES.MagicaMotionConstraint{
			UseMaxDistance:   boolPtr(false),
			MaxDistance:      mcCurveData(0.3, 1, 1, false),
			UseBackstop:      boolPtr(false),
			BackstopRadius:   float32Ptr(10),
			BackstopDistance: mcCurveData(0, 1, 1, false),
			Stiffness:        float32Ptr(1),
		},
		ColliderCollisionConstraint: &serializationKCES.MagicaColliderCollisionConstraint{
			Mode:           int32Ptr(1), // Mode.Point
			Friction:       float32Ptr(0.05),
			ColliderList:   mcNoRefs(),
			CollisionBones: mcNoRefs(),
			LimitDistance:  mcCurveData(0.05, 1, 1, false),
		},
		SelfCollisionConstraint: &serializationKCES.MagicaSelfCollisionConstraint{
			SelfMode:         int32Ptr(0), // SelfCollisionMode.None
			SurfaceThickness: mcCurveData(0.005, 0.5, 1, false),
			SyncMode:         int32Ptr(0),
			SyncPartner:      mcNullRef(),
			ClothMass:        float32Ptr(0),
		},
		Wind: &serializationKCES.MagicaWindSettings{
			Influence:       float32Ptr(1),
			Frequency:       float32Ptr(1),
			Turbulence:      float32Ptr(1),
			Blend:           float32Ptr(0.7),
			Synchronization: float32Ptr(0.7),
			DepthWeight:     float32Ptr(0),
			MovingWind:      float32Ptr(0),
		},
		SpringConstraint: &serializationKCES.MagicaSpringConstraint{
			UseSpring:        boolPtr(true),
			SpringPower:      float32Ptr(0.04),
			LimitDistance:    float32Ptr(0.1),
			NormalLimitRatio: float32Ptr(1),
			SpringNoise:      float32Ptr(0),
		},
	}
}

/* -----------------------------
 * KCES2 脱衣设置（.undressdat / .undresspdat）出厂默认值模板
 * 按 KCES2 1.36.0 的 UndressCore 源码逐字段考证：
 * ArchiveTarget.cs 的字段初始化器、PeelLimits/VPeelExInfo/CommonPeelInfo 的 Make()，
 * 以及 ArchiveTarget.Validate() 的载入期补齐
 *
 * 两处必须显式写出：
 * - format 写当前版本 1.2.2。C# 字段初始化器是历史回退值 1.0.2，照抄它会让
 *   ArchiveTargetFormatter.CheckUpdate 重放 1.1.0 起的迁移；而 UpdateBy1_2_0 调用的
 *   CloneLayer/ClearGroupIndex 都是无保护地 dataGroup.Where(...)
 *   （ArchiveTargetUtil.cs:282,301），且这些迁移跑在 Validate() 补齐 dataGroup 之前
 * - dataGroup 写空数组。ArchiveTarget.dataGroup 是唯一没有字段初始化器的列表成员，
 *   缺这个成员就要赌 Unity JsonUtility 对缺失列表留空表而不是 null
 * ----------------------------- */

// undressLayerCount 载入时 ArchiveTarget.Validate 会把 layers 补齐到 MyConstants.MAXLayerCount
const undressLayerCount = 15

// newUndressArchiveTarget 构造 .undressdat 的出厂默认文档
func newUndressArchiveTarget() *serializationKCES.UndressArchiveTarget {
	layers := make([]serializationKCES.UndressLayer, undressLayerCount)
	for i := range layers {
		// Validate 补齐时用的是 new OneLayer()，四个成员都是零值
		layers[i] = serializationKCES.UndressLayer{
			Label:        stringPtr(""),
			FixMode:      int32Ptr(0),
			AutoSortMode: int32Ptr(0),
			UseMode:      int32Ptr(0),
		}
	}
	groups := []serializationKCES.UndressGroup{}
	rootIndices := []int32{}
	rootSubIndices := []serializationKCES.UndressSubMeshSlideSub{}

	return &serializationKCES.UndressArchiveTarget{
		Format:                      stringPtr("1.2.2"),
		EditVer:                     int32Ptr(0),
		MeshRelPath:                 stringPtr(""),
		FbxName:                     stringPtr(""),
		SetupDataType:               int32Ptr(0), // eSeupDataType.None，载入时 WearSetuper 按 Pants 处理并回填 fbxName
		Layers:                      &layers,
		SubMeshRootVertexIndices:    &rootIndices,
		SubMeshRootVertexSubIndices: &rootSubIndices,
		DataGroup:                   &groups,
		TempIndex:                   int32Ptr(0),
		PeelCategory:                int32Ptr(99), // MyEnum.PeelCategory.None
		HPeelLimits:                 newUndressPeelLimits(),
		VPeelExInfo:                 newUndressVPeelExInfo(),
		CommonPeelInfo: &serializationKCES.UndressCommonPeelInfo{
			// CommonPeelInfo.Make()
			FixedPullLength: float32Ptr(1),
		},
	}
}

// undressDefaultTails 是 PeelLimits.sTails，逐档剥离进度上限
var undressDefaultTails = []float32{
	-0.4, -0.1, 0.15, 0.35, 0.55, 0.8, 1, 1, 1, 1,
	1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
}

// undressDefaultSelectLimits 是 PeelLimits.sArg，SetHPeelLimitDefault 按标签 Ordinal 排序后写入
// sArg 本身已是升序，排序不改变顺序
var undressDefaultSelectLimits = []struct {
	label string
	value int32
}{
	{"Group_0010", 1}, {"Group_0011", 1}, {"Group_0012", 1}, {"Group_0013", 1}, {"Group_0014", 1},
	{"Group_0021", 0}, {"Group_0022", 0}, {"Group_0023", 0}, {"Group_0024", 0}, {"Group_0025", 0},
	{"Group_0026", 0}, {"Group_0027", 0}, {"Group_0028", 0}, {"Group_0029", 0}, {"Group_0030", 0},
	{"Group_0031", 0}, {"Group_0032", 0}, {"Group_0033", 0}, {"Group_0034", 0}, {"Group_0035", 0},
	{"Group_0036", 0}, {"Group_0037", 0}, {"Group_0038", 0}, {"Group_0039", 1}, {"Group_0040", 1},
}

// newUndressPeelLimits 复现 PeelLimits.Make()：
// SetHeadAndTailDefault 用 sHeads/sTails 填 heads/tails，CheckVer 再把 format_version 从 0 迁到 2——
// 0→1 按 heads 生成 6 条 thrs，1→2 把每条 thr 由 0 改写为 1、其余改写为 -(1-thr)，
// 于是 0.15 变成 -0.85、0 变成 1。SetHPeelLimitDefault 最后补齐 25 条逐组开关
func newUndressPeelLimits() *serializationKCES.UndressPeelLimits {
	heads := []float32{0.15, 0, 0} // sHeads：float[3]，只有 [0] 被赋值
	tails := append([]float32(nil), undressDefaultTails...)

	thresholds := []serializationKCES.UndressPeelThreshold{
		{Label: stringPtr("Group_0010"), Thr: float32Ptr(-0.85)},
		{Label: stringPtr("Group_0011"), Thr: float32Ptr(-0.85)},
		{Label: stringPtr("Group_0012"), Thr: float32Ptr(-0.85)},
		{Label: stringPtr("Group_0013"), Thr: float32Ptr(1)},
		{Label: stringPtr("Group_0014"), Thr: float32Ptr(1)},
		{Label: stringPtr("Group_0015"), Thr: float32Ptr(1)},
	}

	selectLimits := make([]serializationKCES.UndressHPeelSelectLimit, 0, len(undressDefaultSelectLimits))
	for _, entry := range undressDefaultSelectLimits {
		selectLimits = append(selectLimits, serializationKCES.UndressHPeelSelectLimit{
			Label: stringPtr(entry.label),
			Value: int32Ptr(entry.value),
		})
	}

	return &serializationKCES.UndressPeelLimits{
		FormatVersion: int32Ptr(2),
		Heads:         &heads,
		Thrs:          &thresholds,
		// default(LimitPac)：未启用手动区间，自动限位生效
		ManualLimitPac: &serializationKCES.UndressPeelLimitRange{
			Valid: boolPtr(false),
			Begin: float32Ptr(0),
			End:   float32Ptr(0),
		},
		Tails:             &tails,
		HPeelSelectLimits: &selectLimits,
	}
}

// newUndressVPeelExInfo 复现 VPeelExInfo.Make()
// 单位按游戏侧访问器：retension 系是百分比，folding 系是毫米，两个 adjustLength 已是 Unity 单位
func newUndressVPeelExInfo() *serializationKCES.UndressVPeelExInfo {
	return &serializationKCES.UndressVPeelExInfo{
		FrontAdjustLength:              float32Ptr(0.03),
		BackAdjustLength:               float32Ptr(0.015),
		RetensionWidthPar:              float32Ptr(150),
		RetensionDepthFrontPar:         float32Ptr(0),
		RetensionDepthBackPar:          float32Ptr(0),
		VPeelVerticalFoldingWidthFront: float32Ptr(8),
		VPeelVerticalFoldingWidthBack:  float32Ptr(13),
		VPeelFoldingWidth:              float32Ptr(20),
		VPeelFoldingCorrectWidth:       float32Ptr(0),
	}
}

// newUndressPrecomputeTarget 构造 .undresspdat 的出厂默认文档
// 这是从 .undressdat 烘焙出的缓存，新建时三张表都为空；
// OneGroupLooker.Targets 必须存在，RestoreDictionary 会直接遍历它
func newUndressPrecomputeTarget() *serializationKCES.UndressPrecomputeTarget {
	var keys []serializationKCES.UndressGroupKey
	var reductions []serializationKCES.UndressMeshReductionEntry
	var measurers []serializationKCES.UndressWidthMeasurerEntry

	return &serializationKCES.UndressPrecomputeTarget{
		EditVer:                          int32Ptr(0),
		OneGroupLooker:                   &serializationKCES.UndressGroupLooker{Targets: &keys},
		WidthMeasurerValidPixelThreshold: float32Ptr(0),
		MeshReduction:                    &serializationKCES.UndressMeshReductionTable{D: &reductions},
		WidthMeasurer:                    &serializationKCES.UndressWidthMeasurerTable{D: &measurers},
	}
}

// newStructuredDocument 构造一个格式的合法空文档，用于"未打开文件即编辑，另存为即新建"
func newStructuredDocument(formatKey string) (any, error) {
	switch formatKey {
	// 服装部件 / Parts
	case "menuassets":
		return &serializationKCES.MenuAssets{
			FileName: stringPtr("new.menuassets"),
			Assets:   []*serializationKCES.Menu{},
		}, nil
	case "materialassets":
		return &serializationKCES.MaterialAssets{
			FileName: stringPtr("new.materialassets"),
			Assets:   []*serializationKCES.Material{},
		}, nil
	case "pmatassets":
		return &serializationKCES.PriorityMaterialAssets{
			FileName: stringPtr("new.pmatassets"),
			Assets:   []*serializationKCES.PriorityMaterial{},
		}, nil
	case "model":
		// 库校验要求 modelName 与恰好一个 transData[].name 匹配，因此提供一个根骨骼
		return &serializationKCES.Model{
			Version:      1001,
			FileName:     stringPtr("new.model"),
			MeshFileName: stringPtr(""),
			ModelName:    stringPtr("new_model"),
			TransData: []*serializationKCES.TransData{{
				Name:     stringPtr("new_model"),
				ParentNo: -1,
				Rot:      serializationKCES.Vector4{W: 1},
				Scale:    serializationKCES.Vector3{X: 1, Y: 1, Z: 1},
			}},
			BoneNames:        []*string{},
			MaterialFileName: []*string{},
			Morphs:           []*serializationKCES.BlendData{},
		}, nil
	// 物理 / Physics
	case "dbconf", "dbcol", "db2conf", "dsbconf", "dsb2conf", "dslconf", "dsl2conf", "dslcol":
		return newPayloadDocument("." + formatKey)
	// 数据 / Data
	case "nson":
		return json.RawMessage(`{}`), nil
	case "undressdat":
		return newUndressArchiveTarget(), nil
	case "undresspdat":
		return newUndressPrecomputeTarget(), nil
	case "nei":
		// KCES 通过 crc.dll 解码单元格，新表格必须写出 UTF-8，否则游戏把日文读成乱码
		return serializationKCES.NewNei(1, 1, [][]string{{""}}), nil
	default:
		// preset 等 VirtualDirectory 类格式没有有意义的空文档
		return nil, fmt.Errorf("format %q does not support creating a new document", formatKey)
	}
}
