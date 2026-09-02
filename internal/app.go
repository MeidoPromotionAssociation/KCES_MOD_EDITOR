package internal

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	COM3D2Service "github.com/MeidoPromotionAssociation/MeidoSerialization/v2/service/COM3D2"
	KCESService "github.com/MeidoPromotionAssociation/MeidoSerialization/v2/service/KCES"
	"github.com/wailsapp/wails/v3/pkg/application"
)

const (
	// GitHubApiURL GitHub API 版本检查 URL
	GitHubApiURL = "https://api.github.com/repos/MeidoPromotionAssociation/KCES_MOD_EDITOR/releases/latest"
	// CurrentVersion 当前应用版本
	CurrentVersion = "v0.0.3"
)

// App 提供应用级功能：文件对话框、版本检查、文件信息、文件类型识别
type App struct {
	app         *application.App
	fileType    *KCESService.FileTypeService
	structured  map[string]structuredFormat
	startupFile string
}

// NewApp 创建 App 服务
func NewApp() *App {
	return &App{
		fileType:    &KCESService.FileTypeService{},
		structured:  NewStructuredFormats(),
		startupFile: commandLineFile(os.Args[1:]),
	}
}

func (a *App) SetApplication(app *application.App) {
	a.app = app
}

// commandLineFile 从命令行参数中提取文件路径（用于文件关联双击与协议唤起）
// commandLineFile extracts a file path from the command line for file-association and protocol opens
func commandLineFile(args []string) string {
	return OpenTargetFromArgs(args)
}

// StartupFile 返回通过文件关联传入的文件路径
func (a *App) StartupFile() string {
	return a.startupFile
}

// SelectFile 选择需要处理的文件，返回用户选择的文件路径，用户取消时返回空字符串且错误为 nil
// filetype 形如 "*.menuassets;*.menuassets.json"
func (a *App) SelectFile(filetype string, fileDisplayName string) (string, error) {
	if a.app == nil {
		return "", errors.New("application is not initialized")
	}
	dialog := a.app.Dialog.OpenFile().
		SetTitle("Choose a file").
		AddFilter(fileDisplayName, filetype)
	path, err := dialog.PromptForSingleSelection()
	if err != nil {
		if strings.Contains(err.Error(), "by user") {
			return "", nil
		}
		return "", fmt.Errorf("open file dialog: %w", err)
	}
	return path, nil
}

// SelectPathToSave 选择一个路径保存文件，返回用户选择的路径，用户取消时返回空字符串且错误为 nil
func (a *App) SelectPathToSave(filetype string, fileDisplayName string) (string, error) {
	return a.SelectPathToSaveAs(filetype, fileDisplayName, "", "")
}

// SelectPathToSaveAs 与 SelectPathToSave 相同，但可以预填保存对话框的目录与文件名
// directory 或 filename 为空时该项不预填
func (a *App) SelectPathToSaveAs(filetype string, fileDisplayName string, directory string, filename string) (string, error) {
	if a.app == nil {
		return "", errors.New("application is not initialized")
	}
	dialog := a.app.Dialog.SaveFileWithOptions(&application.SaveFileDialogOptions{
		Title:     "Save file",
		Directory: directory,
		Filename:  filename,
	})
	dialog.AddFilter(fileDisplayName, filetype)
	path, err := dialog.PromptForSingleSelection()
	if err != nil {
		if strings.Contains(err.Error(), "by user") {
			return "", nil
		}
		return "", fmt.Errorf("open save dialog: %w", err)
	}
	return path, nil
}

// SelectDirectory 选择一个文件夹，返回用户选择的路径，用户取消时返回空字符串且错误为 nil
func (a *App) SelectDirectory(title string) (string, error) {
	if a.app == nil {
		return "", errors.New("application is not initialized")
	}
	if title == "" {
		title = "Choose a directory"
	}
	dialog := a.app.Dialog.OpenFile().
		SetTitle(title).
		CanChooseDirectories(true).
		CanChooseFiles(false)
	path, err := dialog.PromptForSingleSelection()
	if err != nil {
		if strings.Contains(err.Error(), "by user") {
			return "", nil
		}
		return "", fmt.Errorf("open directory dialog: %w", err)
	}
	return path, nil
}

