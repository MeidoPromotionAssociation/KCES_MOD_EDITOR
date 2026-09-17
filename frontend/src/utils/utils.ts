export function getFileExtension(filePath: string): string {
    const lastDotIndex = filePath.lastIndexOf('.');
    if (lastDotIndex === -1) {
        return '';
    }
    return filePath.slice(lastDotIndex + 1);
}

export function getFileName(filePath: string): string {
    return filePath.split(/[\\/]/).pop() ?? filePath;
}

/** 把 from 处的元素移到 to，落位与 @dnd-kit 排序插件的 move() 一致 */
export function arrayMove<T>(list: T[], from: number, to: number): T[] {
    const next = list.slice();
    next.splice(to, 0, next.splice(from, 1)[0]);
    return next;
}
