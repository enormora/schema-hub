import { isNonEmptyArray, type NonEmptyArray } from '../tuple/non-empty-array.js';

type Path = NonEmptyArray<PropertyKey>;

export const isNonEmptyPath = isNonEmptyArray<PropertyKey>;

export function formatPath(path: Path): string {
    return path.reduce<string>((currentFormattedPath, item, index) => {
        if (typeof item === 'number') {
            return `${currentFormattedPath}[${item}]`;
        }
        if (index === 0) {
            return item.toString();
        }

        return `${currentFormattedPath}.${item.toString()}`;
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

type Indexable = Record<PropertyKey, unknown>;

function isIndexable(value: unknown): value is Indexable {
    return typeof value === 'object' && value !== null;
}

function isMap(value: unknown): value is Map<unknown, unknown> {
    return value instanceof Map;
}

function determinePathItemKind(pathItem: PropertyKey): 'key' | 'property' {
    return typeof pathItem === 'number' ? 'key' : 'property';
}

function findMapValueByPath(value: Map<unknown, unknown>, path: readonly PropertyKey[]): ValueResult {
    if (isNonEmptyPath(path)) {
        const [mapEntryKey, ...remainingPath] = path;
        const entry = value.get(mapEntryKey);

        if (entry !== undefined) {
            // eslint-disable-next-line @typescript-eslint/no-use-before-define -- recursion
            return findValueByPath(entry, remainingPath);
        }

        return { found: false, pathItemKind: determinePathItemKind(mapEntryKey) };
    }

    return { found: true, value };
}

export function findValueByPath(value: unknown, path: readonly PropertyKey[]): ValueResult {
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
