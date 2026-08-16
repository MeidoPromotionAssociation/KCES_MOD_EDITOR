package internal

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// structuredFormatSuffixes 每个格式在 testdata 中的样本后缀
var structuredFormatSuffixes = map[string]string{
	"menuassets":     ".menuassets",
	"materialassets": ".materialassets",
	"pmatassets":     ".pmatassets",
	"model":          ".model",
	"dbconf":         ".dbconf",
	"dbcol":          ".dbcol",
	"db2conf":        ".db2conf",
	"dsbconf":        ".dsbconf",
	"dsb2conf":       ".dsb2conf",
	"dslconf":        ".dslconf",
	"dsl2conf":       ".dsl2conf",
	"dslcol":         ".dslcol",
	"ikcol":          ".ikcol",
	"ikcolbytes":     ".ikcol.bytes",
	"limbcol":        ".limbcol",
	"sad":            ".sad",
	"hitcheck":       ".hitcheck",
	"nson":           ".nson",
	"undressdat":     ".undressdat",
	"undresspdat":    ".undresspdat",
	"psk":            ".psk",
	"nei":            ".nei",
}

// findSample 在 testdata 中查找一个具有指定后缀的样本文件
// 样本放在仓库根目录的 testdata/（.gitignore 内），包目录下没有时回退到上一级
func findSample(t *testing.T, suffix string) string {
	t.Helper()
	var found string
	root := "testdata"
	if _, err := os.Stat(root); err != nil {
		root = filepath.Join("..", "testdata")
	}
	if _, err := os.Stat(root); err != nil {
		t.Skipf("testdata not present: %v", err)
	}
	_ = filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil || d.IsDir() || found != "" {
			return err
		}
		if strings.HasSuffix(strings.ToLower(path), suffix) {
			// 跳过库中已知不支持的历史样本
			base := filepath.Base(path)
			if base == "default_accmimi_col.dbcol" || base == "default_yure_col.dbcol" {
				return nil
			}
			found = path
		}
		return nil
	})
	if found == "" {
		t.Skipf("no sample with suffix %s in testdata", suffix)
	}
	return found
}

// TestStructuredRoundTrip 验证编辑器实际使用的 JSON 字符串通道：
// read → JSON 文本 →（前端编辑）→ write 解码写回 → 重读语义一致
func TestStructuredRoundTrip(t *testing.T) {
	formats := NewStructuredFormats()
	workDir := t.TempDir()

	for key, suffix := range structuredFormatSuffixes {
		key, suffix := key, suffix
		t.Run(key, func(t *testing.T) {
			format, ok := formats[key]
			if !ok {
				t.Fatalf("format %q is not registered", key)
			}
			sample := findSample(t, suffix)

			value, err := format.read(sample)
			if err != nil {
				t.Fatalf("read %s: %v", sample, err)
			}
			jsonText, err := json.Marshal(value)
			if err != nil {
				t.Fatalf("marshal: %v", err)
			}

			out := filepath.Join(workDir, "rt_"+filepath.Base(sample))
			// 关闭 ID/GUID 重算：menuassets 缺少 HairMake 导出 GUID 时重算为随机 UUID，无法字节级往返
			if err := format.write(out, jsonText, false); err != nil {
				t.Fatalf("write: %v", err)
			}

			reread, err := format.read(out)
			if err != nil {
				t.Fatalf("re-read written file: %v", err)
			}
			rereadJSON, err := json.Marshal(reread)
			if err != nil {
				t.Fatalf("marshal re-read: %v", err)
			}
			if !bytes.Equal(jsonText, rereadJSON) {
				t.Fatalf("semantic diff after structured roundtrip for %s", sample)
			}
		})
	}
}

// TestStructuredFormatsCoverEditorFormats 确保注册表覆盖前端全部格式 key
func TestStructuredFormatsCoverEditorFormats(t *testing.T) {
	formats := NewStructuredFormats()
	expected := []string{
		"menuassets", "materialassets", "pmatassets", "model",
		"dbconf", "dbcol", "db2conf", "dsbconf", "dsb2conf",
		"dslconf", "dsl2conf", "dslcol", "ikcol", "ikcolbytes", "limbcol",
		"preset", "sad", "hitcheck", "maidcollider",
		"nson", "undressdat", "undresspdat", "psk", "nei",
	}
	for _, key := range expected {
		if _, ok := formats[key]; !ok {
			t.Errorf("format %q missing from structured formats registry", key)
		}
	}
}

