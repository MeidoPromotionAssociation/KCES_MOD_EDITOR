import {isBigNumber, losslessParse, losslessStringify, numberToString} from "./losslessJson";

/**
 * .neimp 表格视图的数据模型
 *
 * 游戏侧把 .neimp 反序列化成 CsvData<T>，MessagePack-CSharp 的 [Key(n)] 是**按位置**序列化的，
 * 所以线格式里既没有字段名、也不是映射，而是一层数组：
 *
 *     单表文件   [1000, {"0": [0, 0, "banner.png", …], "10": [...]}]
 *     复合表文件 [0, [1000, {…}], [1000, {…}], …]
 *     id 清单    [0, 10, 20, …]        （*_enabled_list.neimp，不是表）
 *
 * 即：表容器 = `[版本, {行键: 行数组}]`，行是定长数组，列就是数组下标。
 * 表格视图按这个形态渲染，列名用下标（与游戏源码里的 [Key(n)] 一一对应）。
 *
 * 这里只做纯数据变换，不碰 React。
 */

/** 扫描深度上限：复合表的表容器最多两层（根 → 容器），留几层余量 */
const MaxScanDepth = 5;

/** 行键的规范十进制写法（与库回写整数键的判据一致） */
const CanonicalInteger = /^(0|-?[1-9]\d*)$/;

export interface NeimpRow {
    /** 行键：游戏按它做字典查找，是这一行的身份 */
    key: string;
    /** 行数组，下标即 [Key(n)] 的位置 */
    cells: any[];
}

export interface NeimpTable {
    kind: "table";
    /** 表容器 `[版本, 行映射]` 在值树里的位置；空数组表示根自己就是容器 */
    path: string[];
    /** 容器第 0 项：这个 CsvData 的版本号 */
    version: any;
    /** 行映射（行键 → 行数组），改动时以它为基准做不可变更新 */
    map: Record<string, any[]>;
    rows: NeimpRow[];
    /** 最长的一行有多长，也就是列数 */
    columnCount: number;
}

/**
 * id 清单：`*_enabled_list.neimp` 就是一个扁平数组（`[0, 10, 20, …]`），
 * 没有行键也没有列，编辑上当作单列表格处理
 */
export interface NeimpList {
    kind: "list";
    path: string[];
    values: any[];
}

/** 表格视图能编辑的两种形态 */
export type NeimpSheet = NeimpTable | NeimpList;

/** 判断是否普通对象（排除数组与 LosslessNumber 这类对象包装） */
function isPlainObject(value: any): value is Record<string, any> {
    return value !== null && typeof value === "object" && !Array.isArray(value) && !isBigNumber(value);
}

/** 判断是否为数值（普通 number 或无损大整数） */
function isNumeric(value: any): boolean {
    return typeof value === "number" || isBigNumber(value);
}

/**
 * 判断一个节点是不是 CsvData 表容器：`[版本, {行键: 行数组}]`
 *
 * 空的行映射也接受（`[1000, {}]` 是一张还没有行的表）；行必须是数组，
 * 遇到成员不是数组的映射就不认领，交给 JSON 视图。
 */
function asTableContainer(node: any): {version: any; map: Record<string, any[]>} | null {
    if (!Array.isArray(node) || node.length !== 2 || !isNumeric(node[0]) || !isPlainObject(node[1])) {
        return null;
    }
    const map = node[1] as Record<string, any[]>;
    for (const key of Object.keys(map)) {
        if (!Array.isArray(map[key])) {
            return null;
        }
    }
    return {version: node[0], map};
}

/** 把行映射整理成表格：行按值树顺序，列数取最长的一行 */
function buildTable(path: string[], version: any, map: Record<string, any[]>): NeimpTable {
    const rows: NeimpRow[] = Object.keys(map).map((key) => ({key, cells: map[key]}));
    let columnCount = 0;
    for (const row of rows) {
        columnCount = Math.max(columnCount, row.cells.length);
    }
    return {kind: "table", path, version, map, rows, columnCount};
}

/** 判断是不是标量数组（id 清单）：每个元素都不是数组 / 对象。空数组也认领，删空之后才不会「表格消失」 */
function asScalarList(node: any): any[] | null {
    if (!Array.isArray(node)) {
        return null;
    }
    for (const item of node) {
        if (Array.isArray(item) || isPlainObject(item)) {
            return null;
        }
    }
    return node;
}

/**
 * 扫描整棵值树，列出所有可编辑的形态（表 / id 清单）
 *
 * 找到表容器后不再往下钻：行数组里的嵌套数组是数据，不是另一张表。
 *
 * 只有当整棵树里**没有任何表**时才把标量数组当 id 清单：
 * `*_enabled_list.neimp` 整个文件就是一个 id 数组，而复合表里零散的
 * `long[]` / 坐标数组之类的成员属于数据，把它们全列进选择器只会变成噪声
 * （实测 romancelocation_data 会扫出 340 个）。
 */
