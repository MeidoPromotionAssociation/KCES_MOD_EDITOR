package main

import (
	"encoding/json"
	"strings"
	"testing"

	editingv1 "github.com/MeidoPromotionAssociation/MeidoSerialization/schemas/editing/v1"
	knowledgev1 "github.com/MeidoPromotionAssociation/MeidoSerialization/schemas/knowledge/v1"
)

// TestGetEditingSchemas 验证全部格式的编辑 schema 可加载且为合法 JSON
func TestGetEditingSchemas(t *testing.T) {
	app := NewApp()
	schemas, err := app.GetEditingSchemas("en-US")
	if err != nil {
		t.Fatalf("GetEditingSchemas: %v", err)
	}
	if len(schemas) != len(editingSchemaIDs) {
		t.Fatalf("schema count = %d, want %d", len(schemas), len(editingSchemaIDs))
	}
	for formatKey, schemaText := range schemas {
		var document map[string]any
		if err := json.Unmarshal([]byte(schemaText), &document); err != nil {
			t.Errorf("schema %s is not valid JSON: %v", formatKey, err)
			continue
		}
		if document["$id"] == nil {
			t.Errorf("schema %s has no $id", formatKey)
		}
	}
}

// TestSchemaEnrichmentSkipsGeneratedFields 验证 schema 派生占位说明不会覆盖任何节点的描述
// （占位字段现在也可能带文件级下发的 serialization 认证，必须依生成器文案识别并跳过）
func TestSchemaEnrichmentSkipsGeneratedFields(t *testing.T) {
	app := NewApp()
	schemas, err := app.GetEditingSchemas("zh-CN")
	if err != nil {
		t.Fatalf("GetEditingSchemas: %v", err)
	}
	for formatKey, schemaText := range schemas {
		if strings.Contains(schemaText, generatedFieldGameUsage) {
			t.Errorf("schema %s contains generated boilerplate game usage", formatKey)
		}
		if strings.Contains(schemaText, "Published editing JSON field ") {
			t.Errorf("schema %s contains generated boilerplate description", formatKey)
		}
	}
}

// TestSchemaDocsLocalized 验证悬停文档按语言渲染标题、说明与认证行
func TestSchemaDocsLocalized(t *testing.T) {
	app := NewApp()

	descriptionOf := func(locale, formatKey, pointer string) string {
		t.Helper()
		schemas, err := app.GetEditingSchemas(locale)
		if err != nil {
			t.Fatalf("GetEditingSchemas(%s): %v", locale, err)
		}
		var schema map[string]any
		if err := json.Unmarshal([]byte(schemas[formatKey]), &schema); err != nil {
			t.Fatalf("parse schema %s: %v", formatKey, err)
		}
		node, ok := resolveSchemaPointer(schema, pointer)
		if !ok {
			t.Fatalf("pointer %s not found in schema %s", pointer, formatKey)
		}
		description, _ := node["description"].(string)
		return description
	}

	zh := descriptionOf("zh-CN", "hitcheck", "#/properties/signature")
	for _, want := range []string{"**碰撞检测签名**", "游戏行为：", "编辑建议：", "已认证：序列化、源码语义（AI 审核）"} {
		if !strings.Contains(zh, want) {
			t.Errorf("zh-CN hitcheck signature description missing %q:\n%s", want, zh)
		}
	}

	ja := descriptionOf("ja-JP", "hitcheck", "#/properties/signature")
	if !strings.Contains(ja, "検証済み：シリアライズ、ソースコード意味（AI レビュー）") {
		t.Errorf("ja-JP verification line missing:\n%s", ja)
	}

	ko := descriptionOf("ko-KR", "hitcheck", "#/properties/signature")
	if !strings.Contains(ko, "검증됨: 직렬화, 소스 의미 (AI 검토)") {
		t.Errorf("ko-KR verification line missing:\n%s", ko)
	}

	en := descriptionOf("en-US", "hitcheck", "#/properties/signature")
	if !strings.Contains(en, "Verified: serialization, source semantics (AI-reviewed)") {
		t.Errorf("en-US verification line missing:\n%s", en)
	}

	// 仅 serialization 认证的字段只列一项
	zhJSON := descriptionOf("zh-CN", "dbconf", "#/properties/json")
	if !strings.Contains(zhJSON, "已认证：序列化（AI 审核）") {
		t.Errorf("zh-CN dbconf json verification line missing:\n%s", zhJSON)
	}

	// field_patterns 展开：子列表/嵌套字段经通配路径获得说明
	nested := descriptionOf("zh-CN", "materialassets", "#/$defs/KCES_Material/properties/version")
	for _, want := range []string{"**材质标识**", "已认证：序列化、源码语义（AI 审核）"} {
		if !strings.Contains(nested, want) {
			t.Errorf("zh-CN materialassets nested version description missing %q:\n%s", want, nested)
		}
	}
}

