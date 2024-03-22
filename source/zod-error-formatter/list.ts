import type { Primitive, ZodParsedType } from 'zod';
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

type ParsedType = { type: ZodParsedType; };
export type ListValue = ParsedType | Primitive;

export function isParsedType(value: ListValue): value is ParsedType {
    return typeof value === 'object' && value !== null && Object.hasOwn(value, 'type');
}

function stringify(value: ListValue): string {
    if (isParsedType(value)) {
        return value.type;
    }
    if (value === undefined) {
        return 'undefined';
    }
    if (typeof value === 'symbol') {
        return value.toString();
    }

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
