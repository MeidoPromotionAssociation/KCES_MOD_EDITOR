package internal

import (
	"bytes"
	"encoding/base64"
	"image"
	"image/png"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// findNativeTexture2D 在 testdata 中找一个真正的独立 Texture2D 主文件
// 不能只按 .tex 后缀找：testdata 里还有 COM3D2 的 CM3D2_TEX（同样是 .tex），
// 以及打包透传用的 *.tex.bytes 原始转储（没有内嵌 TypeTree），两者都不是本服务的受理对象
func findNativeTexture2D(t *testing.T) string {
	t.Helper()
	service := &Texture2DService{}
	root := "testdata"
	if _, err := os.Stat(root); err != nil {
		root = filepath.Join("..", "testdata")
	}
	if _, err := os.Stat(root); err != nil {
		t.Skipf("testdata not present: %v", err)
	}
	var found string
	_ = filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil || d.IsDir() || found != "" {
			return err
		}
		if !strings.HasSuffix(strings.ToLower(path), ".tex") {
			return nil
		}
		if service.IsTexture2DFile(path) {
			found = path
		}
		return nil
	})
	if found == "" {
		t.Skip("no standalone Texture2D sample in testdata")
	}
	return found
}

// TestTexture2DDetectAndRead 验证按内容识别与元数据读取
func TestTexture2DDetectAndRead(t *testing.T) {
	service := &Texture2DService{}
	path := findNativeTexture2D(t)

	info, err := service.ReadTexture2DInfo(path)
	if err != nil {
		t.Fatalf("ReadTexture2DInfo(%q): %v", path, err)
	}
	if info.Name == "" {
		t.Error("asset name is empty")
	}
	if info.Width <= 0 || info.Height <= 0 {
		t.Errorf("bad size %dx%d", info.Width, info.Height)
	}
	if strings.HasPrefix(info.FormatName, "#") {
		t.Errorf("TextureFormat %d has no display name; the label map is out of sync with the library",
			info.TextureFormat)
	}
	// 独立主文件的像素必须内联，指向 .resS 的贴图脱离所属 bundle 无法解码
	if info.InlineBytes == 0 {
		t.Errorf("no inline pixel data (stream path %q)", info.StreamPath)
	}
	t.Logf("%s: %s %dx%d %s mips=%d inline=%d",
		filepath.Base(path), info.Name, info.Width, info.Height, info.FormatName, info.MipCount, info.InlineBytes)
}

// TestTexture2DRejectsOtherFiles 验证 CM3D2_TEX 与原始对象转储不会被误判成独立 Texture2D
func TestTexture2DRejectsOtherFiles(t *testing.T) {
	service := &Texture2DService{}
	root := "testdata"
	if _, err := os.Stat(root); err != nil {
		root = filepath.Join("..", "testdata")
	}
	if _, err := os.Stat(root); err != nil {
		t.Skipf("testdata not present: %v", err)
	}
	for _, name := range []string{"test.tex", filepath.Join("kces_assets", "cm3d2_megane002.tex.bytes")} {
		path := filepath.Join(root, name)
		if _, err := os.Stat(path); err != nil {
			continue
		}
		if service.IsTexture2DFile(path) {
			t.Errorf("%s should not be detected as a standalone Texture2D", name)
		}
		if _, err := service.ReadTexture2DInfo(path); err == nil {
			t.Errorf("ReadTexture2DInfo(%s) should fail", name)
		}
	}
}

// TestTexture2DExportDDS 验证 DDS 导出（纯 Go，不依赖 ImageMagick）
func TestTexture2DExportDDS(t *testing.T) {
	service := &Texture2DService{}
	path := findNativeTexture2D(t)
	out := filepath.Join(t.TempDir(), "out.dds")

	if err := service.ExportTexture2DImage(path, out, "dds"); err != nil {
		t.Fatalf("ExportTexture2DImage dds: %v", err)
	}
	data, err := os.ReadFile(out)
	if err != nil {
		t.Fatalf("read dds: %v", err)
	}
	if !bytes.HasPrefix(data, []byte("DDS ")) {
		t.Errorf("output is not a DDS file, first bytes: %x", data[:min(8, len(data))])
	}
}

// TestTexture2DPreviewMatchesMetadata 验证 PNG 预览的尺寸与元数据一致（需要 ImageMagick）
func TestTexture2DPreviewMatchesMetadata(t *testing.T) {
	service := &Texture2DService{}
	if !service.CheckImageMagick() {
		t.Skip("ImageMagick not installed; PNG preview and PNG export are unavailable")
	}
	path := findNativeTexture2D(t)

	info, err := service.ReadTexture2DInfo(path)
	if err != nil {
		t.Fatalf("ReadTexture2DInfo: %v", err)
	}
	preview, err := service.PreviewTexture2D(path)
	if err != nil {
		t.Fatalf("PreviewTexture2D: %v", err)
	}
	if preview.Mime != "image/png" {
		t.Errorf("preview mime = %q, want image/png", preview.Mime)
	}
	decoded := decodeBase64PNG(t, preview.Base64)
	bounds := decoded.Bounds()
	if int32(bounds.Dx()) != info.Width || int32(bounds.Dy()) != info.Height {
		t.Errorf("preview is %dx%d but metadata says %dx%d",
			bounds.Dx(), bounds.Dy(), info.Width, info.Height)
	}
}