// DetermineFileType 判断 KCES 文件类型；无法识别时 FileType 为 Unknown，前端可按扩展名回退
func (a *App) DetermineFileType(path string) (COM3D2Service.FileInfo, error) {
	info, matched, err := a.fileType.TryFileTypeDetermine(path)
	if err != nil {
		return info, err
	}
	if !matched {
		info.FileType = COM3D2Service.UnknownFileType
	}
	return info, nil
}

// GetFileSize 获取文件大小
func (a *App) GetFileSize(path string) (int64, error) {
	fi, err := os.Stat(path)
	if err != nil {
		return 0, err
	}
	return fi.Size(), nil
}

// maxTextFileBytes 编辑 JSON 文本的大小上限
const maxTextFileBytes int64 = 1 << 30

// ReadTextFile 读取 UTF-8 文本文件（用于编辑 JSON），自动去除 BOM
func (a *App) ReadTextFile(path string) (string, error) {
	fi, err := os.Stat(path)
	if err != nil {
		return "", err
	}
	if !fi.Mode().IsRegular() {
		return "", fmt.Errorf("%q is not a regular file", path)
	}
	if fi.Size() > maxTextFileBytes {
		return "", fmt.Errorf("file size %d exceeds limit %d", fi.Size(), maxTextFileBytes)
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	data = bytes.TrimPrefix(data, []byte{0xef, 0xbb, 0xbf})
	return string(data), nil
}

// WriteTextFile 写入 UTF-8 文本文件（用于编辑 JSON）
func (a *App) WriteTextFile(path string, content string) error {
	return os.WriteFile(path, []byte(content), 0644)
}

// ReadStructuredFile 读取原生文件并以 JSON 文本返回结构化数据。
// 走字符串通道以保留 uint64 等大整数的精度（前端用 lossless 解析）
func (a *App) ReadStructuredFile(formatKey string, path string) (string, error) {
	format, ok := a.structured[formatKey]
	if !ok {
		return "", fmt.Errorf("unknown format %q", formatKey)
	}
	value, err := format.read(path)
	if err != nil {
		return "", err
	}
	data, err := json.Marshal(value)
	if err != nil {
		return "", fmt.Errorf("marshal %s data: %w", formatKey, err)
	}
	return string(data), nil
}

// WriteStructuredFile 将编辑 JSON 文本解码为具体结构并写入原生文件；
// recalculateLookupHash 控制 .menuassets/.materialassets/.model 保存时是否重算 ID/GUID 查找字段，其他格式忽略该参数
func (a *App) WriteStructuredFile(formatKey string, path string, jsonText string, recalculateLookupHash bool) error {
	format, ok := a.structured[formatKey]
	if !ok {
		return fmt.Errorf("unknown format %q", formatKey)
	}
	return format.write(path, []byte(jsonText), recalculateLookupHash)
}

// ConvertStructuredJsonToNative 将磁盘上的编辑 JSON 文件直接转换为原生文件（大文件直接转换用）。
// 仅支持提供 ID/GUID 重算选项的格式（menuassets/materialassets/model），其余格式仍走 MeidoSerialization 的转换服务
func (a *App) ConvertStructuredJsonToNative(formatKey string, inputPath string, outputPath string, maxOutputBytes int64, recalculateLookupHash bool) error {
	format, ok := a.structured[formatKey]
	if !ok {
		return fmt.Errorf("unknown format %q", formatKey)
	}
	if format.encode == nil {
		return fmt.Errorf("format %q does not support conversion with lookup-hash options", formatKey)
	}
	if maxOutputBytes <= 0 {
		return fmt.Errorf("positive conversion output limit is required")
	}
	data, err := os.ReadFile(inputPath)
	if err != nil {
		return fmt.Errorf("read editing JSON %q: %w", inputPath, err)
	}
	data = bytes.TrimPrefix(data, []byte{0xef, 0xbb, 0xbf})
	encoded, err := format.encode(outputPath, data, recalculateLookupHash)
	if err != nil {
		return err
	}
	if int64(len(encoded)) > maxOutputBytes {
		return fmt.Errorf("conversion output needs %d bytes but the limit is %d", len(encoded), maxOutputBytes)
	}
	if err := os.WriteFile(outputPath, encoded, 0644); err != nil {
		return fmt.Errorf("write conversion output %q: %w", outputPath, err)
	}
	return nil
}

// NewStructuredDocument 返回一个格式的合法空文档 JSON 文本，用于新建文件（另存为保存）
func (a *App) NewStructuredDocument(formatKey string) (string, error) {
	value, err := newStructuredDocument(formatKey)
	if err != nil {
		return "", err
	}
	data, err := json.Marshal(value)
	if err != nil {
		return "", fmt.Errorf("marshal new %s document: %w", formatKey, err)
	}
	return string(data), nil
}

// GetAppVersion 获取应用版本
func (a *App) GetAppVersion() string {
	return CurrentVersion
}

// VersionCheckResult 版本检查结果
type VersionCheckResult struct {
	CurrentVersion string
	LatestVersion  string
	IsNewer        bool
}

// CheckLatestVersion 版本检查
func (a *App) CheckLatestVersion() (VersionCheckResult, error) {
	result := VersionCheckResult{CurrentVersion: CurrentVersion}
	latestVersion, err := fetchLatestVersion()
	if err != nil {
		return result, err
	}
	result.LatestVersion = latestVersion
	isNewer, err := a.CompareVersions(CurrentVersion, latestVersion)
	if err != nil {
		return result, err
	}
	result.IsNewer = isNewer
	return result, nil
}

// fetchLatestVersion 从 GitHub 获取最新 release 版本
func fetchLatestVersion() (string, error) {
	client := &http.Client{Timeout: 120 * time.Second}
	resp, err := client.Get(GitHubApiURL)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("GitHub API request failed, status code: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var release struct {
		TagName string `json:"tag_name"`
	}
	if err := json.Unmarshal(body, &release); err != nil {
		return "", err
	}
	return release.TagName, nil
}

// CompareVersions 版本号比较，返回 true 表示 localVersion 小于 latestVersion
func (a *App) CompareVersions(localVersion, latestVersion string) (bool, error) {
	local, err := parseSemver(localVersion)
	if err != nil {
		return false, fmt.Errorf("invalid local version: %w", err)
	}
	remote, err := parseSemver(latestVersion)
	if err != nil {
		return false, fmt.Errorf("invalid remote version: %w", err)
	}
	for i := range 3 {
		if remote[i] != local[i] {
			return remote[i] > local[i], nil
		}
	}
	return false, nil
}

// parseSemver 解析 v1.2.3 形式的版本号为 [major, minor, patch]
func parseSemver(version string) ([3]int, error) {
	var result [3]int
	version = strings.TrimSpace(version)
	version = strings.TrimPrefix(strings.TrimPrefix(version, "v"), "V")
	// 去掉预发布/构建元数据后缀
	if idx := strings.IndexAny(version, "-+"); idx >= 0 {
		version = version[:idx]
	}
	parts := strings.Split(version, ".")
	if len(parts) == 0 || len(parts) > 3 {
		return result, fmt.Errorf("unrecognized version %q", version)
	}
	for i, part := range parts {
		value, err := strconv.Atoi(part)
		if err != nil {
			return result, fmt.Errorf("unrecognized version %q: %w", version, err)
		}
		result[i] = value
	}
	return result, nil
}