export function scanNeimpSheets(root: any): NeimpSheet[] {
    const tables: NeimpTable[] = [];
    const lists: NeimpList[] = [];
    const walk = (node: any, path: string[], depth: number) => {
        const container = asTableContainer(node);
        if (container) {
            tables.push(buildTable(path, container.version, container.map));
            return;
        }
        const list = asScalarList(node);
        if (list) {
            lists.push({kind: "list", path, values: list});
            return;
        }
        if (depth >= MaxScanDepth) {
            return;
        }
        if (Array.isArray(node)) {
            node.forEach((item, index) => walk(item, [...path, String(index)], depth + 1));
            return;
        }
        if (isPlainObject(node)) {
            for (const key of Object.keys(node)) {
                walk(node[key], [...path, key], depth + 1);
            }
        }
    };
    walk(root, [], 0);
    return tables.length > 0 ? tables : lists;
}

/** 形态在界面上的稳定标识，用于选择器与「上次选中的表」 */
export function neimpTableKey(sheet: NeimpSheet): string {
    return JSON.stringify(sheet.path);
}

/** 按标识找形态；标识失效（换了文件、结构变了）时回退到第一个 */
export function resolveNeimpTable(sheets: NeimpSheet[], key: string | null): NeimpSheet | null {
    if (sheets.length === 0) {
        return null;
    }
    if (key === null) {
        return sheets[0];
    }
    return sheets.find((sheet) => neimpTableKey(sheet) === key) ?? sheets[0];
}

/** 形态的展示名：根用 root，其余用下标 / 成员键组成的路径 */
export function neimpTableLabel(sheet: NeimpSheet, rootLabel: string): string {
    return sheet.path.length === 0 ? rootLabel : sheet.path.join(" / ");
}

/**
 * 单元格的显示文本
 *
 * 字符串按原样显示（用户直接编辑文本，不用加引号），其余按 JSON 字面量显示：
 * 数字保持原写法（LosslessNumber 不会掉精度），数组/对象（含 $bin/$ext 标记）走紧凑 JSON。
 */
export function neimpCellText(value: any): string {
    if (value === null || value === undefined) {
        return "";
    }
    if (typeof value === "string") {
        return value;
    }
    if (typeof value === "number" || isBigNumber(value)) {
        return numberToString(value);
    }
    if (typeof value === "boolean") {
        return value ? "true" : "false";
    }
    return losslessStringify(value);
}

/** 只解析单个 JSON 字面量；解析失败（含空串、裸文本）时返回失败 */
function parseJSONLiteral(text: string): {ok: true; value: any} | {ok: false} {
    const trimmed = text.trim();
    if (trimmed === "") {
        return {ok: false};
    }
    try {
        return {ok: true, value: losslessParse(trimmed)};
    } catch {
        return {ok: false};
    }
}

/**
 * 把单元格输入文本转回值树里的值
 *
 * 类型按原值保护，避免「看起来像数字的字符串」被悄悄改成数字（游戏反序列化会因此失败）：
 * - 原值是字符串：输入什么就存什么，不做任何解析
 * - 原值是 null：没有类型可保护，留空仍是 null，否则先试 JSON 字面量、失败就当字符串
 * - 其余：必须能解析成 JSON 字面量；要写字符串请显式加双引号
 */
export function neimpCellValue(original: any, text: string): {ok: true; value: any} | {ok: false} {
    if (typeof original === "string") {
        return {ok: true, value: text};
    }
    const parsed = parseJSONLiteral(text);
    if (original === null || original === undefined) {
        if (text.trim() === "") {
            return {ok: true, value: null};
        }
        return {ok: true, value: parsed.ok ? parsed.value : text};
    }
    return parsed;
}

/** 沿路径替换一个节点，只克隆路径上的数组 / 对象，其余节点保持原引用 */
function replaceAtPath(root: any, path: string[], build: () => any): any {
    const rebuild = (node: any, rest: string[]): any => {
        if (rest.length === 0) {
            return build();
        }
        const [head, ...tail] = rest;
        if (Array.isArray(node)) {
            const copy = [...node];
            copy[Number(head)] = rebuild(node[Number(head)], tail);
            return copy;
        }
        return {...node, [head]: rebuild(node?.[head], tail)};
    };
    return rebuild(root, path);
}

/**
 * 把某张表的行映射写回值树。
 * 表容器本身是 `[版本, 行映射]`，所以写回时重建这对数组。
 */
export function withNeimpRows(root: any, table: NeimpTable, rows: Record<string, any[]>): any {
    return replaceAtPath(root, table.path, () => [table.version, rows]);
}

/** 把 id 清单写回值树 */
export function withNeimpListValues(root: any, list: NeimpList, values: any[]): any {
    return replaceAtPath(root, list.path, () => values);
}

