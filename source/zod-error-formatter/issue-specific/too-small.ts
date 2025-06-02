import type { $ZodIssueTooSmall } from 'zod/v4/core';

const collectionTypes = new Set(['string', 'array', 'set']);
const numericTypes = new Set(['bigint', 'number']);

function formatInclusivePredicate(
    issue: $ZodIssueTooSmall,
    inclusiveVariant: string,
    nonInclusiveVariant: string
): string {
    if (issue.inclusive === true) {
        return inclusiveVariant;
    }
    return nonInclusiveVariant;
}

function formatPredicate(issue: $ZodIssueTooSmall): string {
    if (collectionTypes.has(issue.origin)) {
        return formatInclusivePredicate(issue, 'at least', 'more than');
    }

    return formatInclusivePredicate(issue, 'greater than or equal to', 'greater than');
}

function formatCollectionBoundary(issue: $ZodIssueTooSmall): string {
    const singularSuffix = issue.origin === 'string' ? 'character' : 'element';
    const suffix = issue.minimum === 1 ? singularSuffix : `${singularSuffix}s`;

    return `${issue.minimum} ${suffix}`;
}

function formatCollection(issue: $ZodIssueTooSmall): string {
    const predicate = formatPredicate(issue);
    const boundary = formatCollectionBoundary(issue);

    return `${issue.origin} must contain ${predicate} ${boundary}`;
}

function formatNumeric(issue: $ZodIssueTooSmall): string {
    const predicate = formatPredicate(issue);

    return `${issue.origin} must be ${predicate} ${issue.minimum}`;
}

function formatDate(issue: $ZodIssueTooSmall): string {
    const predicate = formatPredicate(issue);

    return `${issue.origin} must be ${predicate} ${new Date(Number(issue.minimum)).toUTCString()}`;
}

export function formatTooSmallIssueMessage(issue: $ZodIssueTooSmall): string {
    if (collectionTypes.has(issue.origin)) {
        return formatCollection(issue);
    }

    if (numericTypes.has(issue.origin)) {
        return formatNumeric(issue);
    }

    return formatDate(issue);
}