/*
TestTexture2DImageRoundTrip 验证「贴图 → PNG → 贴图 → PNG」的像素完全一致

第二次重建出的贴图是内联 RGBA32（无损），所以两次导出的 PNG 必须逐像素相同。
行序写错（Unity 贴图自下而上存储）会让第二张图上下翻转，这个断言正是为了守住它。
资源名由输出文件名推断，写到 <原名>.tex 应当与原资源名一致。
*/
func TestTexture2DImageRoundTrip(t *testing.T) {
	service := &Texture2DService{}
	if !service.CheckImageMagick() {
		t.Skip("ImageMagick not installed; PNG export is unavailable")
	}
	path := findNativeTexture2D(t)
	work := t.TempDir()

	original, err := service.ReadTexture2DInfo(path)
	if err != nil {
		t.Fatalf("ReadTexture2DInfo: %v", err)
	}

	firstPNG := filepath.Join(work, "first.png")
	if err := service.ExportTexture2DImage(path, firstPNG, "png"); err != nil {
		t.Fatalf("export first png: %v", err)
	}

	rebuilt := filepath.Join(work, original.Name)
	if !strings.HasSuffix(strings.ToLower(rebuilt), ".tex") {
		rebuilt += ".tex"
	}
	if err := service.ImportImageAsTexture2D(firstPNG, rebuilt); err != nil {
		t.Fatalf("ImportImageAsTexture2D: %v", err)
	}
	if !service.IsTexture2DFile(rebuilt) {
		t.Fatal("rebuilt file is not detected as a standalone Texture2D")
	}

	after, err := service.ReadTexture2DInfo(rebuilt)
	if err != nil {
		t.Fatalf("ReadTexture2DInfo(rebuilt): %v", err)
	}
	if after.Name != original.Name {
		t.Errorf("asset name changed: %q -> %q", original.Name, after.Name)
	}
	if after.Width != original.Width || after.Height != original.Height {
		t.Errorf("size changed: %dx%d -> %dx%d", original.Width, original.Height, after.Width, after.Height)
	}
	if after.FormatName != "RGBA32" {
		t.Errorf("rebuilt format = %s, want RGBA32 (the library inlines a single RGBA32 mip)", after.FormatName)
	}

	secondPNG := filepath.Join(work, "second.png")
	if err := service.ExportTexture2DImage(rebuilt, secondPNG, "png"); err != nil {
		t.Fatalf("export second png: %v", err)
	}
	assertSamePixels(t, firstPNG, secondPNG)
}

// TestTexture2DCopyPreservesBytes 验证无改动另存为是原样复制，且拒绝非 Texture2D 源
func TestTexture2DCopyPreservesBytes(t *testing.T) {
	service := &Texture2DService{}
	path := findNativeTexture2D(t)
	target := filepath.Join(t.TempDir(), "copy.tex")

	if err := service.CopyTexture2DFile(path, target); err != nil {
		t.Fatalf("CopyTexture2DFile: %v", err)
	}
	source, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read source: %v", err)
	}
	copied, err := os.ReadFile(target)
	if err != nil {
		t.Fatalf("read copy: %v", err)
	}
	if !bytes.Equal(source, copied) {
		t.Errorf("copy is not byte-identical: %d vs %d bytes", len(source), len(copied))
	}

	notTexture := filepath.Join(t.TempDir(), "plain.bin")
	if err := os.WriteFile(notTexture, []byte("not a texture"), 0644); err != nil {
		t.Fatalf("write fixture: %v", err)
	}
	if err := service.CopyTexture2DFile(notTexture, filepath.Join(t.TempDir(), "x.tex")); err == nil {
		t.Error("CopyTexture2DFile should refuse a non-Texture2D source")
	}
}

/* ---------------- 辅助 ---------------- */

func decodeBase64PNG(t *testing.T, encoded string) image.Image {
	t.Helper()
	raw, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		t.Fatalf("decode base64 preview: %v", err)
	}
	img, err := png.Decode(bytes.NewReader(raw))
	if err != nil {
		t.Fatalf("decode preview PNG: %v", err)
	}
	return img
}

func assertSamePixels(t *testing.T, leftPath string, rightPath string) {
	t.Helper()
	left := decodePNGFile(t, leftPath)
	right := decodePNGFile(t, rightPath)
	leftBounds := left.Bounds()
	rightBounds := right.Bounds()
	if leftBounds.Dx() != rightBounds.Dx() || leftBounds.Dy() != rightBounds.Dy() {
		t.Fatalf("size mismatch: %dx%d vs %dx%d",
			leftBounds.Dx(), leftBounds.Dy(), rightBounds.Dx(), rightBounds.Dy())
	}
	for y := 0; y < leftBounds.Dy(); y++ {
		for x := 0; x < leftBounds.Dx(); x++ {
			lr, lg, lb, la := left.At(leftBounds.Min.X+x, leftBounds.Min.Y+y).RGBA()
			rr, rg, rb, ra := right.At(rightBounds.Min.X+x, rightBounds.Min.Y+y).RGBA()
			if lr != rr || lg != rg || lb != rb || la != ra {
				t.Fatalf("pixel (%d,%d) differs: (%d,%d,%d,%d) vs (%d,%d,%d,%d)",
					x, y, lr, lg, lb, la, rr, rg, rb, ra)
			}
		}
	}
}

func decodePNGFile(t *testing.T, path string) image.Image {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read %q: %v", path, err)
	}
	img, err := png.Decode(bytes.NewReader(data))
	if err != nil {
		t.Fatalf("decode %q: %v", path, err)
	}
	return img
}
