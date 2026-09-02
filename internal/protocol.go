package internal

import (
	"net/url"
	"os"
	"path/filepath"
	"strings"
)

// ProtocolScheme 是外部工具唤起本编辑器使用的 URL scheme
// 完整形式为 kces-mod-editor://open?path=<URL 编码的绝对路径>
// ProtocolScheme is the URL scheme external tools use to invoke this editor
// The full form is kces-mod-editor://open?path=<URL-encoded absolute path>
const ProtocolScheme = "kces-mod-editor"

// ProtocolOpenEvent 是收到协议请求后发给前端的事件名
// ProtocolOpenEvent is the event emitted to the frontend after a protocol request
const ProtocolOpenEvent = "editor:protocol-open"

// protocolEditableExtensions 是协议允许打开的扩展名，与前端 utils/consts.ts 的 KCESFormats 对应
// 协议 URL 可以由任意程序甚至网页触发，没有白名单就等于把"打开任意本地文件并显示内容"暴露出去，
// 因此这里只放本编辑器真正有编辑页面的格式
// protocolEditableExtensions lists the extensions the protocol may open, mirroring KCESFormats in utils/consts.ts
// Any program or even a web page can trigger a protocol URL, so without an allow list this would expose
// "open and display an arbitrary local file"; only formats with a real editor page belong here
var protocolEditableExtensions = map[string]struct{}{
	// 服装部件 / Parts
	".menuassets":     {},
	".materialassets": {},
	".pmatassets":     {},
	".model":          {},
	// 物理 / Physics
	".dbconf":      {},
	".dbcol":       {},
	".db2conf":     {},
	".dsbconf":     {},
	".dsb2conf":    {},
	".dslconf":     {},
	".dsl2conf":    {},
	".dslcol":      {},
	".ikcol":       {},
	".ikcol.bytes": {},
	".limbcol":     {},
	// 角色 / Character
	".preset":   {},
	".perset":   {},
	".sad":      {},
	".hitcheck": {},
	// 数据 / Data
	".nson":        {},
	".undressdat":  {},
	".undresspdat": {},
	".psk":         {},
	".nei":         {},
	".csv":         {},
}

// ParseProtocolURL 从一个命令行参数中解出协议请求指向的文件路径
// 不是协议 URL、缺少 path、路径不是允许的扩展名或文件不存在时都返回空字符串
// ParseProtocolURL extracts the file path a protocol request points at from one command-line argument
// It returns an empty string when the argument is not a protocol URL, lacks path, has a disallowed extension, or is missing
func ParseProtocolURL(argument string) string {
	if !strings.HasPrefix(strings.ToLower(argument), ProtocolScheme+":") {
		return ""
	}
	parsed, err := url.Parse(argument)
	if err != nil {
		return ""
	}
	candidate := strings.TrimSpace(parsed.Query().Get("path"))
	if candidate == "" {
		return ""
	}
	if !filepath.IsAbs(candidate) {
		return ""
	}
	if !isProtocolEditableExtension(candidate) {
		return ""
	}
	info, err := os.Stat(candidate)
	if err != nil || !info.Mode().IsRegular() {
		return ""
	}
	return candidate
}

// isProtocolEditableExtension 判断路径的扩展名是否在协议白名单里，复合扩展名如 .ikcol.bytes 优先匹配
// isProtocolEditableExtension reports whether a path's extension is allowed, matching compound extensions such as .ikcol.bytes first
func isProtocolEditableExtension(path string) bool {
	lower := strings.ToLower(filepath.Base(path))
	for extension := range protocolEditableExtensions {
		if strings.HasSuffix(lower, extension) {
			// 复合扩展名要求前面还有文件名，避免把 ".nei" 这种纯扩展名文件当成合法输入
			// A compound extension still needs a stem, so a file named just ".nei" is not accepted
			if len(lower) > len(extension) {
				return true
			}
		}
	}
	return false
}

// ProtocolFileFromArgs 扫描命令行参数并返回第一个有效的协议目标路径
// ProtocolFileFromArgs scans command-line arguments and returns the first valid protocol target
func ProtocolFileFromArgs(args []string) string {
	for _, argument := range args {
		if path := ParseProtocolURL(argument); path != "" {
			return path
		}
	}
	return ""
}

// OpenTargetFromArgs 从一组不含程序名的命令行参数中判断该打开哪个文件
// 先按协议 URL 解析，没有再取第一个看起来是本地路径的参数（文件关联双击走这条）
// OpenTargetFromArgs decides which file a set of command-line arguments asks to open, program name excluded
// Protocol URLs come first, then the first argument that looks like a local path, which is how file-association opens arrive
func OpenTargetFromArgs(args []string) string {
	if path := ProtocolFileFromArgs(args); path != "" {
		return path
	}
	for _, argument := range args {
		if argument == "" || strings.HasPrefix(argument, "-") || strings.Contains(argument, "://") {
			continue
		}
		return argument
	}
	return ""
}

// SecondInstanceTarget 从另一个实例的启动参数里判断该打开哪个文件
// SecondInstanceData.Args 直接来自那个进程的 os.Args，第一个元素是可执行文件自身，必须先去掉：
// 否则文件关联双击唤起时，第一个非选项参数就是 exe 的路径，会被当成用户想打开的文件
// SecondInstanceTarget decides which file another instance's launch arguments ask to open
// SecondInstanceData.Args is that process's os.Args verbatim and its first element is the executable itself,
// which has to be dropped: otherwise on an association double-click the first non-flag argument is the exe path
// and would be taken for the file the user wanted to open
func SecondInstanceTarget(args []string) string {
	if len(args) > 0 {
		args = args[1:]
	}
	return OpenTargetFromArgs(args)
}

// ProtocolStatus 是自定义协议的当前状态，设置页用它说明协议现在能不能用
// ProtocolStatus is the current state of the custom protocol so the settings page can explain whether it works
type ProtocolStatus struct {
	Scheme     string `json:"scheme"`     // 协议名，不含 :// / Scheme name without ://
	Registered bool   `json:"registered"` // 系统上是否注册过 / Whether it is registered on this system
}

// ProtocolStatus 返回协议名与注册状态
// 协议由安装器写入，直接解压的绿色版不会注册，此时外部工具唤起不会有任何反应，需要在设置页说清楚
// ProtocolStatus returns the scheme name and its registration state
// The installer writes the registration, so a portable copy has none and an external invocation would silently
// do nothing, which the settings page has to spell out
func (a *App) ProtocolStatus() ProtocolStatus {
	return ProtocolStatus{Scheme: ProtocolScheme, Registered: protocolRegistered(ProtocolScheme)}
}
