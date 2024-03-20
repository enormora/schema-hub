import { isNonEmptyArray, type NonEmptyArray } from './non-empty-array.js';

type PathItem = number | string;

type Path = NonEmptyArray<PathItem>;

export const isNonEmptyPath = isNonEmptyArray<PathItem>;

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
