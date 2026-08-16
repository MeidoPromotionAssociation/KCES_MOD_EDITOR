package internal

import (
	"encoding/json"
	"fmt"

	serializationCOM3D2 "github.com/MeidoPromotionAssociation/MeidoSerialization/serialization/COM3D2"
	serializationKCES "github.com/MeidoPromotionAssociation/MeidoSerialization/serialization/KCES"
)

// newPayloadEnvelope 按扩展名构造带默认分支的 KCES payload 封套
// 分支默认值使用库的 C# 构造默认（NewDynamicBoneStatus/NewClothParams），碰撞体包为空列表
func newPayloadEnvelope(extension string) (*serializationKCES.KCESPayloadEnvelope, error) {
	descriptor, ok := serializationKCES.DescribeKCESPayload(extension)
	if !ok {
		return nil, fmt.Errorf("unknown payload extension %q", extension)
	}
	env := &serializationKCES.KCESPayloadEnvelope{
		Format:         serializationKCES.PayloadFormatKCESMessagePack,
		Extension:      descriptor.Extension,
		StorageVariant: serializationKCES.PayloadStorageInt32LZ4MessagePack,
		Kind:           descriptor.Kind,
	}
	switch descriptor.Kind {
	case serializationKCES.PayloadKindDynamicBoneStatus:
		env.DynamicBone = serializationKCES.NewDynamicBoneStatus()
	case serializationKCES.PayloadKindColliderPackage:
		env.ColliderPackage = &serializationKCES.ColliderPackage{
			Version:   1000,
			Colliders: []*serializationKCES.ColliderRef{},
		}
	case serializationKCES.PayloadKindClothParams:
		env.ClothParams = serializationKCES.NewClothParams()
	case serializationKCES.PayloadKindLimbCollider:
		env.LimbCollider = &serializationKCES.LimbColliderPackage{
			Version: 1000,
			Items:   []*serializationKCES.LimbColliderItem{},
		}
	case serializationKCES.PayloadKindIKCollider:
		env.IKCollider = &serializationKCES.IKColliderPackage{
			Version: 1000,
			Groups:  []*serializationKCES.IKColliderGroup{},
		}
	case serializationKCES.PayloadKindJSONString:
		// MagicaCloth2 系（.db2conf/.dsb2conf/.dsl2conf）的载荷是 ClothSerializeData 的 Unity JSON
		env.JSON = buildMagicaClothDefaultJSON()
	default:
		return nil, fmt.Errorf("payload kind %q has no new-document template", descriptor.Kind)
	}
	return env, nil
}

// stringPtr 返回字符串指针
func stringPtr(value string) *string {
	return &value
}

/* -----------------------------
 * MagicaCloth2 出厂默认值模板
 * 按 KCES 1.34.4 的 MagicaClothV2 源码逐字段考证：
 * ClothSerializeData 的字段初始化器与各约束 SerializeData 构造函数
 * ----------------------------- */

// mcKeyframe 构造 Unity 序列化关键帧（AnimationCurve.Linear 产物，权重为 0）
func mcKeyframe(time, value, inSlope, outSlope float64) map[string]any {
	return map[string]any{
		"serializedVersion": "3",
		"time":              time,
		"value":             value,
		"inSlope":           inSlope,
		"outSlope":          outSlope,
		"inWeight":          0,
		"outWeight":         0,
		"tangentMode":       0,
		"weightedMode":      0,
	}
}

// mcLinearCurve 构造 AnimationCurve.Linear(0, v0, 1, v1) 的序列化形态
func mcLinearCurve(v0, v1 float64) map[string]any {
	slope := v1 - v0
	return map[string]any{
		"serializedVersion": "2",
		"m_Curve": []any{
			mcKeyframe(0, v0, 0, slope),
			mcKeyframe(1, v1, slope, 0),
		},
		"m_PreInfinity":   2,
		"m_PostInfinity":  2,
		"m_RotationOrder": 4,
	}
}

