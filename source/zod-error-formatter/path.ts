type PathItem = number | string;

type Path = readonly [PathItem, ...readonly PathItem[]];

export function isNonEmptyPath(path: readonly PathItem[]): path is Path {
    return path.length > 0;
}

export function formatPath(path: Path): string {
    return path.reduce<string>((currentFormattedPath, item, index) => {
        if (typeof item === 'number') {
            return `${currentFormattedPath}[${item}]`;
        }
        if (index === 0) {
            return item;
        }

        return `${currentFormattedPath}.${item}`;
    }, '');
}
