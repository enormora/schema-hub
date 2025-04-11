import type { $ZodIssue } from 'zod/v4/core';
import { formatInvalidStringIssueMessage } from './issue-specific/invalid-string.js';
import { formatInvalidTypeIssueMessage } from './issue-specific/invalid-type.js';
import { formatInvalidUnionIssueMessage } from './issue-specific/invalid-union.js';
import { formatInvalidValueIssueMessage } from './issue-specific/invalid-value.js';
import { formatNotMultipleOfIssueMessage } from './issue-specific/not-multiple-of.js';
import { formatTooBigIssueMessage } from './issue-specific/too-big.js';
import { formatTooSmallIssueMessage } from './issue-specific/too-small.js';
import { formatUnrecognizedKeysIssueMessage } from './issue-specific/unrecognized-keys.js';
import { formatPath, isNonEmptyPath } from './path.js';

type ZodIssueCode = Exclude<$ZodIssue['code'], undefined>;

type FormatterForCode<Code extends ZodIssueCode> = (
    issue: Extract<$ZodIssue, { code: Code; }>,
    input: unknown
) => string;

type FormatterMap = {
    readonly [Key in ZodIssueCode]: FormatterForCode<Key>;
};

function formatSimpleMessage(message: string): (issue: $ZodIssue) => string {
    return () => {
        return message;
    };
}

const issueCodeToFormatterMap: FormatterMap = {
    invalid_type: formatInvalidTypeIssueMessage,
    invalid_value: formatInvalidValueIssueMessage,
    unrecognized_keys: formatUnrecognizedKeysIssueMessage,
    too_big: formatTooBigIssueMessage,
    too_small: formatTooSmallIssueMessage,
    not_multiple_of: formatNotMultipleOfIssueMessage,
    invalid_format: formatInvalidStringIssueMessage,
    invalid_union: formatInvalidUnionIssueMessage,
    custom: formatSimpleMessage('invalid input'),
    invalid_key: formatSimpleMessage('invalid key'),
    invalid_element: formatSimpleMessage('invalid element')
};

export function formatIssue(issue: $ZodIssue, input: unknown): string {
    const { path, code = 'custom' } = issue;

    const formatter = issueCodeToFormatterMap[code] as (
        issue: $ZodIssue,
        input: unknown
    ) => string;
    const message = formatter(issue, input);

    if (isNonEmptyPath(path)) {
        const formattedPath = formatPath(path);
        return `at ${formattedPath}: ${message}`;
    }

    return message;
}
