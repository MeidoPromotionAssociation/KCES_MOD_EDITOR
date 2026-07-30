package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"path"
	"regexp"
	"strconv"
	"strings"

	editingv1 "github.com/MeidoPromotionAssociation/MeidoSerialization/schemas/editing/v1"
	knowledgev1 "github.com/MeidoPromotionAssociation/MeidoSerialization/schemas/knowledge/v1"
)

//go:embed schemadocs/*.json
var schemaDocFiles embed.FS

// schemaDocTranslations 按语言缓存的字段说明翻译表（英文原文 → 译文）
var schemaDocTranslations = loadSchemaDocTranslations()

func loadSchemaDocTranslations() map[string]map[string]string {
	result := make(map[string]map[string]string)
	for _, locale := range []string{"zh-CN", "ja-JP", "ko-KR"} {
		data, err := schemaDocFiles.ReadFile("schemadocs/schemadoc." + locale + ".json")
		if err != nil {
			continue
		}
		table := make(map[string]string)
		if err := json.Unmarshal(data, &table); err != nil {
			continue
		}
		result[locale] = table
	}
	return result
}

// schemaDocTemplate 参数化模板句（payload 系文案的 11 个扩展名变体等共用一条规则）
type schemaDocTemplate struct {
	pattern  *regexp.Regexp
	byLocale map[string]string // 目标语言格式串，%s 为参数
}

var schemaDocTemplates = []schemaDocTemplate{
	{
		pattern: regexp.MustCompile(`^Keep the exact extension (\S+)\.$`),
		byLocale: map[string]string{
			"zh-CN": "保持扩展名 %s 不变。",
			"ja-JP": "拡張子 %s を維持してください。",
			"ko-KR": "확장자 %s를 유지하세요.",
		},
	},
	{
		pattern: regexp.MustCompile(`^Keep the exact value (\S+)\.$`),
		byLocale: map[string]string{
			"zh-CN": "保持值 %s 不变。",
			"ja-JP": "値 %s を維持してください。",
			"ko-KR": "값 %s를 유지하세요.",
		},
	},
	{
		pattern: regexp.MustCompile(`^A typed union alternative not selected by the (\S+) descriptor\.$`),
		byLocale: map[string]string{
			"zh-CN": "未被 %s 描述符选中的 union 分支。",
			"ja-JP": "%s 記述子に選択されていない union 分岐。",
			"ko-KR": "%s 기술자가 선택하지 않은 union 분기.",
		},
	},
	{
		pattern: regexp.MustCompile(`^Inactive union field (\S+)$`),
		byLocale: map[string]string{
			"zh-CN": "未激活的 union 字段 %s",
			"ja-JP": "非アクティブな union フィールド %s",
			"ko-KR": "비활성 union 필드 %s",
		},
	},
	{
		pattern: regexp.MustCompile(`^The fixed extension marker (\S+)\.$`),
		byLocale: map[string]string{
			"zh-CN": "固定的扩展名标记 %s。",
			"ja-JP": "固定の拡張子マーカー %s。",
			"ko-KR": "고정 확장자 마커 %s.",
		},
	},
	{
		pattern: regexp.MustCompile(`^Use (\S+) for the native (\S+) contract; do not populate a different typed root\.$`),
		byLocale: map[string]string{
			"zh-CN": "原生 %[2]s 契约必须使用 %[1]s；不要填充其它类型的根对象。",
			"ja-JP": "ネイティブ %[2]s 契約には %[1]s を使用してください。異なる型付きルートを設定しないでください。",
			"ko-KR": "네이티브 %[2]s 계약에는 %[1]s를 사용하세요. 다른 타입 루트를 채우지 마세요.",
		},
	},
}

// translateGuideText 将 guide 文案翻译到目标语言：先查词条表，再试模板句，未命中回退英文
func translateGuideText(locale, text string) string {
	if text == "" || locale == "" || strings.HasPrefix(locale, "en") {
		return text
	}
	table, ok := schemaDocTranslations[locale]
	if !ok {
		return text
	}
	if translated, ok := table[text]; ok {
		return translated
	}
	for _, template := range schemaDocTemplates {
		format, ok := template.byLocale[locale]
		if !ok {
			continue
		}
		match := template.pattern.FindStringSubmatch(text)
		if match == nil {
			continue
		}
		args := make([]any, len(match)-1)
		for i, value := range match[1:] {
			args[i] = value
		}
		return fmt.Sprintf(format, args...)
	}
	return text
}

