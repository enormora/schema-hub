import type { ZodTooSmallIssue } from 'zod';

const collectionTypes = new Set(['string', 'array', 'set']);
const numericTypes = new Set(['bigint', 'number']);

function formatInclusivePredicate(
    issue: ZodTooSmallIssue,
    inclusiveVariant: string,
    nonInclusiveVariant: string
): string {
    if (issue.inclusive) {
        return inclusiveVariant;
    }
    return nonInclusiveVariant;
}

function formatPredicate(issue: ZodTooSmallIssue): string {
    if (issue.exact === true) {
        return 'exactly';
    }

    if (collectionTypes.has(issue.type)) {
        return formatInclusivePredicate(issue, 'at least', 'more than');
    }

    return formatInclusivePredicate(issue, 'greater than or equal to', 'greater than');
}

function formatCollectionBoundary(issue: ZodTooSmallIssue): string {
    const singularSuffix = issue.type === 'string' ? 'character' : 'element';
    const suffix = issue.minimum === 1 ? singularSuffix : `${singularSuffix}s`;

    return `${issue.minimum} ${suffix}`;
}

function formatCollection(issue: ZodTooSmallIssue): string {
    const predicate = formatPredicate(issue);
    const boundary = formatCollectionBoundary(issue);

    return `${issue.type} must contain ${predicate} ${boundary}`;
}

function formatNumeric(issue: ZodTooSmallIssue): string {
    const predicate = formatPredicate(issue);

    return `${issue.type} must be ${predicate} ${issue.minimum}`;
}

function formatDate(issue: ZodTooSmallIssue): string {
    const predicate = formatPredicate(issue);

    return `${issue.type} must be ${predicate} ${new Date(Number(issue.minimum)).toUTCString()}`;
}

export function formatTooSmallIssueMessage(issue: ZodTooSmallIssue): string {
    if (collectionTypes.has(issue.type)) {
        return formatCollection(issue);
    }

    if (numericTypes.has(issue.type)) {
        return formatNumeric(issue);
    }

    return formatDate(issue);
}
