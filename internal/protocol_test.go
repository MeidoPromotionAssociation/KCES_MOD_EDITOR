package internal

import (
	"net/url"
	"os"
	"path/filepath"
	"testing"
)

// protocolURLFor 按协议约定拼出请求某个路径的 URL
// protocolURLFor builds the protocol URL that requests a given path
func protocolURLFor(path string) string {
	return ProtocolScheme + "://open?path=" + url.QueryEscape(path)
}

// TestParseProtocolURLAccepts 检查受支持格式的协议请求能解析出原路径，包含中文与复合扩展名
// TestParseProtocolURLAccepts checks protocol requests for supported formats resolve back to the original path, including CJK names and compound extensions
func TestParseProtocolURLAccepts(t *testing.T) {
	dir := t.TempDir()
	names := []string{
		"parts.menuassets",
		"parts.materialassets",
		"body.model",
		"skirt.dsbconf",
		"hand.ikcol.bytes",
		"girl.preset",
		"table.nei",
		"日本語の部品.menuassets",
	}

	for _, name := range names {
		t.Run(name, func(t *testing.T) {
			path := filepath.Join(dir, name)
			if err := os.WriteFile(path, []byte("payload"), 0644); err != nil {
				t.Fatalf("write sample: %v", err)
			}
			if got := ParseProtocolURL(protocolURLFor(path)); got != path {
				t.Errorf("ParseProtocolURL = %q, want %q", got, path)
			}
		})
	}
}

// TestParseProtocolURLRejects 检查协议不会被用来打开白名单之外的文件
// 协议 URL 可以由任意程序甚至网页触发，这些拒绝分支就是防任意文件读取的边界
// TestParseProtocolURLRejects checks the protocol cannot be used to open files outside the allow list
// Any program or web page can trigger a protocol URL, so these rejections are the arbitrary-read boundary
func TestParseProtocolURLRejects(t *testing.T) {
	dir := t.TempDir()

	existing := filepath.Join(dir, "parts.menuassets")
	if err := os.WriteFile(existing, []byte("payload"), 0644); err != nil {
		t.Fatalf("write sample: %v", err)
	}
	// 白名单外的扩展名，代表系统文件与解包出的原始 Unity 对象
	for _, name := range []string{"secrets.txt", "app.exe", "hive", "asset.bytes", ".nei"} {
		path := filepath.Join(dir, name)
		if err := os.WriteFile(path, []byte("payload"), 0644); err != nil {
			t.Fatalf("write sample %q: %v", name, err)
		}
		if got := ParseProtocolURL(protocolURLFor(path)); got != "" {
			t.Errorf("ParseProtocolURL(%q) = %q, want rejection", name, got)
		}
	}

	cases := map[string]string{
		"wrong scheme":       "https://example.com/open?path=" + url.QueryEscape(existing),
		"no scheme":          existing,
		"missing path":       ProtocolScheme + "://open",
		"empty path":         ProtocolScheme + "://open?path=",
		"relative path":      protocolURLFor("parts.menuassets"),
		"missing file":       protocolURLFor(filepath.Join(dir, "absent.menuassets")),
		"directory":          protocolURLFor(dir),
		"unrelated argument": "--debug",
	}
	for label, argument := range cases {
		if got := ParseProtocolURL(argument); got != "" {
			t.Errorf("%s: ParseProtocolURL = %q, want rejection", label, got)
		}
	}
}

// TestOpenTargetFromArgs 检查协议 URL 优先于普通路径参数，且两种入口都能识别
// TestOpenTargetFromArgs checks protocol URLs take precedence over plain path arguments while both entry points still work
func TestOpenTargetFromArgs(t *testing.T) {
	dir := t.TempDir()
	target := filepath.Join(dir, "parts.menuassets")
	if err := os.WriteFile(target, []byte("payload"), 0644); err != nil {
		t.Fatalf("write sample: %v", err)
	}
	other := filepath.Join(dir, "other.model")
	if err := os.WriteFile(other, []byte("payload"), 0644); err != nil {
		t.Fatalf("write sample: %v", err)
	}

	// 协议唤起：argv 里是 URL，不能被当成普通路径
	if got := OpenTargetFromArgs([]string{protocolURLFor(target)}); got != target {
		t.Errorf("protocol launch = %q, want %q", got, target)
	}
	// 文件关联双击：argv 里就是路径
	if got := OpenTargetFromArgs([]string{other}); got != other {
		t.Errorf("association launch = %q, want %q", got, other)
	}
	// 协议 URL 与普通路径同时出现时以协议为准
	if got := OpenTargetFromArgs([]string{other, protocolURLFor(target)}); got != target {
		t.Errorf("mixed arguments = %q, want %q", got, target)
	}
	// 无效协议 URL 不应让它退化成把 URL 本身当路径
	if got := OpenTargetFromArgs([]string{ProtocolScheme + "://open?path=" + url.QueryEscape(filepath.Join(dir, "nope.exe"))}); got != "" {
		t.Errorf("invalid protocol target = %q, want empty", got)
	}
	if got := OpenTargetFromArgs([]string{"-flag", ""}); got != "" {
		t.Errorf("flags only = %q, want empty", got)
	}
}

// TestSecondInstanceTargetSkipsExecutable 检查单实例转交时不会把 exe 自己的路径当成要打开的文件
// SecondInstanceData.Args 是那个进程完整的 os.Args，第一个元素是可执行文件，漏掉这一步文件关联唤起就会打开 exe
// TestSecondInstanceTargetSkipsExecutable checks a single-instance handover does not take the exe path for the file to open
// SecondInstanceData.Args is that process's full os.Args whose first element is the executable, and missing that
// would make an association invocation open the exe
func TestSecondInstanceTargetSkipsExecutable(t *testing.T) {
	dir := t.TempDir()
	target := filepath.Join(dir, "parts.menuassets")
	if err := os.WriteFile(target, []byte("payload"), 0644); err != nil {
		t.Fatalf("write sample: %v", err)
	}
	executable := filepath.Join(dir, "kces-mod-editor.exe")
	if err := os.WriteFile(executable, []byte("payload"), 0644); err != nil {
		t.Fatalf("write sample: %v", err)
	}

	// 文件关联双击唤起第二个实例
	// An association double-click launching a second instance
	if got := SecondInstanceTarget([]string{executable, target}); got != target {
		t.Errorf("association handover = %q, want %q", got, target)
	}
	// 协议唤起第二个实例
	// A protocol invocation launching a second instance
	if got := SecondInstanceTarget([]string{executable, protocolURLFor(target)}); got != target {
		t.Errorf("protocol handover = %q, want %q", got, target)
	}
	// 直接双击图标启动，没有任何目标
	// Launched by clicking the icon, with no target at all
	if got := SecondInstanceTarget([]string{executable}); got != "" {
		t.Errorf("bare launch = %q, want empty", got)
	}
	if got := SecondInstanceTarget(nil); got != "" {
		t.Errorf("empty arguments = %q, want empty", got)
	}
}

// TestProtocolStatusReportsScheme 检查设置页拿到的协议名与常量一致
// TestProtocolStatusReportsScheme checks the scheme the settings page receives matches the constant
func TestProtocolStatusReportsScheme(t *testing.T) {
	status := (&App{}).ProtocolStatus()
	if status.Scheme != ProtocolScheme {
		t.Errorf("ProtocolStatus().Scheme = %q, want %q", status.Scheme, ProtocolScheme)
	}
}