// schemaDocLabels 悬停文档的标签本地化
var schemaDocLabels = map[string]map[string]string{
	"zh-CN": {
		"game_usage":             "游戏行为：",
		"editing":                "编辑建议：",
		"risk":                   "风险：",
		"verification":           "已认证：",
		"claim_serialization":    "序列化",
		"claim_source_semantics": "源码语义",
		"claim_game_behavior":    "游戏实测行为",
		"authority_ai":           "AI 审核",
		"authority_human":        "人工审核",
		"claim_separator":        "、",
		"authority_format":       "（%s）",
		"critical":               "严重 (critical)",
		"high":                   "高 (high)",
		"medium":                 "中 (medium)",
		"low":                    "低 (low)",
	},
	"ja-JP": {
		"game_usage":             "ゲーム動作：",
		"editing":                "編集ガイド：",
		"risk":                   "リスク：",
		"verification":           "検証済み：",
		"claim_serialization":    "シリアライズ",
		"claim_source_semantics": "ソースコード意味",
		"claim_game_behavior":    "実機動作",
		"authority_ai":           "AI レビュー",
		"authority_human":        "人手レビュー",
		"claim_separator":        "、",
		"authority_format":       "（%s）",
		"critical":               "致命的 (critical)",
		"high":                   "高 (high)",
		"medium":                 "中 (medium)",
		"low":                    "低 (low)",
	},
	"ko-KR": {
		"game_usage":             "게임 동작: ",
		"editing":                "편집 가이드: ",
		"risk":                   "위험도: ",
		"verification":           "검증됨: ",
		"claim_serialization":    "직렬화",
		"claim_source_semantics": "소스 의미",
		"claim_game_behavior":    "실제 게임 동작",
		"authority_ai":           "AI 검토",
		"authority_human":        "수동 검토",
		"claim_separator":        ", ",
		"authority_format":       " (%s)",
		"critical":               "치명적 (critical)",
		"high":                   "높음 (high)",
		"medium":                 "중간 (medium)",
		"low":                    "낮음 (low)",
	},
	"en-US": {
		"game_usage":             "Game usage: ",
		"editing":                "Editing: ",
		"risk":                   "Risk: ",
		"verification":           "Verified: ",
		"claim_serialization":    "serialization",
		"claim_source_semantics": "source semantics",
		"claim_game_behavior":    "in-game behavior",
		"authority_ai":           "AI-reviewed",
		"authority_human":        "human-reviewed",
		"claim_separator":        ", ",
		"authority_format":       " (%s)",
		"critical":               "critical",
		"high":                   "high",
		"medium":                 "medium",
		"low":                    "low",
	},
}

// schemaDocLabel 取标签文案，未知语言回退英文
func schemaDocLabel(locale, key string) string {
	if table, ok := schemaDocLabels[locale]; ok {
		if value, ok := table[key]; ok {
			return value
		}
	}
	if value, ok := schemaDocLabels["en-US"][key]; ok {
		return value
	}
	return key
}

// editingSchemaIDs 编辑器 formatKey → 库 editing schema 的格式标识
// nei 没有对应 schema；psk 使用 COM3D2 共用格式的 schema
var editingSchemaIDs = map[string]string{
	"menuassets":     "kces.menuassets",
	"materialassets": "kces.materialassets",
	"pmatassets":     "kces.pmatassets",
	"model":          "kces.model",
	"dbconf":         "kces.dbconf",
	"dbcol":          "kces.dbcol",
	"db2conf":        "kces.db2conf",
	"dsbconf":        "kces.dsbconf",
	"dsb2conf":       "kces.dsb2conf",
	"dslconf":        "kces.dslconf",
	"dsl2conf":       "kces.dsl2conf",
	"dslcol":         "kces.dslcol",
	"ikcol":          "kces.ikcol",
	"ikcolbytes":     "kces.ikcol.bytes",
	"limbcol":        "kces.limbcol",
	"preset":         "kces.preset",
	"sad":            "kces.sad",
	"hitcheck":       "kces.hitcheck",
	"maidcollider":   "kces.maid_collider",
	"nson":           "kces.nson",
	"undressdat":     "kces.undressdat",
	"undresspdat":    "kces.undresspdat",
	"psk":            "com3d2.psk",
}

