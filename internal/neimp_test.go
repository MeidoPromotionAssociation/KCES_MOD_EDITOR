package internal

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// neimpSampleJSON 覆盖值树的常见类型：整数映射键、单精度浮点、超出 float64 精确范围的整数、
// 嵌套数组、中文文本、二进制与扩展类型
const neimpSampleJSON = `{"1":{"name":"テスト","ratio":0.1,"big":18446744073709551615,` +
	`"flags":[true,false,null],"raw":{"$bin":"AQID"},"ext":{"$ext":{"type":5,"data":"BQ=="}}}}`

// TestNeimpRoundTrip 验证 .neimp 的编辑 JSON 与原生文件能无损往返：
// 整数映射键、float32 宽度与大整数都必须原样保留（普通 JSON 解码会把这些类型全丢掉）
func TestNeimpRoundTrip(t *testing.T) {
	format, ok := NewStructuredFormats()["neimp"]
	if !ok {
		t.Fatal("neimp format is not registered")
	}
	workDir := t.TempDir()
	nativePath := filepath.Join(workDir, "sample.neimp")

	if err := format.write(nativePath, []byte(neimpSampleJSON), false); err != nil {
		t.Fatalf("write: %v", err)
	}

	value, err := format.read(nativePath)
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	jsonText, err := json.Marshal(value)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	for _, want := range []string{`"ratio":0.1`, `"big":18446744073709551615`, `"1":`} {
		if !strings.Contains(string(jsonText), want) {
			t.Errorf("editing JSON lost %s:\n%s", want, jsonText)
		}
	}

	// 编辑 JSON 写回后重读，JSON 必须一字不差：float32 被加宽成 float64 会改变 0.1 的写法，
	// 整数键被写成字符串键会改变 "1" 的写法，两者都会在这里暴露
	rewrittenPath := filepath.Join(workDir, "rewritten.neimp")
	if err := format.write(rewrittenPath, jsonText, false); err != nil {
		t.Fatalf("rewrite: %v", err)
	}
	reread, err := format.read(rewrittenPath)
	if err != nil {
		t.Fatalf("reread: %v", err)
	}
	rereadJSON, err := json.Marshal(reread)
	if err != nil {
		t.Fatalf("marshal reread: %v", err)
	}
	if !bytes.Equal(jsonText, rereadJSON) {
		t.Errorf("editing JSON changed after one round trip:\n%s\n%s", jsonText, rereadJSON)
	}
}

// neimpCsvDataJSON 是游戏侧 CsvData<T> 真实的序列化形态（取自 CRC3D3 的
// clubselection_data.neimp）：`[版本, {行键: 行数组}]`。
// MessagePack-CSharp 的 [Key(n)] 按位置序列化成数组，所以行不是对象而是数组，
// 也没有字段名 —— 前端表格视图的「行 = 字典成员、列 = 数组下标」正建立在这个形态上。
const neimpCsvDataJSON = `[1000,{"0":[0,0,"main_banner","CasualRomanceClub",20000,"説明"],` +
	`"10":[0,10,"banner2","Club B",9,"説明2"]}]`

// TestNeimpCsvDataShapeRoundTrip 验证表格视图依赖的形态原样保留：
// 版本留在容器第 0 项，行映射在第 1 项，行体仍是数组而不是对象
func TestNeimpCsvDataShapeRoundTrip(t *testing.T) {
	format, ok := NewStructuredFormats()["neimp"]
	if !ok {
		t.Fatal("neimp format is not registered")
	}
	nativePath := filepath.Join(t.TempDir(), "clubselection_data.neimp")
	if err := format.write(nativePath, []byte(neimpCsvDataJSON), false); err != nil {
		t.Fatalf("write: %v", err)
	}
	value, err := format.read(nativePath)
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	jsonText, err := json.Marshal(value)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	if string(jsonText) != neimpCsvDataJSON {
		t.Fatalf("CsvData shape changed:\n got %s\nwant %s", jsonText, neimpCsvDataJSON)
	}
}

// TestNeimpNewDocument 验证新建的 .neimp 是合法的空值树，且能被编辑器读回
func TestNeimpNewDocument(t *testing.T) {
	format, ok := NewStructuredFormats()["neimp"]
	if !ok {
		t.Fatal("neimp format is not registered")
	}
	value, err := newStructuredDocument("neimp")
	if err != nil {
		t.Fatalf("newStructuredDocument: %v", err)
	}
	jsonText, err := json.Marshal(value)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	if string(jsonText) != "{}" {
		t.Fatalf("new document = %s, want {}", jsonText)
	}

	path := filepath.Join(t.TempDir(), "new.neimp")
	if err := format.write(path, jsonText, false); err != nil {
		t.Fatalf("write: %v", err)
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read written file: %v", err)
	}
	// 空映射编码为 MessagePack 的 fixmap 0x80，短于 64 字节因此不压缩
	if !bytes.Equal(raw, []byte{0x80}) {
		t.Fatalf("empty .neimp = % x, want 80", raw)
	}

	readBack, err := format.read(path)
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	readJSON, err := json.Marshal(readBack)
	if err != nil {
		t.Fatalf("marshal read back: %v", err)
	}
	if string(readJSON) != "{}" {
		t.Fatalf("read back = %s, want {}", readJSON)
	}
}

// TestDetermineNeimpFileType 验证 .neimp 由 CRC3D3 的探测认领（KCES 的探测不认识它）
func TestDetermineNeimpFileType(t *testing.T) {
	format := NewStructuredFormats()["neimp"]
	path := filepath.Join(t.TempDir(), "sample.neimp")
	if err := format.write(path, []byte(neimpSampleJSON), false); err != nil {
		t.Fatalf("write: %v", err)
	}

	info, err := NewApp().DetermineFileType(path)
	if err != nil {
		t.Fatalf("DetermineFileType: %v", err)
	}
	if info.FileType != "neimp" {
		t.Errorf("FileType = %q, want neimp", info.FileType)
	}
	if info.Game != "CRC3D3" {
		t.Errorf("Game = %q, want CRC3D3", info.Game)
	}
}
