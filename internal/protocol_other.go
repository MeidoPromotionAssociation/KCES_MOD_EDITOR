//go:build !windows

package internal

// protocolRegistered 在非 Windows 平台无法可靠查询协议注册情况
// macOS 由 Launch Services 数据库管理、Linux 由 .desktop 文件管理，都没有便宜可靠的查询方式，
// 因此一律报告已注册，把结果交给系统的 URL 打开流程
// protocolRegistered cannot reliably query protocol registration outside Windows
// macOS keeps it in the Launch Services database and Linux in .desktop files, neither cheap nor reliable to query,
// so it always reports registered and lets the system URL handler decide
func protocolRegistered(scheme string) bool {
	_ = scheme
	return true
}