// GetEditingSchemas 返回全部格式的编辑 JSON Schema 文本（formatKey → schema JSON），
// 供前端注册到 Monaco 以获得结构校验、补全与悬停提示。
// schema 会与 knowledge guide 的字段说明合并（写入各节点 description），
// 文案按 locale 翻译（zh-CN/ja-JP/ko-KR，未命中回退英文），
// 并附带认证状态（序列化/源码语义/游戏实测三项独立认证及 AI/人工审核主体）
func (a *App) GetEditingSchemas(locale string) (map[string]string, error) {
	result := make(map[string]string, len(editingSchemaIDs))
	for formatKey, schemaID := range editingSchemaIDs {
		document, found, err := editingv1.Lookup(schemaID)
		if err != nil {
			return nil, fmt.Errorf("load editing schema %s: %w", schemaID, err)
		}
		if !found {
			return nil, fmt.Errorf("editing schema %s not found", schemaID)
		}
		result[formatKey] = string(enrichSchemaWithGuide(locale, schemaID, document))
	}
	return result, nil
}

// guideVerificationClaim 是 knowledge guide 中一项独立认证（status 目前只有 verified，authority 为 ai/human）
type guideVerificationClaim struct {
	Status    string `json:"status"`
	Authority string `json:"authority"`
}

// guideFieldVerification 分别记录字段的序列化、源码语义与游戏实测三项独立认证；
// 空对象（三项均缺失）是库定义的"仅由 schema 派生"
type guideFieldVerification struct {
	Serialization   *guideVerificationClaim `json:"serialization"`
	SourceSemantics *guideVerificationClaim `json:"source_semantics"`
	GameBehavior    *guideVerificationClaim `json:"game_behavior"`
}

// guideField 是 knowledge guide 中带 schema 指针的字段说明
type guideField struct {
	SchemaPointer string                 `json:"schema_pointer"`
	Title         string                 `json:"title"`
	Description   string                 `json:"description"`
	GameUsage     string                 `json:"game_usage"`
	EditGuidance  string                 `json:"edit_guidance"`
	Risk          string                 `json:"risk"`
	Verification  guideFieldVerification `json:"verification"`
}

// generatedFieldGameUsage 是库为纯 schema 派生占位字段生成的固定 game_usage 文案（profile 手写字段不会使用）
const generatedFieldGameUsage = "Only the schema shape is known; serialization and game-runtime behavior have no field verification claim."

// isSchemaDerivedGuideField 判断字段是否为库按 schema 结构生成的占位说明（无审核语义，不并入悬停文档）。
// 认证为空对象是库定义的"仅由 schema 派生"；文件级 serialization 认证下发后，
// 占位字段也会带上 serialization claim，此时依生成器的固定 game_usage 文案识别
func isSchemaDerivedGuideField(field guideField) bool {
	if field.GameUsage == generatedFieldGameUsage {
		return true
	}
	verification := field.Verification
	return verification.Serialization == nil && verification.SourceSemantics == nil && verification.GameBehavior == nil
}

// guideFieldPattern 是 knowledge guide 中描述一组动态 JSON 路径的字段模式，
// 路径段语法：字面量、{a,b,c} 属性名枚举、含 * 的通配（数组元素/字典成员/属性名前后缀匹配）
type guideFieldPattern struct {
	JSONPathPattern string                 `json:"json_path_pattern"`
	Title           string                 `json:"title"`
	Description     string                 `json:"description"`
	GameUsage       string                 `json:"game_usage"`
	EditGuidance    string                 `json:"edit_guidance"`
	Verification    guideFieldVerification `json:"verification"`
}

// asGuideField 将字段模式转换为字段说明结构以复用文案渲染（模式没有 risk）
func (p guideFieldPattern) asGuideField() guideField {
	return guideField{
		Title:        p.Title,
		Description:  p.Description,
		GameUsage:    p.GameUsage,
		EditGuidance: p.EditGuidance,
		Verification: p.Verification,
	}
}

