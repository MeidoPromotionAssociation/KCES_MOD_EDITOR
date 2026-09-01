package internal

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/MeidoPromotionAssociation/MeidoSerialization/v2/serialization/KCES/aba"
	COM3D2Service "github.com/MeidoPromotionAssociation/MeidoSerialization/v2/service/COM3D2"
	KCESService "github.com/MeidoPromotionAssociation/MeidoSerialization/v2/service/KCES"
)

/*
Texture2DService 独立 Unity Texture2D 主文件（KCES 贴图）的查看与转换

KCES 的贴图不是 COM3D2 那种 CM3D2_TEX 文件，而是带内嵌 TypeTree 的独立 Unity
Texture2D 对象（ClassID 28）。aba 规范化解包会把它们写成 Texture2D/<名字>.tex，
没有 .tex 名字的则加 .texture2d 后缀，所以扩展名不能作为判据，一律用
IsKCESNativeTexture2DFile 读文件头与 TypeTree 判断 ClassID。

注意 kces_assets 里那种 *.tex.bytes 原始对象转储没有内嵌 TypeTree
（它们是打包透传用的 rawtexture2d），单独拿出来无法解码，本服务不受理。
*/

// maxTexturePreviewBytes 预览图经 base64 传给前端，超过这个大小就报错而不是把 IPC 撑爆
const maxTexturePreviewBytes = 64 << 20

// maxTextureOutputBytes 导出图像与写出贴图的大小上限，与前端 MaxConvertBytes 一致
const maxTextureOutputBytes int64 = 1 << 30

// Texture2DService 提供 KCES Texture2D 的识别、元数据、预览与图像互转
type Texture2DService struct {
	media KCESService.NativeUnityMediaService
	tex   COM3D2Service.TexService
}

// Texture2DInfo 独立 Texture2D 主文件的元数据
type Texture2DInfo struct {
	Name          string `json:"name"`          // Unity 资源名 / Unity asset name
	Width         int32  `json:"width"`         // 宽 / Width
	Height        int32  `json:"height"`        // 高 / Height
	TextureFormat int32  `json:"textureFormat"` // Unity TextureFormat 枚举值 / Unity TextureFormat enum value
	FormatName    string `json:"formatName"`    // TextureFormat 的可读名称 / Readable TextureFormat name
	MipCount      int32  `json:"mipCount"`      // mipmap 层数 / Mipmap count
	InlineBytes   int    `json:"inlineBytes"`   // 内联像素数据大小 / Inline pixel data size
	StreamPath    string `json:"streamPath"`    // 外部 .resS 引用路径，内联时为空 / External .resS path, empty when inline
	StreamBytes   uint64 `json:"streamBytes"`   // 外部引用数据大小 / External payload size
}

// Texture2DPreview 预览用的 base64 图像
type Texture2DPreview struct {
	Mime   string `json:"mime"`   // 图像 MIME 类型 / Image MIME type
	Base64 string `json:"base64"` // base64 编码的图像数据 / Base64-encoded image data
}

/*
textureFormatNames 是 TextureFormat 枚举值 → 名称的显示用映射

aba 里同名函数没有导出，而 MeidoSerialization 是按版本号引用的模块（不是本地 replace），
为了一个展示用标签去改库再发版不值得。这里的键全部引用 aba 导出的常量而不是写死数字，
所以只有名称是重复的，取值不会与库脱节；未收录的取值回落成 #数字
（与 kcesEnums 里未知枚举的显示方式一致）。
*/
var textureFormatNames = map[int32]string{
	aba.TextureFormatAlpha8: "Alpha8",
	aba.TextureFormatRGB24:  "RGB24",
	aba.TextureFormatRGBA32: "RGBA32",
	aba.TextureFormatARGB32: "ARGB32",
	aba.TextureFormatDXT1:   "DXT1",
	aba.TextureFormatDXT5:   "DXT5",
	aba.TextureFormatBGRA32: "BGRA32",
	aba.TextureFormatBC6H:   "BC6H",
	aba.TextureFormatBC7:    "BC7",
	aba.TextureFormatBC4:    "BC4",
	aba.TextureFormatBC5:    "BC5",
	aba.TextureFormatR8:     "R8",
	aba.TextureFormatRGBA64: "RGBA64",
}

// textureFormatLabel 返回 TextureFormat 的展示名称，未知取值回落为 #数字
func textureFormatLabel(format int32) string {
	if name, ok := textureFormatNames[format]; ok {
		return name
	}
	return fmt.Sprintf("#%d", format)
}

// IsTexture2DFile 判断路径是否为带内嵌 TypeTree 的独立 Texture2D 主文件（按内容判断，不看扩展名）
func (s *Texture2DService) IsTexture2DFile(path string) bool {
	return KCESService.IsKCESNativeTexture2DFile(path)
}

// FileExists 判断普通文件是否存在，供「快速导出同名文件」在覆盖前确认
func (s *Texture2DService) FileExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.Mode().IsRegular()
}

// CheckImageMagick 报告是否装有 ImageMagick；PNG 预览与 PNG 导出依赖它，DDS 导出不依赖
func (s *Texture2DService) CheckImageMagick() bool {
	return s.tex.CheckImageMagick()
}

// readTextureData 读取并解码独立 Texture2D 主文件的像素数据
func readTextureData(path string) (*aba.Texture2DData, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read %q: %w", path, err)
	}
	object, err := aba.ReadTexture2D(data)
	if err != nil {
		return nil, fmt.Errorf("read native Texture2D %q: %w", path, err)
	}
	assetsFile, info, err := object.AssetsFileView()
	if err != nil {
		return nil, fmt.Errorf("open native Texture2D %q: %w", path, err)
	}
	// resolver 传 nil：独立主文件的像素数据必须是内联的，指向 .resS 的贴图脱离所属 bundle 无法解析
	texture, err := assetsFile.GetTexture2DDataRange(info, nil)
	if err != nil {
		return nil, fmt.Errorf("decode native Texture2D %q: %w", path, err)
	}
	return texture, nil
}

