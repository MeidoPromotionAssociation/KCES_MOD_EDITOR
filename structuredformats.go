package main

import (
	"encoding/json"
	"fmt"
	"strings"

	serializationCOM3D2 "github.com/MeidoPromotionAssociation/MeidoSerialization/serialization/COM3D2"
	serializationKCES "github.com/MeidoPromotionAssociation/MeidoSerialization/serialization/KCES"
	KCESService "github.com/MeidoPromotionAssociation/MeidoSerialization/service/KCES"
)

// structuredFormat 一个格式的结构化读写桥接：
// 结构体在 Go 侧与 JSON 文本互转，避免 uint64 等大整数经前端 JSON.parse 丢失精度
type structuredFormat struct {
	read  func(path string) (any, error)
	write func(path string, jsonText []byte) error
}

// decodeInto 将编辑 JSON 严格解码到具体结构后执行写入
func decodeInto[T any](write func(path string, value *T) error) func(string, []byte) error {
	return func(path string, jsonText []byte) error {
		var value T
		decoder := json.NewDecoder(strings.NewReader(string(jsonText)))
		decoder.UseNumber()
		if err := decoder.Decode(&value); err != nil {
			return fmt.Errorf("parse editing JSON: %w", err)
		}
		return write(path, &value)
	}
}