// enrichSchemaWithGuide 将 knowledge guide 的字段说明合并进编辑 schema 的 description；
// guide 解析失败时原样返回 schema（悬停降级为纯类型信息）
func enrichSchemaWithGuide(locale string, schemaID string, document editingv1.Document) []byte {
	guide, err := knowledgev1.Resolve(schemaID, document.ID, document.JSON)
	if err != nil {
		return document.JSON
	}
	var parsedGuide struct {
		Fields        []guideField        `json:"fields"`
		FieldPatterns []guideFieldPattern `json:"field_patterns"`
	}
	if err := json.Unmarshal(guide.JSON, &parsedGuide); err != nil {
		return document.JSON
	}

	var schema map[string]any
	if err := json.Unmarshal(document.JSON, &schema); err != nil {
		return document.JSON
	}

	applied := false
	// 先应用字段模式（通配路径，覆盖数组元素与嵌套属性等动态路径），
	// 后应用精确字段说明，使精确指针的文案在重叠节点上优先
	for _, fieldPattern := range parsedGuide.FieldPatterns {
		if fieldPattern.JSONPathPattern == "" {
			continue
		}
		field := fieldPattern.asGuideField()
		if isSchemaDerivedGuideField(field) {
			continue
		}
		text := formatGuideFieldDoc(locale, field)
		if text == "" {
			continue
		}
		for _, node := range expandGuidePattern(schema, fieldPattern.JSONPathPattern) {
			node["description"] = text
			node["markdownDescription"] = text
			applied = true
		}
	}
	for _, field := range parsedGuide.Fields {
		if field.SchemaPointer == "" {
			continue
		}
		// schema 派生占位字段没有审核语义，只并入经过源码/实测审核的字段说明
		if isSchemaDerivedGuideField(field) {
			continue
		}
		text := formatGuideFieldDoc(locale, field)
		if text == "" {
			continue
		}
		node, ok := resolveSchemaPointer(schema, field.SchemaPointer)
		if !ok {
			continue
		}
		node["description"] = text
		node["markdownDescription"] = text
		applied = true
	}
	if !applied {
		return document.JSON
	}

	encoded, err := json.Marshal(schema)
	if err != nil {
		return document.JSON
	}
	return encoded
}

// formatGuideFieldDoc 将字段说明组合为 Monaco 悬停使用的 Markdown 文案（按 locale 翻译并附认证状态）
func formatGuideFieldDoc(locale string, field guideField) string {
	title := translateGuideText(locale, field.Title)
	description := translateGuideText(locale, field.Description)

	var sections []string
	if title != "" && description != "" {
		sections = append(sections, fmt.Sprintf("**%s** — %s", title, description))
	} else if description != "" {
		sections = append(sections, description)
	} else if title != "" {
		sections = append(sections, fmt.Sprintf("**%s**", title))
	}
	if field.GameUsage != "" {
		sections = append(sections, schemaDocLabel(locale, "game_usage")+translateGuideText(locale, field.GameUsage))
	}
	if field.EditGuidance != "" {
		sections = append(sections, schemaDocLabel(locale, "editing")+translateGuideText(locale, field.EditGuidance))
	}
	if field.Risk != "" {
		risk := field.Risk
		if localized := schemaDocLabel(locale, strings.ToLower(field.Risk)); localized != strings.ToLower(field.Risk) {
			risk = localized
		}
		sections = append(sections, "⚠ "+schemaDocLabel(locale, "risk")+risk)
	}
	if line := formatVerificationDoc(locale, field.Verification); line != "" {
		sections = append(sections, line)
	}
	return strings.Join(sections, "\n\n")
}

// formatVerificationDoc 将字段的三项独立认证渲染为一行，例如
// "已认证：序列化、源码语义（AI 审核）"；各项审核主体不一致时逐项标注；无认证返回空串
func formatVerificationDoc(locale string, verification guideFieldVerification) string {
	type claimEntry struct {
		label     string
		authority string
	}
	var entries []claimEntry
	appendClaim := func(labelKey string, claim *guideVerificationClaim) {
		if claim == nil || claim.Status != "verified" {
			return
		}
		authority := claim.Authority
		if localized := schemaDocLabel(locale, "authority_"+claim.Authority); localized != "authority_"+claim.Authority {
			authority = localized
		}
		entries = append(entries, claimEntry{label: schemaDocLabel(locale, labelKey), authority: authority})
	}
	appendClaim("claim_serialization", verification.Serialization)
	appendClaim("claim_source_semantics", verification.SourceSemantics)
	appendClaim("claim_game_behavior", verification.GameBehavior)
	if len(entries) == 0 {
		return ""
	}

	separator := schemaDocLabel(locale, "claim_separator")
	authorityFormat := schemaDocLabel(locale, "authority_format")
	uniform := true
	for _, entry := range entries[1:] {
		if entry.authority != entries[0].authority {
			uniform = false
			break
		}
	}
	parts := make([]string, len(entries))
	for i, entry := range entries {
		parts[i] = entry.label
		if !uniform {
			parts[i] += fmt.Sprintf(authorityFormat, entry.authority)
		}
	}
	line := schemaDocLabel(locale, "verification") + strings.Join(parts, separator)
	if uniform {
		line += fmt.Sprintf(authorityFormat, entries[0].authority)
	}
	return line
}

