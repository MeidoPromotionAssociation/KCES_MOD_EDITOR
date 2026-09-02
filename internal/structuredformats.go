package internal

import (
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"strings"

	serializationKCES "github.com/MeidoPromotionAssociation/MeidoSerialization/v2/serialization/KCES"
	KCESService "github.com/MeidoPromotionAssociation/MeidoSerialization/v2/service/KCES"
	"github.com/MeidoPromotionAssociation/MeidoSerialization/v2/tools"
)

// structuredFormat 一个格式的结构化读写桥接：
// 结构体在 Go 侧与 JSON 文本互转，避免 uint64 等大整数经前端 JSON.parse 丢失精度
type structuredFormat struct {
	read  func(path string) (any, error)
	write func(path string, jsonText []byte, recalculateLookupHash bool) error
	// encode 编辑 JSON → 原生字节，仅提供 ID/GUID 重算选项的格式设置
	// （menuassets/materialassets/model），供大文件直接转换在写出前检查大小
	encode func(path string, jsonText []byte, recalculateLookupHash bool) ([]byte, error)
}

// decodeInto 将编辑 JSON 严格解码到具体结构后执行写入；
// 这些格式没有 ID/GUID 等查找字段，忽略 recalculateLookupHash
func decodeInto[T any](write func(path string, value *T) error) func(string, []byte, bool) error {
	return func(path string, jsonText []byte, _ bool) error {
		var value T
		decoder := json.NewDecoder(strings.NewReader(string(jsonText)))
		decoder.UseNumber()
		if err := decoder.Decode(&value); err != nil {
			return fmt.Errorf("parse editing JSON: %w", err)
		}
		return write(path, &value)
	}
}

// encodeWithLookupOptions 将编辑 JSON 解码后按 ID/GUID 重算选项编码为原生字节。
// 与 MeidoSerialization service 层的写入行为一致：库的 service 写死 RecalculateHash: true，
// 这里改为由调用方决定；fileNameFromPath 的单对象格式（.model）把目标文件名写入选项
func encodeWithLookupOptions[T any](encode func(*T, *serializationKCES.LookupHashOptions) ([]byte, error), fileNameFromPath bool) func(string, []byte, bool) ([]byte, error) {
	return func(path string, jsonText []byte, recalculateLookupHash bool) ([]byte, error) {
		var value T
		decoder := json.NewDecoder(strings.NewReader(string(jsonText)))
		decoder.UseNumber()
		if err := decoder.Decode(&value); err != nil {
			return nil, fmt.Errorf("parse editing JSON: %w", err)
		}
		options := &serializationKCES.LookupHashOptions{RecalculateHash: recalculateLookupHash}
		if fileNameFromPath {
			options.FileName = filepath.Base(path)
		}
		return encode(&value, options)
	}
}

// writeEncoded 把 encode 结果直接写入目标文件
func writeEncoded(encode func(string, []byte, bool) ([]byte, error)) func(string, []byte, bool) error {
	return func(path string, jsonText []byte, recalculateLookupHash bool) error {
		encoded, err := encode(path, jsonText, recalculateLookupHash)
		if err != nil {
			return err
		}
		return os.WriteFile(path, encoded, 0644)
	}
}

