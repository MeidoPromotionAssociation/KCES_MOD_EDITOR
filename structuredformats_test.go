package main

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
func findSample(t *testing.T, suffix string) string {
	t.Helper()
	var found string
	root := "testdata"
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
	formats := newStructuredFormats()
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
			if err := format.write(out, jsonText); err != nil {
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
	formats := newStructuredFormats()
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
	formats := newStructuredFormats()
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
			if err := format.write(out, jsonText); err != nil {
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
