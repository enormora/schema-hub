import type { $ZodIssueTooBig } from 'zod/v4/core';

const collectionTypes = new Set(['string', 'array', 'set']);
const numericTypes = new Set(['bigint', 'number']);

function formatInclusivePredicate(
    issue: $ZodIssueTooBig,
    inclusiveVariant: string,
    nonInclusiveVariant: string
): string {
    if (issue.inclusive === true) {
        return inclusiveVariant;
    }
    return nonInclusiveVariant;
}

function formatPredicate(issue: $ZodIssueTooBig): string {
    if (collectionTypes.has(issue.origin)) {
        return formatInclusivePredicate(issue, 'at most', 'less than');
    }

    if (numericTypes.has(issue.origin)) {
        return formatInclusivePredicate(issue, 'less than or equal to', 'less than');
    }

    return formatInclusivePredicate(issue, 'smaller than or equal to', 'smaller than');
}

function formatCollectionBoundary(issue: $ZodIssueTooBig): string {
    const singularSuffix = issue.origin === 'string' ? 'character' : 'element';
    const suffix = issue.maximum === 1 ? singularSuffix : `${singularSuffix}s`;

    return `${issue.maximum} ${suffix}`;
}

function formatCollection(issue: $ZodIssueTooBig): string {
    const predicate = formatPredicate(issue);
    const boundary = formatCollectionBoundary(issue);

    return `${issue.origin} must contain ${predicate} ${boundary}`;
}

function formatNumeric(issue: $ZodIssueTooBig): string {
    const predicate = formatPredicate(issue);

    return `${issue.origin} must be ${predicate} ${issue.maximum}`;
}

function formatDate(issue: $ZodIssueTooBig): string {
    const predicate = formatPredicate(issue);

    return `${issue.origin} must be ${predicate} ${new Date(Number(issue.maximum)).toUTCString()}`;
}

export function formatTooBigIssueMessage(issue: $ZodIssueTooBig): string {
    if (collectionTypes.has(issue.origin)) {
        return formatCollection(issue);
    }

    if (numericTypes.has(issue.origin)) {
        return formatNumeric(issue);
    }

    return formatDate(issue);
}
