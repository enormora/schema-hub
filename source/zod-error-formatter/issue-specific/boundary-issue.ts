import type { $ZodIssueTooBig, $ZodIssueTooSmall } from 'zod/v4/core';

type BoundaryIssue = $ZodIssueTooBig | $ZodIssueTooSmall;

export type BoundaryPhrases = {
    readonly collectionInclusive: string;
    readonly collectionNonInclusive: string;
    readonly numericInclusive: string;
    readonly numericNonInclusive: string;
    readonly dateInclusive: string;
    readonly dateNonInclusive: string;
};

const collectionTypes = new Set(['string', 'array', 'set']);
const numericTypes = new Set(['bigint', 'number']);

function inclusivePredicate(issue: BoundaryIssue, inclusiveVariant: string, nonInclusiveVariant: string): string {
    if (issue.inclusive === true) {
        return inclusiveVariant;
    }
    return nonInclusiveVariant;
}

function formatPredicate(issue: BoundaryIssue, phrases: BoundaryPhrases): string {
    if (issue.exact === true) {
        return 'exactly';
    }

    if (collectionTypes.has(issue.origin)) {
        return inclusivePredicate(issue, phrases.collectionInclusive, phrases.collectionNonInclusive);
    }

    if (numericTypes.has(issue.origin)) {
        return inclusivePredicate(issue, phrases.numericInclusive, phrases.numericNonInclusive);
    }

    return inclusivePredicate(issue, phrases.dateInclusive, phrases.dateNonInclusive);
}

function formatCollectionBoundary(issue: BoundaryIssue, boundary: bigint | number): string {
    const singularSuffix = issue.origin === 'string' ? 'character' : 'element';
    const suffix = boundary === 1 ? singularSuffix : `${singularSuffix}s`;

    return `${boundary} ${suffix}`;
}

export function formatBoundaryIssue(
    issue: BoundaryIssue,
    boundary: bigint | number,
    phrases: BoundaryPhrases
): string {
    const predicate = formatPredicate(issue, phrases);

    if (collectionTypes.has(issue.origin)) {
        return `${issue.origin} must contain ${predicate} ${formatCollectionBoundary(issue, boundary)}`;
    }

    if (numericTypes.has(issue.origin)) {
        return `${issue.origin} must be ${predicate} ${boundary}`;
    }

    return `${issue.origin} must be ${predicate} ${new Date(Number(boundary)).toUTCString()}`;
}
