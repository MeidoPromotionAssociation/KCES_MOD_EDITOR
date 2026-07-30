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
