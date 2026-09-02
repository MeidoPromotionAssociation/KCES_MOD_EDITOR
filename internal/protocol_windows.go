//go:build windows

package internal

import "golang.org/x/sys/windows/registry"

// protocolRegistered 查注册表判断一个自定义 URL 协议是否注册过
// 安装器可能写 HKCU（仅当前用户）也可能写 HKLM（所有用户），两处都要查
// protocolRegistered checks the registry for a custom URL protocol registration
// An installer may write to HKCU for the current user or HKLM for all users, so both are checked
func protocolRegistered(scheme string) bool {
	for _, root := range []registry.Key{registry.CURRENT_USER, registry.CLASSES_ROOT} {
		path := `Software\Classes\` + scheme + `\shell\open\command`
		if root == registry.CLASSES_ROOT {
			path = scheme + `\shell\open\command`
		}
		key, err := registry.OpenKey(root, path, registry.QUERY_VALUE)
		if err != nil {
			continue
		}
		command, _, err := key.GetStringValue("")
		key.Close()
		if err == nil && command != "" {
			return true
		}
	}
	return false
}