// resolveSchemaPointer 按 JSON Pointer 定位 schema 对象节点（支持 #/ 前缀、~0/~1 转义与数组下标）
func resolveSchemaPointer(root map[string]any, pointer string) (map[string]any, bool) {
	pointer = strings.TrimPrefix(pointer, "#")
	if !strings.HasPrefix(pointer, "/") {
		return nil, false
	}
	var current any = root
	for _, rawToken := range strings.Split(pointer[1:], "/") {
		token := strings.ReplaceAll(strings.ReplaceAll(rawToken, "~1", "/"), "~0", "~")
		switch typed := current.(type) {
		case map[string]any:
			next, ok := typed[token]
			if !ok {
				return nil, false
			}
			current = next
		case []any:
			index, err := strconv.Atoi(token)
			if err != nil || index < 0 || index >= len(typed) {
				return nil, false
			}
			current = typed[index]
		default:
			return nil, false
		}
	}
	node, ok := current.(map[string]any)
	return node, ok
}

// expandGuidePattern 将字段模式的通配 JSON 路径展开为全部命中的 schema 节点。
// 每段匹配前先展开 $ref 与 allOf/anyOf/oneOf 组合（可空联合与 $defs 引用是 schema 的常见包装）；
// 命中 $defs 共享节点时写入的说明会作用于全部引用处，与通配模式"描述所有匹配路径"的语义一致
func expandGuidePattern(root map[string]any, pattern string) []map[string]any {
	if !strings.HasPrefix(pattern, "/") {
		return nil
	}
	current := []map[string]any{root}
	for _, segment := range strings.Split(pattern[1:], "/") {
		var next []map[string]any
		for _, node := range current {
			for _, schema := range effectiveSchemas(root, node, map[string]bool{}) {
				next = append(next, matchSchemaSegment(schema, segment)...)
			}
		}
		if len(next) == 0 {
			return nil
		}
		current = next
	}
	return current
}

// effectiveSchemas 返回节点本身及经 $ref、allOf/anyOf/oneOf 可达的全部 schema 对象（按 $ref 去环）
func effectiveSchemas(root, node map[string]any, visitedRefs map[string]bool) []map[string]any {
	result := []map[string]any{node}
	if ref, _ := node["$ref"].(string); strings.HasPrefix(ref, "#") && !visitedRefs[ref] {
		visitedRefs[ref] = true
		if target, ok := resolveSchemaPointer(root, ref); ok {
			result = append(result, effectiveSchemas(root, target, visitedRefs)...)
		}
	}
	for _, keyword := range []string{"allOf", "anyOf", "oneOf"} {
		branches, _ := node[keyword].([]any)
		for _, branch := range branches {
			if object, ok := branch.(map[string]any); ok {
				result = append(result, effectiveSchemas(root, object, visitedRefs)...)
			}
		}
	}
	return result
}

// matchSchemaSegment 在单个已展开的 schema 对象上匹配一个模式路径段：
// {a,b,c} 枚举属性名；含 * 的段按通配匹配属性名；单独的 * 额外命中数组元素与字典成员
func matchSchemaSegment(schema map[string]any, segment string) []map[string]any {
	properties, _ := schema["properties"].(map[string]any)
	var result []map[string]any
	appendNode := func(value any) {
		if object, ok := value.(map[string]any); ok {
			result = append(result, object)
		}
	}
	for _, name := range segmentAlternatives(segment) {
		if !strings.Contains(name, "*") {
			if property, ok := properties[name]; ok {
				appendNode(property)
				continue
			}
			// 库 guide 的 pattern 路径偶有与 C# 命名的 JSON 键大小写不一致
			// （如 /containerDirectories/*/version 对 Version），精确未命中时按大小写不敏感兜底
			for propertyName, property := range properties {
				if strings.EqualFold(propertyName, name) {
					appendNode(property)
				}
			}
			continue
		}
		for propertyName, property := range properties {
			if matched, err := path.Match(name, propertyName); err == nil && matched {
				appendNode(property)
			}
		}
		if name == "*" {
			appendNode(schema["items"])
			appendNode(schema["additionalProperties"])
			if patternProperties, ok := schema["patternProperties"].(map[string]any); ok {
				for _, property := range patternProperties {
					appendNode(property)
				}
			}
		}
	}
	return result
}

// segmentAlternatives 解析 {a,b,c} 形式的属性名枚举段，其余段原样返回
func segmentAlternatives(segment string) []string {
	if strings.HasPrefix(segment, "{") && strings.HasSuffix(segment, "}") {
		return strings.Split(segment[1:len(segment)-1], ",")
	}
	return []string{segment}
}
