import type { ZodInvalidTypeIssue } from 'zod';

export function formatInvalidTypeIssueMessage(issue: ZodInvalidTypeIssue): string {
    return `expected ${issue.expected}, but got ${issue.received}`;
}
