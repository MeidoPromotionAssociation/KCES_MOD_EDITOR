/**
 * CSV Monaco 配置
 * .nei 的文本视图直接编辑 CSV 原文，这里注册一个轻量的 csv 语言用于分隔符/引号高亮。
 * 与 menuMonacoConfig 相同，用 WeakMap 保证每个 Monaco 实例只初始化一次。
 */

const initializedMonacoInstances = new WeakMap();

/** 注册 csv 语言（分隔符、引号字符串、转义引号） */
export const setupCsvMonaco = (monacoInstance: any) => {
    if (initializedMonacoInstances.has(monacoInstance)) {
        return;
    }

    monacoInstance.languages.register({id: "csv"});
    monacoInstance.languages.setMonarchTokensProvider("csv", {
        tokenizer: {
            root: [
                [/,/, "delimiter"],
                [/"/, "string", "@string"],
                [/[^,"]+/, "identifier"],
            ],
            string: [
                [/""/, "string.escape"],
                [/"/, "string", "@pop"],
                [/[^"]+/, "string"],
            ],
        },
    });

    initializedMonacoInstances.set(monacoInstance, true);
};