/** 修改一个单元格，其余行与列保持原引用 */
export function setNeimpCell(
    map: Record<string, any[]>,
    rowKey: string,
    index: number,
    value: any,
): Record<string, any[]> {
    const cells = map[rowKey] ?? [];
    return {...map, [rowKey]: cells.map((cell, position) => (position === index ? value : cell))};
}

/** 删除一行 */
export function deleteNeimpRow(map: Record<string, any[]>, rowKey: string): Record<string, any[]> {
    const next = {...map};
    delete next[rowKey];
    return next;
}

/** 删除一列：从每一行的数组里去掉这个下标 */
export function deleteNeimpColumn(map: Record<string, any[]>, index: number): Record<string, any[]> {
    const next: Record<string, any[]> = {};
    for (const [key, cells] of Object.entries(map)) {
        next[key] = cells.filter((_, position) => position !== index);
    }
    return next;
}

/** 新行键：现有整数键的最大值 + 1，没有整数键时从 1 开始 */
function nextRowKey(map: Record<string, any[]>): string {
    let max = 0;
    let found = false;
    for (const key of Object.keys(map)) {
        if (!CanonicalInteger.test(key)) {
            continue;
        }
        const value = Number(key);
        if (!Number.isSafeInteger(value)) {
            continue;
        }
        found = true;
        max = Math.max(max, value);
    }
    return found ? String(max + 1) : "1";
}

/**
 * 新增一行：以最后一行为模板（长度与各位置的类型都和该表一致），行键换成新键，
 * 并把 id 列一并改成新键（游戏按行键查找，两者应当一致）。
 * 表里还没有行时给空数组，MessagePack-CSharp 会把缺失位置填成默认值。
 */
export function addNeimpRow(
    map: Record<string, any[]>,
    idColumn: number | null,
): {map: Record<string, any[]>; key: string} {
    const key = nextRowKey(map);
    const template = Object.values(map).at(-1);
    let cells: any[] = [];
    if (template) {
        // 用无损 JSON 往返做深拷贝：直接展开会让新行与模板共享嵌套数组
        cells = losslessParse(losslessStringify(template));
        if (idColumn !== null && idColumn < cells.length) {
            cells[idColumn] = Number(key);
        }
    }
    return {map: {...map, [key]: cells}, key};
}

/** 修改 id 清单的一个条目 */
export function setNeimpListValue(values: any[], index: number, value: any): any[] {
    return values.map((item, position) => (position === index ? value : item));
}

/** 删除 id 清单的一个条目 */
export function deleteNeimpListItem(values: any[], index: number): any[] {
    return values.filter((_, position) => position !== index);
}

/**
 * 追加一个 id 清单条目：全是数值时追加「最大值 + 1」（id 清单就是这个语义），
 * 否则追加 null，让用户自己填
 */
export function addNeimpListItem(values: any[]): {values: any[]; index: number} {
    let max = 0;
    let numeric = values.length > 0;
    for (const value of values) {
        const parsed = numericCellValue(value);
        if (parsed === null) {
            numeric = false;
            break;
        }
        max = Math.max(max, parsed);
    }
    return {values: [...values, numeric ? max + 1 : null], index: values.length};
}

/** 数值形态的单元格值，用于和行键比对；非数字返回 null */
function numericCellValue(value: any): number | null {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }
    if (isBigNumber(value)) {
        const parsed = Number(value.toString());
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

/**
 * 找出 id 列：各行里数值等于行键的那一列（下标）
 *
 * 游戏用行键做字典查找，行数组里的 id 位置只是同一份身份的副本，
 * 两者一旦不一致，该行就查不到了。按「多数行命中」判定，
 * 这样用户改坏个别行时仍能认出这是 id 列并给出提示。
 */
export function detectNeimpIdColumn(table: NeimpTable): number | null {
    if (table.rows.length === 0) {
        return null;
    }
    let best: number | null = null;
    let bestMatches = 0;
    for (let index = 0; index < table.columnCount; index++) {
        let matches = 0;
        for (const row of table.rows) {
            const value = numericCellValue(row.cells[index]);
            if (value !== null && String(value) === row.key) {
                matches++;
            }
        }
        if (matches > bestMatches) {
            best = index;
            bestMatches = matches;
        }
    }
    // 至少一半的行要对上，否则只是巧合（例如某列恰好全为 0、行键也恰好从 0 开始）
    return bestMatches > 0 && bestMatches * 2 >= table.rows.length ? best : null;
}

/** 某一行的 id 列是否与行键不一致 */
export function isNeimpIdMismatch(row: NeimpRow, idColumn: number | null): boolean {
    if (idColumn === null) {
        return false;
    }
    const value = numericCellValue(row.cells[idColumn]);
    return value !== null && String(value) !== row.key;
}
