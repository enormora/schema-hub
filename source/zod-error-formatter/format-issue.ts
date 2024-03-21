import type { ZodIssue, ZodIssueCode } from 'zod';
import { formatInvalidLiteralIssueMessage } from './issue-specific/invalid-literal.js';
import { formatInvalidTypeIssueMessage } from './issue-specific/invalid-type.js';
import { formatTooBigIssueMessage } from './issue-specific/too-big.js';
import { formatTooSmallIssueMessage } from './issue-specific/too-small.js';
import { formatUnrecognizedKeysIssueMessage } from './issue-specific/unrecognized-keys.js';
import { formatPath, isNonEmptyPath } from './path.js';

type FormatterForCode<Code extends ZodIssueCode> = (issue: Extract<ZodIssue, { code: Code; }>) => string;

type FormatterMap = {
    readonly [Key in ZodIssueCode]?: FormatterForCode<Key>;
};

const issueCodeToFormatterMap: FormatterMap = {
    invalid_type: formatInvalidTypeIssueMessage,
    invalid_literal: formatInvalidLiteralIssueMessage,
    unrecognized_keys: formatUnrecognizedKeysIssueMessage,
    too_big: formatTooBigIssueMessage,
    too_small: formatTooSmallIssueMessage
};

export function formatIssue(issue: ZodIssue): string {
    const { path, code, message: fallbackMessage } = issue;

    const formatter = issueCodeToFormatterMap[code];
    // @ts-expect-error
    const message = formatter === undefined ? fallbackMessage : formatter(issue);

    if (isNonEmptyPath(path)) {
        const formattedPath = formatPath(path);
        return `at ${formattedPath}: ${message}`;
    }

    return message;
}
