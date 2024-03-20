import type { ZodUnrecognizedKeysIssue } from 'zod';
import { isNonEmptyArray, type NonEmptyArray } from '../non-empty-array.js';

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

function formatList(values: readonly string[]): string {
    const escapedValues = values.map(stringify);
    if (!isNonEmptyArray(escapedValues)) {
        return 'unknown';
    }
    return joinList(escapedValues, ', ', ' and ');
}

export function formatUnrecognizedKeysIssueMessage(issue: ZodUnrecognizedKeysIssue): string {
    const formattedProperties = formatList(issue.keys);
    const label = issue.keys.length > 1 ? 'properties' : 'property';
    return `unexpected additional ${label}: ${formattedProperties}`;
}
