import type { Primitive } from 'zod';
import { isNonEmptyArray, type NonEmptyArray } from './non-empty-array.js';

function joinList(values: NonEmptyArray<string>, separator: string, lastItemSeparator: string): string {
    const initialList = Array.from(values);
    const lastItem = initialList.pop() as string;

    if (initialList.length === 0) {
        return lastItem;
    }

    const joinedInitialList = initialList.join(separator);
    return `${joinedInitialList}${lastItemSeparator}${lastItem}`;
}

function stringify(value: Primitive): string {
    if (value === undefined) {
        return 'undefined';
    }
    if (typeof value === 'symbol') {
        return value.toString();
    }

    return JSON.stringify(value);
}

export function formatList(values: readonly Primitive[], lastItemSeparator: string): string {
    const escapedValues = values.map(stringify);
    if (!isNonEmptyArray(escapedValues)) {
        return 'unknown';
    }
    return joinList(escapedValues, ', ', lastItemSeparator);
}

export function formatOneOfList(values: readonly Primitive[]): string {
    const formattedList = formatList(values, ' or ');

    if (values.length > 1) {
        return `one of ${formattedList}`;
    }

    return formattedList;
}