// NewStructuredFormats 构建 formatKey → 桥接的注册表
func NewStructuredFormats() map[string]structuredFormat {
	menu := &KCESService.MenuAssetsService{}
	mat := &KCESService.MaterialAssetsService{}
	pmat := &KCESService.PriorityMaterialAssetsService{}
	model := &KCESService.ModelService{}
	dbconf := &KCESService.DBConfService{}
	dsbconf := &KCESService.DSBConfService{}
	dslconf := &KCESService.DSLConfService{}
	db2conf := &KCESService.DB2ConfService{}
	dsb2conf := &KCESService.DSB2ConfService{}
	dsl2conf := &KCESService.DSL2ConfService{}
	dbcol := &KCESService.DBColService{}
	dslcol := &KCESService.DSLColService{}
	preset := &KCESService.PresetService{}
	nson := &KCESService.NSONService{}
	undress := &KCESService.UndressDataService{}
	undressParts := &KCESService.UndressPartsDataService{}
	nei := &KCESService.NeiService{}

	// 三个含名称派生查找字段（ID/GUID）的格式绕过库 service（其写死重算），由编码选项决定是否重算
	menuAssetsEncode := encodeWithLookupOptions(serializationKCES.EncodeMenuAssetsWithOptions, false)
	materialAssetsEncode := encodeWithLookupOptions(serializationKCES.EncodeMaterialAssetsWithOptions, false)
	modelEncode := encodeWithLookupOptions(serializationKCES.EncodeModelWithOptions, true)

	return map[string]structuredFormat{
		// 服装部件 / Parts
		"menuassets": {
			read:   func(p string) (any, error) { return menu.ReadMenuAssetsFile(p) },
			write:  writeEncoded(menuAssetsEncode),
			encode: menuAssetsEncode,
		},
		"materialassets": {
			read:   func(p string) (any, error) { return mat.ReadMaterialAssetsFile(p) },
			write:  writeEncoded(materialAssetsEncode),
			encode: materialAssetsEncode,
		},
		"pmatassets": {
			read:  func(p string) (any, error) { return pmat.ReadPriorityMaterialAssetsFile(p) },
			write: decodeInto(pmat.WritePriorityMaterialAssetsFile),
		},
		"model": {
			read:   func(p string) (any, error) { return model.ReadModelFile(p) },
			write:  writeEncoded(modelEncode),
			encode: modelEncode,
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
		// 角色 / Character
		"preset": {
			read:  func(p string) (any, error) { return preset.ReadPresetFile(p) },
			write: decodeInto(preset.WritePresetFile),
		},
		"nson": {
			read: func(p string) (any, error) { return nson.ReadNSONFile(p) },
			write: func(p string, jsonText []byte, _ bool) error {
				return nson.WriteNSONFile(p, jsonText)
			},
		},
		"undressdat": {
			read:  func(p string) (any, error) { return undress.ReadUndressDataFile(p) },
			write: decodeInto(undress.WriteUndressDataFile),
		},
		"undresspdat": {
			read:  func(p string) (any, error) { return undressParts.ReadUndressPartsDataFile(p) },
			write: decodeInto(undressParts.WriteUndressPartsDataFile),
		},
		"nei": {
			// .nei 就是加密的 CSV，编辑器允许直接打开/另存为明文 .csv
			read: func(p string) (any, error) {
				if isCsvPath(p) {
					return readNeiFromCSV(p)
				}
				return nei.ReadNeiFile(p)
			},
			write: decodeInto(func(p string, value *serializationKCES.Nei) error {
				if isCsvPath(p) {
					return writeNeiAsCSV(p, value)
				}
				return nei.WriteNeiFile(p, value)
			}),
		},
	}
}

// isCsvPath 判断路径是否为明文 CSV
func isCsvPath(path string) bool {
	return strings.HasSuffix(strings.ToLower(path), ".csv")
}

// readNeiFromCSV 读取明文 CSV 并构造 Nei 表格
// 与 MeidoSerialization 的 NeiService.ConvertCSVToNei 行为一致：跳过 UTF-8 BOM、短行补空串对齐到最宽列，
// 并固定使用 UTF-8（KCES 的 crc.dll 按 UTF-8 解码单元格）
func readNeiFromCSV(path string) (*serializationKCES.Nei, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("open CSV file %q: %w", path, err)
	}
	records, readErr := tools.NewCSVReaderSkipUTF8BOM(file, 0).ReadAll()
	closeErr := file.Close()
	if readErr != nil {
		return nil, fmt.Errorf("read CSV file %q: %w", path, readErr)
	}
	if closeErr != nil {
		return nil, fmt.Errorf("close CSV file %q: %w", path, closeErr)
	}
	if uint64(len(records)) > math.MaxUint32 {
		return nil, fmt.Errorf("CSV row count %d exceeds Uint32", uint64(len(records)))
	}
	var maxCols uint32
	for _, record := range records {
		if uint64(len(record)) > math.MaxUint32 {
			return nil, fmt.Errorf("CSV column count %d exceeds Uint32", uint64(len(record)))
		}
		if cols := uint32(len(record)); cols > maxCols {
			maxCols = cols
		}
	}
	data := make([][]string, len(records))
	for index, record := range records {
		row := make([]string, maxCols)
		copy(row, record)
		data[index] = row
	}
	return serializationKCES.NewNei(uint32(len(records)), maxCols, data), nil
}

// writeNeiAsCSV 将表格写出为明文 CSV（带 UTF-8 BOM，与库的 ConvertNeiToCSV 一致）
func writeNeiAsCSV(path string, value *serializationKCES.Nei) error {
	file, err := os.Create(path)
	if err != nil {
		return fmt.Errorf("create CSV file %q: %w", path, err)
	}
	writeErr := tools.WriteCSVWithUTF8BOM(file, value.Data)
	closeErr := file.Close()
	if writeErr != nil {
		return fmt.Errorf("write CSV file %q: %w", path, writeErr)
	}
	if closeErr != nil {
		return fmt.Errorf("close CSV file %q: %w", path, closeErr)
	}
	return nil
}
