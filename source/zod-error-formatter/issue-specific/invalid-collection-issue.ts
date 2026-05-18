import type { $ZodIssue, $ZodIssueInvalidElement, $ZodIssueInvalidKey } from 'zod/v4/core';
import { formatPath, isNonEmptyPath } from '../path.js';

type FormatChildIssue = (issue: $ZodIssue, input: unknown) => string;

function prependPath(path: readonly PropertyKey[], message: string): string {
    if (isNonEmptyPath(path)) {
        return `at ${formatPath(path)}: ${message}`;
    }
    return message;
}

function formatCollectionIssue(
    issue: $ZodIssueInvalidElement | $ZodIssueInvalidKey,
    input: unknown,
    formatChildIssue: FormatChildIssue,
    fallback: string
): string {
    if (issue.issues.length === 0) {
        return prependPath(issue.path, fallback);
    }
    // Inner issues carry absolute paths that already include the wrapper's
    // location, so delegating to formatChildIssue produces correctly-prefixed
    // sub-messages without doubling the prefix.
    return issue
        .issues
        .map((subIssue) => {
            return formatChildIssue(subIssue, input);
        })
        .join('; ');
}

export function formatInvalidKeyIssueMessage(
    issue: $ZodIssueInvalidKey,
    input: unknown,
    formatChildIssue: FormatChildIssue
): string {
    return formatCollectionIssue(issue, input, formatChildIssue, `invalid ${issue.origin} key`);
}

export function formatInvalidElementIssueMessage(
    issue: $ZodIssueInvalidElement,
    input: unknown,
    formatChildIssue: FormatChildIssue
): string {
    return formatCollectionIssue(issue, input, formatChildIssue, `invalid ${issue.origin} element`);
}
