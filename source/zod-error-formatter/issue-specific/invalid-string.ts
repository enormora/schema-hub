import type {
    $ZodIssueInvalidStringFormat,
    $ZodIssueStringIncludes,
    $ZodIssueStringInvalidJWT,
    $ZodIssueStringInvalidRegex,
    $ZodStringFormatIssues,
    $ZodStringFormats
} from 'zod/v4/core';

function isStringFormatIssue<Format extends $ZodStringFormats>(
    issue: $ZodIssueInvalidStringFormat,
    format: Format
): issue is Extract<$ZodStringFormatIssues, { format: Format; }> {
    return issue.format === format;
}

function formatRegexValidation(issue: $ZodIssueStringInvalidRegex): string {
    return `string doesn’t match expected pattern ${issue.pattern}`;
}

function formatJwtValidation(issue: $ZodIssueStringInvalidJWT): string {
    if (issue.algorithm !== undefined) {
        return `invalid jwt (expected algorithm ${issue.algorithm})`;
    }
    return 'invalid jwt';
}

function formatIncludesValidation(issue: $ZodIssueStringIncludes): string {
    return `string must include "${issue.includes}"`;
}

function formatPositionalFormat(issue: $ZodIssueInvalidStringFormat | $ZodStringFormatIssues): string | null {
    if (isStringFormatIssue(issue, 'starts_with')) {
        return `string must start with "${issue.prefix}"`;
    }
    if (isStringFormatIssue(issue, 'ends_with')) {
        return `string must end with "${issue.suffix}"`;
    }
    return null;
}

function formatSpecificFormat(issue: $ZodIssueInvalidStringFormat | $ZodStringFormatIssues): string | null {
    if (isStringFormatIssue(issue, 'regex')) {
        return formatRegexValidation(issue);
    }
    if (isStringFormatIssue(issue, 'jwt')) {
        return formatJwtValidation(issue);
    }
    if (isStringFormatIssue(issue, 'includes')) {
        return formatIncludesValidation(issue);
    }
    return formatPositionalFormat(issue);
}

export function formatInvalidStringIssueMessage(issue: $ZodIssueInvalidStringFormat | $ZodStringFormatIssues): string {
    return formatSpecificFormat(issue) ?? `invalid ${issue.format}`;
}
