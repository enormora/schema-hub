import type { ZodTooBigIssue } from 'zod';

const collectionTypes = new Set(['string', 'array', 'set']);
const numericTypes = new Set(['bigint', 'number']);

function formatInclusivePredicate(
    issue: ZodTooBigIssue,
    inclusiveVariant: string,
    nonInclusiveVariant: string
): string {
    if (issue.inclusive) {
        return inclusiveVariant;
    }
    return nonInclusiveVariant;
}

function formatPredicate(issue: ZodTooBigIssue): string {
    if (issue.exact === true) {
        return 'exactly';
    }

    if (collectionTypes.has(issue.type)) {
        return formatInclusivePredicate(issue, 'at most', 'less than');
    }

    if (numericTypes.has(issue.type)) {
        return formatInclusivePredicate(issue, 'less than or equal to', 'less than');
    }

    return formatInclusivePredicate(issue, 'smaller than or equal to', 'smaller than');
}

function formatCollectionBoundary(issue: ZodTooBigIssue): string {
    const singularSuffix = issue.type === 'string' ? 'character' : 'element';
    const suffix = issue.maximum === 1 ? singularSuffix : `${singularSuffix}s`;

    return `${issue.maximum} ${suffix}`;
}

function formatCollection(issue: ZodTooBigIssue): string {
    const predicate = formatPredicate(issue);
    const boundary = formatCollectionBoundary(issue);

    return `${issue.type} must contain ${predicate} ${boundary}`;
}

function formatNumeric(issue: ZodTooBigIssue): string {
    const predicate = formatPredicate(issue);

    return `${issue.type} must be ${predicate} ${issue.maximum}`;
}

function formatDate(issue: ZodTooBigIssue): string {
    const predicate = formatPredicate(issue);

    return `${issue.type} must be ${predicate} ${new Date(Number(issue.maximum)).toUTCString()}`;
}

export function formatTooBigIssueMessage(issue: ZodTooBigIssue): string {
    if (collectionTypes.has(issue.type)) {
        return formatCollection(issue);
    }

    if (numericTypes.has(issue.type)) {
        return formatNumeric(issue);
    }

    return formatDate(issue);
}
