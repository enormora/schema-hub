import type {
    $ZodIssue,
    $ZodIssueCustom,
    $ZodIssueInvalidElement,
    $ZodIssueInvalidKey,
    $ZodIssueInvalidUnion
} from 'zod/v4/core';
import {
    formatInvalidElementIssueMessage,
    formatInvalidKeyIssueMessage,
    formatInvalidStringIssueMessage,
    formatInvalidTypeIssueMessage,
    formatInvalidUnionIssueMessage,
    formatInvalidValueIssueMessage,
    formatNotMultipleOfIssueMessage,
    formatTooBigIssueMessage,
    formatTooSmallIssueMessage,
    formatUnrecognizedKeysIssueMessage
} from './issue-specific/entry-point.js';
import { formatPath, isNonEmptyPath } from './path.js';

type ZodIssueCode = Exclude<$ZodIssue['code'], undefined>;

type FormatterForCode<Code extends ZodIssueCode> = (
    issue: Extract<$ZodIssue, { code: Code; }>,
    input: unknown
) => string;

type FormatterMap = {
    readonly [Key in ZodIssueCode]: FormatterForCode<Key>;
};

// Codes whose formatters handle their own "at <path>:" prefix because they
// either render a multi-issue block (invalid_union) or delegate to child
// formatters whose absolute paths would otherwise be doubled (invalid_key,
// invalid_element).
const selfPrefixingCodes: ReadonlySet<ZodIssueCode> = new Set(['invalid_union', 'invalid_key', 'invalid_element']);

function formatCustom(issue: $ZodIssueCustom): string {
    if (issue.message.length > 0) {
        return issue.message;
    }
    return 'invalid input';
}

function formatUnion(issue: $ZodIssueInvalidUnion, input: unknown): string {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define -- formatIssue is hoisted; closure resolves at call time
    return formatInvalidUnionIssueMessage(issue, input, formatIssue);
}

function formatInvalidKey(issue: $ZodIssueInvalidKey, input: unknown): string {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define -- formatIssue is hoisted; closure resolves at call time
    return formatInvalidKeyIssueMessage(issue, input, formatIssue);
}

function formatInvalidElement(issue: $ZodIssueInvalidElement, input: unknown): string {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define -- formatIssue is hoisted; closure resolves at call time
    return formatInvalidElementIssueMessage(issue, input, formatIssue);
}

const issueCodeToFormatterMap: FormatterMap = {
    invalid_type: formatInvalidTypeIssueMessage,
    invalid_value: formatInvalidValueIssueMessage,
    unrecognized_keys: formatUnrecognizedKeysIssueMessage,
    too_big: formatTooBigIssueMessage,
    too_small: formatTooSmallIssueMessage,
    not_multiple_of: formatNotMultipleOfIssueMessage,
    invalid_format: formatInvalidStringIssueMessage,
    invalid_union: formatUnion,
    custom: formatCustom,
    invalid_key: formatInvalidKey,
    invalid_element: formatInvalidElement
};

export function formatIssue(issue: $ZodIssue, input: unknown): string {
    const { path, code = 'custom' } = issue;

    const formatter = issueCodeToFormatterMap[code] as (
        issue: $ZodIssue,
        input: unknown
    ) => string;
    const message = formatter(issue, input);

    if (selfPrefixingCodes.has(code)) {
        return message;
    }

    if (isNonEmptyPath(path)) {
        const formattedPath = formatPath(path);
        return `at ${formattedPath}: ${message}`;
    }

    return message;
}
