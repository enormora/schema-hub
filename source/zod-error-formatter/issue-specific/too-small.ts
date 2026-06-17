import type { $ZodIssueTooSmall } from 'zod/v4/core';
import { type BoundaryPhrases, formatBoundaryIssue } from './boundary-issue.ts';

const phrases: BoundaryPhrases = {
    collectionInclusive: 'at least',
    collectionNonInclusive: 'more than',
    numericInclusive: 'greater than or equal to',
    numericNonInclusive: 'greater than',
    dateInclusive: 'greater than or equal to',
    dateNonInclusive: 'greater than'
};

export function formatTooSmallIssueMessage(issue: $ZodIssueTooSmall): string {
    return formatBoundaryIssue(issue, issue.minimum, phrases);
}