// newStructuredFormats 构建 formatKey → 桥接的注册表，全部直接调用 MeidoSerialization 的 service 包
func newStructuredFormats() map[string]structuredFormat {
	menu := &KCESService.MenuAssetsService{}
	mat := &KCESService.MaterialAssetsService{}
	pmat := &KCESService.PriorityMaterialAssetsService{}
	model := &KCESService.ModelService{}
	dbconf := &KCESService.DBConfService{}
	dbcol := &KCESService.DBColService{}
	db2conf := &KCESService.DB2ConfService{}
	dsbconf := &KCESService.DSBConfService{}
	dsb2conf := &KCESService.DSB2ConfService{}
	dslconf := &KCESService.DSLConfService{}
	dsl2conf := &KCESService.DSL2ConfService{}
	dslcol := &KCESService.DSLColService{}
	ikcol := &KCESService.IKColService{}
	ikcolBytes := &KCESService.IKColBytesService{}
	limbcol := &KCESService.LimbColService{}
	preset := &KCESService.PresetService{}
	perset := &KCESService.PersetService{}
	sad := &KCESService.SavedAttachService{}
	hitcheck := &KCESService.HitCheckService{}
	maidCollider := &KCESService.MaidColliderService{}
	nson := &KCESService.NSONService{}
	undress := &KCESService.UndressDataService{}
	undressParts := &KCESService.UndressPartsDataService{}
	psk := &KCESService.PskService{}
	nei := &KCESService.NeiService{}

	isPerset := func(path string) bool {
		lower := strings.ToLower(path)
		lower = strings.TrimSuffix(lower, ".json")
		return strings.HasSuffix(lower, serializationKCES.KCESPersetExtension)
	}

	return map[string]structuredFormat{
		// 服装部件 / Parts
		"menuassets": {
			read:  func(p string) (any, error) { return menu.ReadMenuAssetsFile(p) },
			write: decodeInto(menu.WriteMenuAssetsFile),
		},
		"materialassets": {
			read:  func(p string) (any, error) { return mat.ReadMaterialAssetsFile(p) },
			write: decodeInto(mat.WriteMaterialAssetsFile),
		},
		"pmatassets": {
			read:  func(p string) (any, error) { return pmat.ReadPriorityMaterialAssetsFile(p) },
			write: decodeInto(pmat.WritePriorityMaterialAssetsFile),
		},
		"model": {
			read:  func(p string) (any, error) { return model.ReadModelFile(p) },
			write: decodeInto(model.WriteModelFile),
		},
		// 物理 / Physics
		"dbconf": {
			read:  func(p string) (any, error) { return dbconf.ReadDBConfFile(p) },
			write: decodeInto(dbconf.WriteDBConfFile),
		},
		"dbcol": {
			read:  func(p string) (any, error) { return dbcol.ReadDBColFile(p) },
			write: decodeInto(dbcol.WriteDBColFile),
		},
		"db2conf": {
			read:  func(p string) (any, error) { return db2conf.ReadDB2ConfFile(p) },
			write: decodeInto(db2conf.WriteDB2ConfFile),
		},
		"dsbconf": {
			read:  func(p string) (any, error) { return dsbconf.ReadDSBConfFile(p) },
			write: decodeInto(dsbconf.WriteDSBConfFile),
		},
		"dsb2conf": {
			read:  func(p string) (any, error) { return dsb2conf.ReadDSB2ConfFile(p) },
			write: decodeInto(dsb2conf.WriteDSB2ConfFile),
		},
		"dslconf": {
			read:  func(p string) (any, error) { return dslconf.ReadDSLConfFile(p) },
			write: decodeInto(dslconf.WriteDSLConfFile),
		},
		"dsl2conf": {
			read:  func(p string) (any, error) { return dsl2conf.ReadDSL2ConfFile(p) },
			write: decodeInto(dsl2conf.WriteDSL2ConfFile),
		},
		"dslcol": {
			read:  func(p string) (any, error) { return dslcol.ReadDSLColFile(p) },
			write: decodeInto(dslcol.WriteDSLColFile),
		},
		"ikcol": {
			read:  func(p string) (any, error) { return ikcol.ReadIKColFile(p) },
			write: decodeInto(ikcol.WriteIKColFile),
		},
		"ikcolbytes": {
			read:  func(p string) (any, error) { return ikcolBytes.ReadIKColBytesFile(p) },
			write: decodeInto(ikcolBytes.WriteIKColBytesFile),
		},
		"limbcol": {
			read:  func(p string) (any, error) { return limbcol.ReadLimbColFile(p) },
			write: decodeInto(limbcol.WriteLimbColFile),
		},
		// 角色 / Character
		"preset": {
			read: func(p string) (any, error) {
				if isPerset(p) {
					return perset.ReadPersetFile(p)
				}
				return preset.ReadPresetFile(p)
			},
			write: func(p string, jsonText []byte) error {
				if isPerset(p) {
					return decodeInto(perset.WritePersetFile)(p, jsonText)
				}
				return decodeInto(preset.WritePresetFile)(p, jsonText)
			},
		},
		"sad": {
			read:  func(p string) (any, error) { return sad.ReadSavedAttachFile(p) },
			write: decodeInto(sad.WriteSavedAttachFile),
		},
		"hitcheck": {
			read:  func(p string) (any, error) { return hitcheck.ReadHitCheckFile(p) },
			write: decodeInto(hitcheck.WriteHitCheckFile),
		},
		"maidcollider": {
			read:  func(p string) (any, error) { return maidCollider.ReadMaidColliderFile(p) },
			write: decodeInto(maidCollider.WriteMaidColliderFile),
		},
		// 数据 / Data
		"nson": {
			read:  func(p string) (any, error) { return nson.ReadNSONFile(p) },
			write: decodeInto(nson.WriteNSONFile),
		},
		"undressdat": {
			read:  func(p string) (any, error) { return undress.ReadUndressDataFile(p) },
			write: decodeInto(undress.WriteUndressDataFile),
		},
		"undresspdat": {
			read:  func(p string) (any, error) { return undressParts.ReadUndressPartsDataFile(p) },
			write: decodeInto(undressParts.WriteUndressPartsDataFile),
		},
		"psk": {
			read:  func(p string) (any, error) { return psk.ReadPskFile(p) },
			write: decodeInto(psk.WritePskFile),
		},
		"nei": {
			read:  func(p string) (any, error) { return nei.ReadNeiFile(p) },
			write: decodeInto(nei.WriteNeiFile),
		},
	}
}

// 确保引用不被裁剪（COM3D2 结构用于 psk/nei 泛型实例化推导）
var _ = serializationCOM3D2.Psk{}