// TestSchemaPatternDocsExpanded 验证 field_patterns 的各语法形态
// （* 数组元素、{a,b,c} 枚举、*KeyFrames 段内通配、经 $ref/anyOf 下钻、additionalProperties、大小写兜底）均展开成功
func TestSchemaPatternDocsExpanded(t *testing.T) {
	app := NewApp()
	schemas, err := app.GetEditingSchemas("zh-CN")
	if err != nil {
		t.Fatalf("GetEditingSchemas: %v", err)
	}
	checks := map[string][]string{
		"menuassets":   {"已编译菜单命令", "菜单标识与元数据"},              // /assetArray/*/commandList/* 与 {…} 枚举
		"dbconf":       {"DynamicBone 关键帧", "DynamicBone 标量状态"}, // *KeyFrames 段内通配
		"psk":          {"裙子参数关键帧", "逐骨骼半径组"},                // /{A,B,C}/* 经 $ref
		"model":        {"骨骼变换条目", "皮肤厚度组", "变形（BlendShape）条目"},
		"dbcol":        {"碰撞体形状参数", "肢体碰撞体启用状态"},
		"ikcol":        {"IK 效应器碰撞体组"},
		"preset":       {"预设子目录版本"}, // additionalProperties + 大小写兜底（version 对 Version）
		"sad":          {"附着标识"},
		"hitcheck":     {"碰撞球几何"},
		"maidcollider": {"胶囊几何"},
		"pmatassets":   {"优先材质覆盖"},
		"dsbconf":      {"布料贝塞尔参数", "布料约束开关"},
	}
	for formatKey, wants := range checks {
		text := schemas[formatKey]
		for _, want := range wants {
			if !strings.Contains(text, want) {
				t.Errorf("%s schema missing pattern doc %q", formatKey, want)
			}
		}
	}
}

// TestSchemaDocTranslationCoverage 验证全部并入悬停文档的 guide 文案在三种语言中均有翻译
// （新库版本引入新文案时该测试会失败，提示补充 schemadocs 翻译表）
func TestSchemaDocTranslationCoverage(t *testing.T) {
	texts := make(map[string]bool)
	for _, schemaID := range editingSchemaIDs {
		document, found, err := editingv1.Lookup(schemaID)
		if err != nil || !found {
			t.Fatalf("lookup %s: %v found=%v", schemaID, err, found)
		}
		guide, err := knowledgev1.Resolve(schemaID, document.ID, document.JSON)
		if err != nil {
			t.Fatalf("resolve %s: %v", schemaID, err)
		}
		var parsedGuide struct {
			Fields        []guideField        `json:"fields"`
			FieldPatterns []guideFieldPattern `json:"field_patterns"`
		}
		if err := json.Unmarshal(guide.JSON, &parsedGuide); err != nil {
			t.Fatalf("parse guide %s: %v", schemaID, err)
		}
		for _, field := range parsedGuide.Fields {
			if field.SchemaPointer == "" || isSchemaDerivedGuideField(field) {
				continue
			}
			for _, text := range []string{field.Title, field.Description, field.GameUsage, field.EditGuidance} {
				if text != "" {
					texts[text] = true
				}
			}
		}
		for _, fieldPattern := range parsedGuide.FieldPatterns {
			field := fieldPattern.asGuideField()
			if fieldPattern.JSONPathPattern == "" || isSchemaDerivedGuideField(field) {
				continue
			}
			for _, text := range []string{field.Title, field.Description, field.GameUsage, field.EditGuidance} {
				if text != "" {
					texts[text] = true
				}
			}
		}
	}
	if len(texts) == 0 {
		t.Fatal("no guide texts collected")
	}

	for _, locale := range []string{"zh-CN", "ja-JP", "ko-KR"} {
		missing := 0
		for text := range texts {
			if translateGuideText(locale, text) == text {
				missing++
				if missing <= 5 {
					t.Errorf("%s missing translation: %q", locale, text)
				}
			}
		}
		if missing > 5 {
			t.Errorf("%s missing %d translations in total", locale, missing)
		}
		t.Logf("%s translated %d/%d", locale, len(texts)-missing, len(texts))
	}
}
