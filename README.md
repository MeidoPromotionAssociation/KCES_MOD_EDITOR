# KCES_MOD_EDITOR

[简体中文](#简体中文) | [English](#english)

---

## 简体中文

KCES MOD 编辑器，一个用于编辑 KCES（COM3D2.5 角色编辑系统）专有文件格式的图形化工具，是 [COM3D2_MOD_EDITOR](https://github.com/MeidoPromotionAssociation/COM3D2_MOD_EDITOR) 的姊妹项目。

基于 [MeidoSerialization](https://github.com/MeidoPromotionAssociation/MeidoSerialization) 序列化库（进程内直接调用其 service 包，无 gRPC），使用 [Wails v3](https://v3.wails.io/) + React + Ant Design 构建。

### 功能

- 每种格式一个专用编辑页面，支持结构化表单（样式 1）与 Monaco JSON（样式 2）双模式编辑
- 原生格式与编辑 JSON（`.xxx.json`）互相转换与直接编辑，大文件可不加载直接转换
- 文件拖放、文件关联打开、Ctrl+O/S/Alt+S 快捷键、深色模式跟随系统、多语言（中/英/日/韩）

### 支持的格式

| 分组 | 格式 |
| --- | --- |
| 服装部件 | `.menuassets` `.materialassets` `.pmatassets` `.model` |
| 物理 | `.dbconf` `.dbcol` `.db2conf` `.dsbconf` `.dsb2conf` `.dslconf` `.dsl2conf` `.dslcol` `.ikcol` `.ikcol.bytes` `.limbcol` |
| 角色 | `.preset` / `.perset` `.sad` `.hitcheck` `maid_collider.bytes` |
| 数据 | `.nson` `.undressdat` `.undresspdat` `.psk` `.nei`（含 CSV 互转）|

`.ct` / `.aba` 等打包格式与 `.brd` / `.enm` 等内部格式不在本编辑器范围内。

### 开发

```bash
# 开发模式（热重载）
wails3 dev

# 构建
wails3 task build
```

---

## English

A graphical editor for KCES (the character editing system for COM3D2.5) proprietary file formats — the sister project of [COM3D2_MOD_EDITOR](https://github.com/MeidoPromotionAssociation/COM3D2_MOD_EDITOR).

Built on the [MeidoSerialization](https://github.com/MeidoPromotionAssociation/MeidoSerialization) serialization library (calling its service packages in-process, no gRPC), using [Wails v3](https://v3.wails.io/) + React + Ant Design.

### Features

- One dedicated editor page per format, with a structured form view (Style 1) and a Monaco JSON view (Style 2)
- Edit native files or editing JSON (`.xxx.json`); large files can be converted directly without loading
- Drag & drop, file association, Ctrl+O/S/Alt+S shortcuts, system dark mode, i18n (zh/en/ja/ko)

### Supported formats

| Group | Formats |
| --- | --- |
| Parts | `.menuassets` `.materialassets` `.pmatassets` `.model` |
| Physics | `.dbconf` `.dbcol` `.db2conf` `.dsbconf` `.dsb2conf` `.dslconf` `.dsl2conf` `.dslcol` `.ikcol` `.ikcol.bytes` `.limbcol` |
| Character | `.preset` / `.perset` `.sad` `.hitcheck` `maid_collider.bytes` |
| Data | `.nson` `.undressdat` `.undresspdat` `.psk` `.nei` (with CSV conversion)|

Container formats such as `.ct` / `.aba` and internal formats such as `.brd` / `.enm` are out of scope.

### Development

```bash
# Development mode with hot reload
wails3 dev

# Build
wails3 task build
```

## License

BSD-3-Clause
