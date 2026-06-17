import type { $ZodIssueTooBig } from 'zod/v4/core';
import { type BoundaryPhrases, formatBoundaryIssue } from './boundary-issue.ts';

const phrases: BoundaryPhrases = {
    collectionInclusive: 'at most',
    collectionNonInclusive: 'less than',
    numericInclusive: 'less than or equal to',
    numericNonInclusive: 'less than',
    dateInclusive: 'smaller than or equal to',
    dateNonInclusive: 'smaller than'
};

export function formatTooBigIssueMessage(issue: $ZodIssueTooBig): string {
    return formatBoundaryIssue(issue, issue.maximum, phrases);
}
