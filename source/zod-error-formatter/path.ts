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

type FoundValueResult = {
    readonly found: true;
    readonly value: unknown;
};

type ValueNotFoundResult = {
    readonly found: false;
    readonly value?: undefined;
};

type ValueResult = FoundValueResult | ValueNotFoundResult;

type Indexable = Record<PathItem, unknown>;

function isIndexable(value: unknown): value is Indexable {
    return typeof value === 'object' && value !== null;
}

export function findValueByPath(value: unknown, path: readonly PathItem[]): ValueResult {
    if (isNonEmptyPath(path)) {
        const [currentPathItem, ...remainingPath] = path;

        if (isIndexable(value) && Object.hasOwn(value, currentPathItem)) {
            return findValueByPath(value[currentPathItem], remainingPath);
        }
        return { found: false };
    }

    return { found: true, value };
}
