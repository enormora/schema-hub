/* eslint-disable import/max-dependencies -- since there are a lot of issue types, and we don’t want to have everything in a single file, we need to have a big import list here to wire everything together */
import type { ZodIssue, ZodIssueCode } from 'zod';
import { formatInvalidEnumValueIssueMessage } from './issue-specific/invalid-enum-value.js';
import { formatInvalidLiteralIssueMessage } from './issue-specific/invalid-literal.js';
import { formatInvalidStringIssueMessage } from './issue-specific/invalid-string.js';
import { formatInvalidTypeIssueMessage } from './issue-specific/invalid-type.js';
import { formatInvalidUnionDiscriminatorIssueMessage } from './issue-specific/invalid-union-discriminator.js';
import { formatInvalidUnionIssueMessage } from './issue-specific/invalid-union.js';
import { formatNotMultipleOfIssueMessage } from './issue-specific/not-multiple-of.js';
import { formatTooBigIssueMessage } from './issue-specific/too-big.js';
import { formatTooSmallIssueMessage } from './issue-specific/too-small.js';
import { formatUnrecognizedKeysIssueMessage } from './issue-specific/unrecognized-keys.js';
import { formatPath, isNonEmptyPath } from './path.js';

type FormatterForCode<Code extends ZodIssueCode> = (
    issue: Extract<ZodIssue, { code: Code; }>,
    input: unknown
) => string;

type FormatterMap = {
    readonly [Key in ZodIssueCode]: FormatterForCode<Key>;
};

function formatSimpleMessage(message: string): (issue: ZodIssue) => string {
    return () => {
        return message;
    };
}

const issueCodeToFormatterMap: FormatterMap = {
    invalid_type: formatInvalidTypeIssueMessage,
    invalid_literal: formatInvalidLiteralIssueMessage,
    unrecognized_keys: formatUnrecognizedKeysIssueMessage,
    too_big: formatTooBigIssueMessage,
    too_small: formatTooSmallIssueMessage,
    not_multiple_of: formatNotMultipleOfIssueMessage,
    invalid_enum_value: formatInvalidEnumValueIssueMessage,
    invalid_string: formatInvalidStringIssueMessage,
    invalid_union_discriminator: formatInvalidUnionDiscriminatorIssueMessage,
    invalid_union: formatInvalidUnionIssueMessage,
    invalid_arguments: formatSimpleMessage('invalid function arguments'),
    invalid_return_type: formatSimpleMessage('invalid function return type'),
    invalid_date: formatSimpleMessage('invalid date'),
    custom: formatSimpleMessage('invalid input'),
    invalid_intersection_types: formatSimpleMessage('intersection results could not be merged'),
    not_finite: formatSimpleMessage('number must be finite')
};

export function formatIssue(issue: ZodIssue, input: unknown): string {
    const { path, code } = issue;

    const formatter = issueCodeToFormatterMap[code] as (issue: ZodIssue, input: unknown) => string;
    const message = formatter(issue, input);

    if (isNonEmptyPath(path)) {
        const formattedPath = formatPath(path);
        return `at ${formattedPath}: ${message}`;
    }

    return message;
}
