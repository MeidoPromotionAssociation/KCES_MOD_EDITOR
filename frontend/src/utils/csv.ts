/**
 * CSV 文本与二维数组互转
 * .nei 本质就是加密的 CSV 表格，编辑器的表格视图与文本视图共用这里的解析/序列化。
 * 遵循 RFC 4180 的常用子集：逗号分隔、双引号包裹、引号内 "" 转义，引号内允许换行。
 * 读取时 CRLF 归一为 LF（引号内的原样保留），并去掉 UTF-8 BOM。
 */

/** 单元格序列化：含逗号、引号或换行时用双引号包裹 */
function quoteCell(cell: string): string {
    const text = cell ?? "";
    if (/[",\r\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}

/** 二维数组转 CSV 文本（不带 BOM） */
export function csvDataToString(data: string[][]): string {
    return (data ?? []).map((row) => (row ?? []).map(quoteCell).join(",")).join("\n");
}

/** CSV 文本转二维数组（去掉 BOM）；文本以换行结尾时不产生末尾空行 */
export function stringToCsvData(text: string): string[][] {
    // 去掉 UTF-8 BOM（U+FEFF）
    const raw = text ?? "";
    const clean = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
    const rows: string[][] = [];
    let row: string[] = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < clean.length; i++) {
        const char = clean[i];

        if (inQuotes) {
            if (char === '"') {
                if (clean[i + 1] === '"') {
                    // 转义的引号
                    field += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += char;
            }
            continue;
        }

        if (char === '"') {
            inQuotes = true;
        } else if (char === ",") {
            row.push(field);
            field = "";
        } else if (char === "\n") {
            row.push(field);
            rows.push(row);
            row = [];
            field = "";
        } else if (char !== "\r") {
            field += char;
        }
    }

    // 收尾：文本以换行结尾时 field 与 row 都为空，不再补一行
    if (field !== "" || row.length > 0) {
        row.push(field);
        rows.push(row);
    }

    return rows;
}

/** 表格的列数（各行长度的最大值） */
export function csvColumnCount(data: string[][]): number {
    return (data ?? []).reduce((max, row) => Math.max(max, row?.length ?? 0), 0);
}
