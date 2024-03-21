import type { ZodNotMultipleOfIssue } from 'zod';

export function formatNotMultipleOfIssueMessage(issue: ZodNotMultipleOfIssue): string {
    return `number must be multiple of ${issue.multipleOf}`;
}