// TestNewDocumentRoundTrip 验证每个格式的新建文档模板可以合法写出并重新读取
func TestNewDocumentRoundTrip(t *testing.T) {
	formats := NewStructuredFormats()
	workDir := t.TempDir()

	for key, suffix := range structuredFormatSuffixes {
		key, suffix := key, suffix
		t.Run(key, func(t *testing.T) {
			value, err := newStructuredDocument(key)
			if err != nil {
				t.Fatalf("newStructuredDocument: %v", err)
			}
			jsonText, err := json.Marshal(value)
			if err != nil {
				t.Fatalf("marshal template: %v", err)
			}

			format := formats[key]
			name := "new" + suffix
			if !strings.HasPrefix(suffix, ".") {
				name = suffix
			}
			out := filepath.Join(workDir, name)
			if err := format.write(out, jsonText, true); err != nil {
				t.Fatalf("write new document: %v", err)
			}

			reread, err := format.read(out)
			if err != nil {
				t.Fatalf("re-read new document: %v", err)
			}
			if _, err := json.Marshal(reread); err != nil {
				t.Fatalf("marshal re-read: %v", err)
			}
		})
	}
}

// neiTable 从编辑 JSON 中取出比对所需字段
type neiTable struct {
	Data         [][]string `json:"Data"`
	TextEncoding string     `json:"TextEncoding"`
}

func parseNei(t *testing.T, jsonText []byte) neiTable {
	t.Helper()
	var table neiTable
	if err := json.Unmarshal(jsonText, &table); err != nil {
		t.Fatalf("parse nei JSON: %v", err)
	}
	return table
}

func marshalData(t *testing.T, data [][]string) string {
	t.Helper()
	out, err := json.Marshal(data)
	if err != nil {
		t.Fatalf("marshal data: %v", err)
	}
	return string(out)
}

// TestNeiCsvRoundTrip 验证 .nei 编辑器的明文 CSV 通道：
// nei → 编辑 JSON → 写出 .csv → 读回 .csv → 再写回 .nei，表格数据全程一致
func TestNeiCsvRoundTrip(t *testing.T) {
	format := NewStructuredFormats()["nei"]
	workDir := t.TempDir()
	sample := findSample(t, ".nei")
	name := filepath.Base(sample)

	value, err := format.read(sample)
	if err != nil {
		t.Fatalf("read %s: %v", sample, err)
	}
	neiJSON, err := json.Marshal(value)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	csvPath := filepath.Join(workDir, name+".csv")
	if err := format.write(csvPath, neiJSON, true); err != nil {
		t.Fatalf("write csv: %v", err)
	}
	raw, err := os.ReadFile(csvPath)
	if err != nil {
		t.Fatalf("read written csv: %v", err)
	}
	if !bytes.HasPrefix(raw, []byte{0xef, 0xbb, 0xbf}) {
		t.Errorf("%s: csv missing UTF-8 BOM", name)
	}

	csvValue, err := format.read(csvPath)
	if err != nil {
		t.Fatalf("read csv: %v", err)
	}
	csvJSON, err := json.Marshal(csvValue)
	if err != nil {
		t.Fatalf("marshal csv value: %v", err)
	}

	neiTableValue := parseNei(t, neiJSON)
	csvTableValue := parseNei(t, csvJSON)
	if marshalData(t, csvTableValue.Data) != marshalData(t, neiTableValue.Data) {
		t.Fatalf("%s: nei -> csv data mismatch", name)
	}
	// 从 CSV 读入固定按 UTF-8，与库的 ConvertCSVToNei 一致（KCES 的 crc.dll 按 UTF-8 解码单元格）
	if csvTableValue.TextEncoding != "UTF-8" {
		t.Errorf("%s: csv read encoding = %q, want UTF-8", name, csvTableValue.TextEncoding)
	}

	backPath := filepath.Join(workDir, "back_"+name)
	if err := format.write(backPath, csvJSON, true); err != nil {
		t.Fatalf("write nei from csv: %v", err)
	}
	backValue, err := format.read(backPath)
	if err != nil {
		t.Fatalf("re-read nei: %v", err)
	}
	backJSON, err := json.Marshal(backValue)
	if err != nil {
		t.Fatalf("marshal re-read: %v", err)
	}
	// 纯 ASCII 表格无法从内容区分编码，库按 Shift-JIS 报告，因此只比对数据
	if marshalData(t, parseNei(t, backJSON).Data) != marshalData(t, csvTableValue.Data) {
		t.Fatalf("%s: csv -> nei data mismatch", name)
	}
}

// TestNewNeiDocumentIsUTF8 新建的 .nei 空文档必须是 UTF-8，否则游戏把日文读成乱码
func TestNewNeiDocumentIsUTF8(t *testing.T) {
	value, err := newStructuredDocument("nei")
	if err != nil {
		t.Fatalf("newStructuredDocument: %v", err)
	}
	jsonText, err := json.Marshal(value)
	if err != nil {
		t.Fatalf("marshal template: %v", err)
	}
	if got := parseNei(t, jsonText).TextEncoding; got != "UTF-8" {
		t.Errorf("new .nei encoding = %q, want UTF-8; doc = %s", got, jsonText)
	}
}
