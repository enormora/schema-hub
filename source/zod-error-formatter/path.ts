import { isNonEmptyArray, type NonEmptyArray } from '../tuple/non-empty-array.ts';

type Path = NonEmptyArray<PropertyKey>;

export const isNonEmptyPath = isNonEmptyArray<PropertyKey>;

export function formatPath(path: Path): string {
    return path.reduce<string>(function (currentFormattedPath, item, index) {
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

type Indexable = Readonly<Record<PropertyKey, unknown>>;

function isIndexable(value: unknown): value is Indexable {
    return typeof value === 'object' && value !== null;
}

function isMap(value: unknown): value is Map<unknown, unknown> {
    return value instanceof Map;
}

function determinePathItemKind(pathItem: PropertyKey): 'key' | 'property' {
    return typeof pathItem === 'number' ? 'key' : 'property';
}

function prototypeOf(value: Indexable): Indexable | null {
    const prototype: unknown = Object.getPrototypeOf(value);
    return isIndexable(prototype) ? prototype : null;
}

function hasPlainObjectPrototype(value: Indexable): boolean {
    const prototype = prototypeOf(value);
    const plainObjectPrototype: unknown = Object.prototype;
    return prototype === plainObjectPrototype || prototype === null;
}

function hasInheritedProperty(value: Indexable, pathItem: PropertyKey): boolean {
    if (hasPlainObjectPrototype(value)) {
        return false;
    }

    let currentPrototype = prototypeOf(value);
    while (currentPrototype !== null) {
        if (Object.getOwnPropertyDescriptor(currentPrototype, pathItem) !== undefined) {
            return true;
        }

        currentPrototype = prototypeOf(currentPrototype);
    }

    return false;
}

function findObjectPathItemValue(value: unknown, pathItem: PropertyKey): ValueResult {
    if (!isIndexable(value) || !Object.hasOwn(value, pathItem) && !hasInheritedProperty(value, pathItem)) {
        return { found: false, pathItemKind: determinePathItemKind(pathItem) };
    }

    return { found: true, value: value[pathItem] };
}

function findMapPathItemValue(value: ReadonlyMap<unknown, unknown>, pathItem: PropertyKey): ValueResult {
    if (value.has(pathItem)) {
        return { found: true, value: value.get(pathItem) };
    }

    return findObjectPathItemValue(value, pathItem);
}

function findPathItemValue(value: unknown, pathItem: PropertyKey): ValueResult {
    return isMap(value)
        ? findMapPathItemValue(value, pathItem)
        : findObjectPathItemValue(value, pathItem);
}

export function findValueByPath(value: unknown, path: readonly PropertyKey[]): ValueResult {
    let currentValue = value;
    let currentPath = path;

    while (isNonEmptyPath(currentPath)) {
        const [ currentPathItem, ...remainingPath ] = currentPath;
        const result = findPathItemValue(currentValue, currentPathItem);

        if (!result.found) {
            return result;
        }

        currentValue = result.value;
        currentPath = remainingPath;
    }

    return { found: true, value: currentValue };
}
