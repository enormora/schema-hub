import type { $ZodInvalidTypeExpected, util } from 'zod/v4/core';
import { isNonEmptyArray, type NonEmptyArray } from '../tuple/non-empty-array.ts';

function joinList(values: NonEmptyArray<string>, separator: string, lastItemSeparator: string): string {
    const initialList = Array.from(values);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- values is a NonEmptyArray, so pop() always returns an item
    const lastItem = initialList.pop() as string;

    if (initialList.length === 0) {
        return lastItem;
    }

    const joinedInitialList = initialList.join(separator);
    return `${joinedInitialList}${lastItemSeparator}${lastItem}`;
}

type ParsedType = { readonly type: $ZodInvalidTypeExpected; };
export type ListValue = ParsedType | util.Primitive;

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
    if (typeof value === 'bigint') {
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
