import { isNonEmptyArray, type NonEmptyArray } from '../tuple/non-empty-array.js';

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
    readonly pathItemKind?: undefined;
};

type ValueNotFoundResult = {
    readonly found: false;
    readonly value?: undefined;
    readonly pathItemKind: 'key' | 'property';
};

type ValueResult = FoundValueResult | ValueNotFoundResult;

type Indexable = Record<PathItem, unknown>;

function isIndexable(value: unknown): value is Indexable {
    return typeof value === 'object' && value !== null;
}

function isMap(value: unknown): value is Map<unknown, unknown> {
    return value instanceof Map;
}

type MapEntryPathItem = 'key' | 'value';

function isMapEntryPathItem(pathItem: PathItem): pathItem is MapEntryPathItem {
    return (['key', 'value'] as PathItem[]).includes(pathItem);
}

function determinePathItemKind(pathItem: PathItem): 'key' | 'property' {
    return typeof pathItem === 'number' ? 'key' : 'property';
}

function findMapValueByPath(value: Map<unknown, unknown>, path: readonly PathItem[]): ValueResult {
    if (isNonEmptyPath(path)) {
        const [mapEntryKey, keyOrValue, ...remainingPath] = path;

        if (keyOrValue !== undefined && isMapEntryPathItem(keyOrValue)) {
            const entry = (Array.from(value.entries()))[mapEntryKey as number];

            if (entry !== undefined) {
                if (keyOrValue === 'key') {
                    // eslint-disable-next-line @typescript-eslint/no-use-before-define -- recursion
                    return findValueByPath(entry[0], remainingPath);
                }
                // eslint-disable-next-line @typescript-eslint/no-use-before-define -- recursion
                return findValueByPath(entry[1], remainingPath);
            }
        }

        return { found: false, pathItemKind: determinePathItemKind(mapEntryKey) };
    }

    return { found: true, value };
}

export function findValueByPath(value: unknown, path: readonly PathItem[]): ValueResult {
    if (isMap(value)) {
        return findMapValueByPath(value, path);
    }

    if (isNonEmptyPath(path)) {
        const [currentPathItem, ...remainingPath] = path;

        if (isIndexable(value) && Object.hasOwn(value, currentPathItem)) {
            return findValueByPath(value[currentPathItem], remainingPath);
        }
        return { found: false, pathItemKind: determinePathItemKind(currentPathItem) };
    }

    return { found: true, value };
}
