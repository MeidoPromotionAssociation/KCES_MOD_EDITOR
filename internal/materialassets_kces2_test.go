package internal

import (
	"strings"
	"testing"

	serializationKCES "github.com/MeidoPromotionAssociation/MeidoSerialization/v2/serialization/KCES"
)

// TestMaterialAssetsKCES2KeywordPropsRoundTrip 覆盖 .materialassets 的 KCES2 追加字段
// keywordProps（槽 8）与 renderQueue（槽 9）只有 10 槽布局放得下：
// 编辑 JSON 带 indexedArrayWidth: 10 时往返保留，仍是 8 槽时库会拒绝编码
// （编辑器里对应「升级为 KCES2 布局」按钮，把 indexedArrayWidth 改成 10）
func TestMaterialAssetsKCES2KeywordPropsRoundTrip(t *testing.T) {
	format, ok := NewStructuredFormats()["materialassets"]
	if !ok {
		t.Fatal("materialassets 未注册")
	}

	kces2JSON := `{
	  "fileName": "kces2.materialassets",
	  "assetArray": [{
	    "version": 1000,
	    "id": 0,
	    "fileName": "kces2.mate",
	    "shaderName": "CM3D2/Toony_Lighted_Cutout",
	    "textureProps": [],
	    "colorProps": [],
	    "vectorProps": [],
	    "floatProps": [],
	    "keywordProps": [{"type": 305, "value": true}, {"type": 304, "value": false}],
	    "renderQueue": 3002,
	    "indexedArrayWidth": 10
	  }]
	}`

	encoded, err := format.encode("kces2.materialassets", []byte(kces2JSON), false)
	if err != nil {
		t.Fatalf("KCES2 布局编码失败: %v", err)
	}
	decoded, err := serializationKCES.DecodeMaterialAssets(encoded)
	if err != nil {
		t.Fatalf("KCES2 布局解码失败: %v", err)
	}
	if len(decoded.Assets) != 1 {
		t.Fatalf("材质数量 = %d，想要 1", len(decoded.Assets))
	}
	material := decoded.Assets[0]
	if material.IndexedArrayWidth != 10 {
		t.Errorf("线格式宽度 = %d，想要 10", material.IndexedArrayWidth)
	}
	if material.RenderQueue != 3002 {
		t.Errorf("renderQueue = %d，想要 3002", material.RenderQueue)
	}
	if len(material.KeywordProps) != 2 {
		t.Fatalf("keywordProps 条数 = %d，想要 2", len(material.KeywordProps))
	}
	if got := material.KeywordProps[0]; got.Type != 305 || !got.Value {
		t.Errorf("keywordProps[0] = {type:%d value:%t}，想要 {305 true}", got.Type, got.Value)
	}
	if got := material.KeywordProps[1]; got.Type != 304 || got.Value {
		t.Errorf("keywordProps[1] = {type:%d value:%t}，想要 {304 false}", got.Type, got.Value)
	}

	// 仍是 KCES 8 槽布局时这两项没有位置，必须报错而不是悄悄丢掉
	legacyJSON := strings.Replace(kces2JSON, `"indexedArrayWidth": 10`, `"indexedArrayWidth": 8`, 1)
	if _, err := format.encode("legacy.materialassets", []byte(legacyJSON), false); err == nil {
		t.Fatal("8 槽布局写入 keywordProps 竟然编码成功了")
	} else if !strings.Contains(err.Error(), "indexed-array width 8") {
		t.Errorf("8 槽布局的报错信息不含宽度说明: %v", err)
	}
}