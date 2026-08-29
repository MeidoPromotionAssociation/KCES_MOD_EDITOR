package internal

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

// TestNewUndressPairIsGameLoadable 新建的 .undressdat / .undresspdat 必须能被 KCES2 载入
//
// WearSetuper 在长度检查通过后立刻走 ArchiveTargetFormatter.CheckUpdate → OneGroupLooker.RestoreDictionary
// → PrecomputeTarget.InjectAll，这三处都在 ArchiveTarget.Validate() 补齐 dataGroup 之前运行，
// 因此模板必须自带这些成员，不能是空对象（KCES2 1.36.0 UndressCore/WearSetuper.cs:37-46）
func TestNewUndressPairIsGameLoadable(t *testing.T) {
	formats := NewStructuredFormats()
	workDir := t.TempDir()

	for _, spec := range []struct {
		key    string
		suffix string
	}{
		{"undressdat", ".undressdat"},
		{"undresspdat", ".undresspdat"},
	} {
		t.Run(spec.key, func(t *testing.T) {
			value, err := newStructuredDocument(spec.key)
			if err != nil {
				t.Fatalf("newStructuredDocument: %v", err)
			}
			jsonText, err := json.Marshal(value)
			if err != nil {
				t.Fatalf("marshal: %v", err)
			}
			out := filepath.Join(workDir, "new"+spec.suffix)
			if err := formats[spec.key].write(out, jsonText, true); err != nil {
				t.Fatalf("write: %v", err)
			}
			raw, err := os.ReadFile(out)
			if err != nil {
				t.Fatalf("read written file: %v", err)
			}
			// WearSetuper 对零长度的任一半都直接放弃整套脱衣设置
			if len(raw) == 0 {
				t.Fatal("written file is empty")
			}

			var document map[string]any
			if err := json.Unmarshal(raw, &document); err != nil {
				t.Fatalf("parse written file: %v", err)
			}
			for _, member := range requiredUndressMembers[spec.key] {
				if _, ok := document[member]; !ok {
					t.Errorf("missing member %q", member)
				}
			}
		})
	}
}

// requiredUndressMembers 是载入期在 Validate() 之前就会被解引用的成员，缺失是明确隐患
var requiredUndressMembers = map[string][]string{
	// ArchiveTarget.dataGroup 是唯一没有字段初始化器的列表成员，
	// 而 1.2.0 迁移的 CloneLayer/ClearGroupIndex 无保护地解引用它；format 决定这些迁移是否重放
	"undressdat": {"format", "dataGroup", "layers", "hPeelLimits", "vPeelExInfo", "commonPeelInfo"},
	// OneGroupLooker.RestoreDictionary 直接遍历 Targets
	"undresspdat": {"OneGroupLooker"},
}

// TestNewUndressDatMatchesGameDefaults 模板的限位与形变参数必须等于游戏侧 Make() 的出厂值
// 取值以真实样本交叉核对过：样本未改动这些成员，其 hPeelLimits 与本表逐值一致
func TestNewUndressDatMatchesGameDefaults(t *testing.T) {
	value, err := newStructuredDocument("undressdat")
	if err != nil {
		t.Fatalf("newStructuredDocument: %v", err)
	}
	jsonText, err := json.Marshal(value)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var document struct {
		Format string `json:"format"`
		Layers []any  `json:"layers"`
		Limits struct {
			FormatVersion int32     `json:"format_version"`
			Heads         []float32 `json:"heads"`
			Tails         []float32 `json:"tails"`
			Thrs          []struct {
				Label string  `json:"label"`
				Thr   float32 `json:"thr"`
			} `json:"thrs"`
			HPeelSelectLimits []any `json:"hPeelSelectLimits"`
		} `json:"hPeelLimits"`
		VPeel struct {
			FrontAdjustLength float32 `json:"frontAdjustLength"`
			RetensionWidthPar float32 `json:"retensionWidthPar"`
			VPeelFoldingWidth float32 `json:"vPeelFoldingWidth"`
		} `json:"vPeelExInfo"`
		Common struct {
			FixedPullLength float32 `json:"fixedPullLength"`
		} `json:"commonPeelInfo"`
	}
	if err := json.Unmarshal(jsonText, &document); err != nil {
		t.Fatalf("parse template: %v", err)
	}

	// 当前版本，写旧值会让 CheckUpdate 在 dataGroup 补齐前重放迁移
	if document.Format != "1.2.2" {
		t.Errorf("format = %q, want 1.2.2", document.Format)
	}
	if len(document.Layers) != undressLayerCount {
		t.Errorf("layers = %d, want %d", len(document.Layers), undressLayerCount)
	}
	// PeelLimits.Make() 里 CheckVer 会把 format_version 一路迁到 2
	if document.Limits.FormatVersion != 2 {
		t.Errorf("hPeelLimits.format_version = %d, want 2", document.Limits.FormatVersion)
	}
	if got := document.Limits.Heads; len(got) != 3 || got[0] != 0.15 || got[1] != 0 || got[2] != 0 {
		t.Errorf("heads = %v, want [0.15 0 0]", got)
	}
	if len(document.Limits.Tails) != len(undressDefaultTails) {
		t.Errorf("tails = %d entries, want %d", len(document.Limits.Tails), len(undressDefaultTails))
	}
	// 0→1 生成 6 条，1→2 把 0.15 改写为 -0.85、0 改写为 1
	wantThrs := []struct {
		label string
		thr   float32
	}{
		{"Group_0010", -0.85}, {"Group_0011", -0.85}, {"Group_0012", -0.85},
		{"Group_0013", 1}, {"Group_0014", 1}, {"Group_0015", 1},
	}
	if len(document.Limits.Thrs) != len(wantThrs) {
		t.Fatalf("thrs = %d entries, want %d", len(document.Limits.Thrs), len(wantThrs))
	}
	for i, want := range wantThrs {
		if got := document.Limits.Thrs[i]; got.Label != want.label || got.Thr != want.thr {
			t.Errorf("thrs[%d] = %v, want %s/%v", i, got, want.label, want.thr)
		}
	}
	if len(document.Limits.HPeelSelectLimits) != len(undressDefaultSelectLimits) {
		t.Errorf("hPeelSelectLimits = %d entries, want %d",
			len(document.Limits.HPeelSelectLimits), len(undressDefaultSelectLimits))
	}
	// VPeelExInfo.Make()
	if document.VPeel.FrontAdjustLength != 0.03 || document.VPeel.RetensionWidthPar != 150 || document.VPeel.VPeelFoldingWidth != 20 {
		t.Errorf("vPeelExInfo defaults wrong: %+v", document.VPeel)
	}
	// CommonPeelInfo.Make()
	if document.Common.FixedPullLength != 1 {
		t.Errorf("fixedPullLength = %v, want 1", document.Common.FixedPullLength)
	}
}
