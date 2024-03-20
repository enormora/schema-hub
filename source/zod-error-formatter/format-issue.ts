import type { ZodIssue, ZodIssueCode } from 'zod';
import { formatInvalidTypeIssueMessage } from './issue-specific/invalid-type.js';
import { formatPath, isNonEmptyPath } from './path.js';

type FormatterForCode<Code extends ZodIssueCode> = (issue: Extract<ZodIssue, { code: Code; }>) => string;

type FormatterMap = {
    readonly [Key in ZodIssueCode]?: FormatterForCode<Key>;
};

const issueCodeToFormatterMap: FormatterMap = {
    invalid_type: formatInvalidTypeIssueMessage
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
