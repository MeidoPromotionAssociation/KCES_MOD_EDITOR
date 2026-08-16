/**
 * CSV Monaco 配置
 * .nei 的文本视图直接编辑 CSV 原文，这里注册 csv 语言与配套主题。
 *
 * 不用 Monarch：内置主题只给 string / delimiter 上色（delimiter 在 vs 下就是纯黑），
 * 未加引号的字段全是默认前景色，看起来等于没有高亮。
 * 表格数据真正需要的是分清「第几列」，因此改用自定义 TokensProvider 按列循环着色
 * （Rainbow CSV 的做法），逐字符扫描以正确处理引号内的逗号与 "" 转义。
 * 与 menuMonacoConfig 相同，用 WeakMap 保证每个 Monaco 实例只初始化一次。
 */

const initializedMonacoInstances = new WeakMap();

// 循环使用的列颜色数量
const ColumnColorCount = 6;

/** columnToken 按列号取循环的 token 类型 */
function columnToken(column: number): string {
    return `csvColumn${column % ColumnColorCount}`;
}

/**
 * createState 行状态
 * 引号内的字段允许包含换行，此时下一行仍属于同一列，需要把引号状态与列号带到下一行
 */
function createState(inQuotes: boolean, column: number): any {
    return {
        inQuotes,
        column,
        clone: () => createState(inQuotes, column),
        equals: (other: any) => other?.inQuotes === inQuotes && other?.column === column,
    };
}

/** tokenizeLine 扫描一行，输出各列与逗号的 token */
function tokenizeLine(line: string, state: any) {
    const tokens: { startIndex: number; scopes: string }[] = [];
    let inQuotes: boolean = state?.inQuotes ?? false;
    let column: number = state?.column ?? 0;

    // 行首必须有一个从 0 开始的 token
    tokens.push({startIndex: 0, scopes: columnToken(column)});

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (inQuotes) {
            if (char === '"') {
                if (line[i + 1] === '"') {
                    // 转义的引号，整体留在当前列里
                    i++;
                } else {
                    inQuotes = false;
                }
            }
            continue;
        }

        if (char === '"') {
            inQuotes = true;
        } else if (char === ",") {
            tokens.push({startIndex: i, scopes: "delimiter"});
            column++;
            if (i + 1 < line.length) {
                tokens.push({startIndex: i + 1, scopes: columnToken(column)});
            }
        }
    }

    // 未闭合的引号说明字段跨行，否则下一行从第一列重新开始
    return {
        tokens,
        endState: inQuotes ? createState(true, column) : createState(false, 0),
    };
}

/** 注册 csv 语言与按列着色的 TokensProvider */
const defineLanguage = (monacoInstance: any) => {
    monacoInstance.languages.register({id: "csv"});
    monacoInstance.languages.setTokensProvider("csv", {
        getInitialState: () => createState(false, 0),
        tokenize: (line: string, state: any) => tokenizeLine(line, state),
    });
};

/** 列颜色，浅色/深色各一套，顺序与 columnToken 对应 */
const LightColumnColors = ["#0451A5", "#098658", "#A31515", "#795E26", "#AF00DB", "#0070C1"];
const DarkColumnColors = ["#9CDCFE", "#B5CEA8", "#CE9178", "#DCDCAA", "#C586C0", "#4FC1FF"];

const columnRules = (colors: string[]) =>
    colors.map((foreground, index) => ({token: `csvColumn${index}`, foreground}));

const defineTheme = (monacoInstance: any) => {
    monacoInstance.editor.defineTheme("csvTheme", {
        base: "vs",
        inherit: true,
        colors: {
            "editor.foreground": "#000000",
            "editor.background": "#FFFFFF",
        },
        rules: [
            ...columnRules(LightColumnColors),
            {token: "delimiter", foreground: "#A0A0A0"},
        ],
    });

    monacoInstance.editor.defineTheme("csvTheme-dark", {
        base: "vs-dark",
        inherit: true,
        colors: {
            "editor.foreground": "#D4D4D4",
            "editor.background": "#1E1E1E",
        },
        rules: [
            ...columnRules(DarkColumnColors),
            {token: "delimiter", foreground: "#6E7681"},
        ],
    });
};

/** setupCsvMonaco 注册 csv 语言与主题 */
export const setupCsvMonaco = (monacoInstance: any) => {
    if (initializedMonacoInstances.has(monacoInstance)) {
        return;
    }

    defineLanguage(monacoInstance);
    defineTheme(monacoInstance);

    initializedMonacoInstances.set(monacoInstance, true);
};
