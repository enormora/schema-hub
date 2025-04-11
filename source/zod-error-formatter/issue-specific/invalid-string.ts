import type {
    $ZodIssueInvalidStringFormat,
    $ZodIssueStringIncludes,
    $ZodStringFormatIssues,
    $ZodStringFormats
} from 'zod/v4/core';

function isStringFormatIssue<Format extends $ZodStringFormats>(
    issue: $ZodIssueInvalidStringFormat,
    format: Format
): issue is Extract<$ZodStringFormatIssues, { format: Format; }> {
    return issue.format === format;
}

function formatIncludesValidation(issue: $ZodIssueStringIncludes): string {
    return `string must include "${issue.includes}"`;
}

export function formatInvalidStringIssueMessage(issue: $ZodIssueInvalidStringFormat | $ZodStringFormatIssues): string {
    if (isStringFormatIssue(issue, 'regex')) {
        return 'string doesn’t match expected pattern';
    }
    if (isStringFormatIssue(issue, 'includes')) {
        return formatIncludesValidation(issue);
    }
    if (isStringFormatIssue(issue, 'starts_with')) {
        return `string must start with "${issue.prefix}"`;
    }
    if (isStringFormatIssue(issue, 'ends_with')) {
        return `string must end with "${issue.suffix}"`;
    }
    return `invalid ${issue.format}`;
}