// ReadTexture2DInfo 读取独立 Texture2D 主文件的元数据
func (s *Texture2DService) ReadTexture2DInfo(path string) (Texture2DInfo, error) {
	texture, err := readTextureData(path)
	if err != nil {
		return Texture2DInfo{}, err
	}
	return Texture2DInfo{
		Name:          texture.Name,
		Width:         texture.Width,
		Height:        texture.Height,
		TextureFormat: texture.TextureFormat,
		FormatName:    textureFormatLabel(texture.TextureFormat),
		MipCount:      texture.MipCount,
		InlineBytes:   len(texture.ImageData),
		StreamPath:    texture.StreamData.Path,
		StreamBytes:   texture.StreamData.Size,
	}, nil
}

// PreviewTexture2D 把独立 Texture2D 主文件转成 PNG 并以 base64 返回，供界面预览（需要 ImageMagick）
func (s *Texture2DService) PreviewTexture2D(path string) (Texture2DPreview, error) {
	texture, err := readTextureData(path)
	if err != nil {
		return Texture2DPreview{}, err
	}
	png, err := aba.TexturePNGBytes(texture)
	if err != nil {
		return Texture2DPreview{}, fmt.Errorf("encode Texture2D %q as PNG: %w", path, err)
	}
	if len(png) > maxTexturePreviewBytes {
		return Texture2DPreview{}, fmt.Errorf("preview PNG needs %d bytes but the limit is %d", len(png), maxTexturePreviewBytes)
	}
	return Texture2DPreview{Mime: "image/png", Base64: base64.StdEncoding.EncodeToString(png)}, nil
}

// PreviewImage 读取普通图像文件并以 base64 返回，用于「图像 → Texture2D」方向的预览
func (s *Texture2DService) PreviewImage(path string) (Texture2DPreview, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return Texture2DPreview{}, fmt.Errorf("read %q: %w", path, err)
	}
	if len(data) > maxTexturePreviewBytes {
		return Texture2DPreview{}, fmt.Errorf("preview image needs %d bytes but the limit is %d", len(data), maxTexturePreviewBytes)
	}
	mime := imageMime(data)
	if mime == "" {
		return Texture2DPreview{}, fmt.Errorf("%q is not a PNG, JPEG, BMP, or GIF image", path)
	}
	return Texture2DPreview{Mime: mime, Base64: base64.StdEncoding.EncodeToString(data)}, nil
}

// imageMime 按文件头签名判断图像类型，无法识别时返回空串
func imageMime(data []byte) string {
	switch {
	case bytes.HasPrefix(data, []byte{0x89, 'P', 'N', 'G', 0x0d, 0x0a, 0x1a, 0x0a}):
		return "image/png"
	case bytes.HasPrefix(data, []byte{0xff, 0xd8, 0xff}):
		return "image/jpeg"
	case bytes.HasPrefix(data, []byte("BM")):
		return "image/bmp"
	case bytes.HasPrefix(data, []byte("GIF8")):
		return "image/gif"
	default:
		return ""
	}
}

// ExportTexture2DImage 把独立 Texture2D 主文件导出为 png 或 dds，不改动源文件
// format 为空时按 outputPath 的扩展名决定
func (s *Texture2DService) ExportTexture2DImage(inputPath string, outputPath string, format string) error {
	return s.media.ConvertTexture2DToImage(context.Background(), inputPath, outputPath, format, maxTextureOutputBytes)
}

/*
ImportImageAsTexture2D 用 PNG/JPEG 图像重建独立 Texture2D 主文件

库的实现是内联单 mip RGBA32，资源名按 outputPath 的文件名推断，
所以写回原路径时资源名保持不变，但原本的压缩格式（DXT5 等）与 mipmap 会丢失。
*/
func (s *Texture2DService) ImportImageAsTexture2D(imagePath string, outputPath string) error {
	return s.media.ConvertImageToTexture2D(context.Background(), imagePath, outputPath, maxTextureOutputBytes)
}

// CopyTexture2DFile 原样复制独立 Texture2D 主文件，用于没有改动时的「另存为」，避免重编码丢掉压缩格式与 mipmap
func (s *Texture2DService) CopyTexture2DFile(sourcePath string, targetPath string) error {
	if !KCESService.IsKCESNativeTexture2DFile(sourcePath) {
		return fmt.Errorf("%q is not a standalone Texture2D file", sourcePath)
	}
	data, err := os.ReadFile(sourcePath)
	if err != nil {
		return fmt.Errorf("read %q: %w", sourcePath, err)
	}
	if int64(len(data)) > maxTextureOutputBytes {
		return fmt.Errorf("Texture2D copy needs %d bytes but the limit is %d", len(data), maxTextureOutputBytes)
	}
	if sameFilePath(sourcePath, targetPath) {
		return nil
	}
	if err := os.WriteFile(targetPath, data, 0644); err != nil {
		return fmt.Errorf("write %q: %w", targetPath, err)
	}
	return nil
}

// sameFilePath 判断两个路径是否指向同一个文件，避免自我复制把源文件截断
func sameFilePath(left string, right string) bool {
	leftAbs, leftErr := filepath.Abs(left)
	rightAbs, rightErr := filepath.Abs(right)
	if leftErr != nil || rightErr != nil {
		return false
	}
	return strings.EqualFold(filepath.Clean(leftAbs), filepath.Clean(rightAbs))
}
