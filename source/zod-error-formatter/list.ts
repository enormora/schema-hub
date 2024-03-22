import { isNonEmptyArray, type NonEmptyArray } from './non-empty-array.js';

type ListValue = number | string;

function joinList(values: NonEmptyArray<string>, separator: string, lastItemSeparator: string): string {
    const initialList = Array.from(values);
    const lastItem = initialList.pop() as string;

    if (initialList.length === 0) {
        return lastItem;
    }

    const joinedInitialList = initialList.join(separator);
    return `${joinedInitialList}${lastItemSeparator}${lastItem}`;
}

function stringify(value: unknown): string {
    return JSON.stringify(value);
}

export function formatList(values: readonly ListValue[], lastItemSeparator: string): string {
    const escapedValues = values.map(stringify);
    if (!isNonEmptyArray(escapedValues)) {
        return 'unknown';
    }
    return joinList(escapedValues, ', ', lastItemSeparator);
}

export function formatOneOfList(values: readonly ListValue[]): string {
    const formattedList = formatList(values, ' or ');

    if (values.length > 1) {
        return `one of ${formattedList}`;
    }

    return formattedList;
}