// mcCurveData 构造 MagicaCloth CurveSerializeData（value + useCurve + Linear 曲线）
func mcCurveData(value, curveStart, curveEnd float64, useCurve bool) map[string]any {
	return map[string]any{
		"value":    value,
		"useCurve": useCurve,
		"curve":    mcLinearCurve(curveStart, curveEnd),
	}
}

// mcSlider 构造 CheckSliderSerializeData
func mcSlider(use bool, value float64) map[string]any {
	return map[string]any{"use": use, "value": value}
}

// mcNullRef 构造空的 Unity 对象引用
func mcNullRef() map[string]any {
	return map[string]any{"instanceID": 0}
}

// buildMagicaClothDefaultJSON 构造 ClothSerializeData 的出厂默认 JSON
// clothType 使用 BoneCloth(1)：KCES 服装布料实际使用的类型（C# 零值 MeshCloth 对 KCES 场景无意义）
func buildMagicaClothDefaultJSON() json.RawMessage {
	document := map[string]any{
		"clothType":               1,
		"sourceRenderers":         []any{},
		"meshWriteMode":           0,
		"paintMode":               0,
		"paintMaps":               []any{},
		"paintMapUvChannel":       0,
		"rootBones":               []any{},
		"connectionMode":          0,
		"rotationalInterpolation": 0.5,
		"rootRotation":            0.5,
		"updateMode":              10, // ClothUpdateMode.AnimatorLinkage
		"animationPoseRatio":      0,
		"reductionSetting":        map[string]any{"simpleDistance": 0, "shapeDistance": 0},
		"customSkinningSetting":   map[string]any{"enable": false, "skinningBones": []any{}},
		"normalAlignmentSetting":  map[string]any{"alignmentMode": 0, "adjustmentTransform": mcNullRef()},
		"cullingSettings": map[string]any{
			"cameraCullingMode":              30, // CameraCullingMode.AnimatorLinkage
			"cameraCullingMethod":            0,  // CameraCullingMethod.AutomaticRenderer
			"cameraCullingRenderers":         []any{},
			"distanceCullingLength":          mcSlider(false, 30),
			"distanceCullingFadeRatio":       0.2,
			"distanceCullingReferenceObject": mcNullRef(),
		},
		"normalAxis":                 1, // ClothNormalAxis.Up
		"gravity":                    5,
		"gravityDirection":           map[string]any{"x": 0, "y": -1, "z": 0},
		"gravityFalloff":             0,
		"stablizationTimeAfterReset": 0.1,
		"blendWeight":                1,
		"damping":                    mcCurveData(0.05, 1, 1, false),
		"radius":                     mcCurveData(0.02, 1, 1, false),
		"inertiaConstraint": map[string]any{
			"anchor":                   mcNullRef(),
			"anchorInertia":            0,
			"worldInertia":             1,
			"movementInertiaSmoothing": 0.4,
			"movementSpeedLimit":       mcSlider(true, 5),
			"rotationSpeedLimit":       mcSlider(true, 720),
			"localInertia":             1,
			"localMovementSpeedLimit":  mcSlider(false, 5),
			"localRotationSpeedLimit":  mcSlider(false, 720),
			"depthInertia":             0,
			"centrifualAcceleration":   0,
			"particleSpeedLimit":       mcSlider(true, 4),
			"teleportMode":             0, // TeleportMode.None
			"teleportDistance":         0.5,
			"teleportRotation":         90,
		},
		"tetherConstraint":          map[string]any{"distanceCompression": 0.4},
		"distanceConstraint":        map[string]any{"stiffness": mcCurveData(1, 1, 0.5, false)},
		"triangleBendingConstraint": map[string]any{"stiffness": 1},
		"angleRestorationConstraint": map[string]any{
			"useAngleRestoration": true,
			"stiffness":           mcCurveData(0.2, 1, 0.2, true),
			"velocityAttenuation": 0.8,
			"gravityFalloff":      0,
		},
		"angleLimitConstraint": map[string]any{
			"useAngleLimit": false,
			"limitAngle":    mcCurveData(60, 0, 1, true),
			"stiffness":     1,
		},
		"motionConstraint": map[string]any{
			"useMaxDistance":   false,
			"maxDistance":      mcCurveData(0.3, 1, 1, false),
			"useBackstop":      false,
			"backstopRadius":   10,
			"backstopDistance": mcCurveData(0, 1, 1, false),
			"stiffness":        1,
		},
		"colliderCollisionConstraint": map[string]any{
			"mode":           1, // Mode.Point
			"friction":       0.05,
			"limitDistance":  mcCurveData(0.05, 1, 1, false),
			"colliderList":   []any{},
			"collisionBones": []any{},
		},
		"selfCollisionConstraint": map[string]any{
			"selfMode":         0, // SelfCollisionMode.None
			"surfaceThickness": mcCurveData(0.005, 0.5, 1, false),
			"syncMode":         0,
			"syncPartner":      mcNullRef(),
			"clothMass":        0,
		},
		"wind": map[string]any{
			"influence":       1,
			"frequency":       1,
			"turbulence":      1,
			"blend":           0.7,
			"synchronization": 0.7,
			"depthWeight":     0,
			"movingWind":      0,
		},
		"springConstraint": map[string]any{
			"useSpring":        true,
			"springPower":      0.04,
			"limitDistance":    0.1,
			"normalLimitRatio": 1,
			"springNoise":      0,
		},
	}
	encoded, err := json.Marshal(document)
	if err != nil {
		// map 构造不可能失败；保底返回空对象
		return json.RawMessage(`{}`)
	}
	return encoded
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
	case "dbconf", "dbcol", "db2conf", "dsbconf", "dsb2conf", "dslconf", "dsl2conf", "dslcol", "limbcol":
		return newPayloadEnvelope("." + formatKey)
	case "ikcol":
		return newPayloadEnvelope(".ikcol")
	case "ikcolbytes":
		return newPayloadEnvelope(".ikcol.bytes")
	// 角色 / Character
	case "sad":
		return &serializationKCES.SavedAttachFile{
			Format:    serializationKCES.KCESSavedAttachFormat,
			Signature: serializationKCES.SavedAttachSignature,
			Version:   serializationKCES.SavedAttachFileVersion,
			Items:     []serializationKCES.SavedAttachData{},
		}, nil
	case "hitcheck":
		return &serializationKCES.HitCheck{
			Signature: serializationKCES.HitCheckSignature,
			Entries:   []serializationKCES.HitCheckEntry{},
		}, nil
	case "maidcollider":
		return &serializationKCES.MaidColliderFile{
			Format:    serializationKCES.MaidColliderFormat,
			Colliders: []serializationKCES.MaidCapsuleCollider{},
		}, nil
	// 数据 / Data
	case "nson":
		return &serializationKCES.KCESJSONText{
			Extension: serializationKCES.KCESNSONExtension,
			JSON:      json.RawMessage(`{}`),
		}, nil
	case "undressdat":
		return &serializationKCES.KCESJSONText{
			Extension: serializationKCES.KCESUndressDataExtension,
			JSON:      json.RawMessage(`{}`),
		}, nil
	case "undresspdat":
		return &serializationKCES.KCESJSONText{
			Extension: serializationKCES.KCESUndressPartsDataExtension,
			JSON:      json.RawMessage(`{}`),
		}, nil
	case "psk":
		return &serializationCOM3D2.Psk{
			Signature: "CM3D21_PSK",
			Version:   24301,
		}, nil
	case "nei":
		// KCES 通过 crc.dll 解码单元格，新表格必须写出 UTF-8，否则游戏把日文读成乱码
		return serializationKCES.NewNei(1, 1, [][]string{{""}}), nil
	default:
		// preset 等 VirtualDirectory 类格式没有有意义的空文档
		return nil, fmt.Errorf("format %q does not support creating a new document", formatKey)
	}
}
