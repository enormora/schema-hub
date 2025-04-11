import type { $ZodIssueNotMultipleOf } from 'zod/v4/core';

export function formatNotMultipleOfIssueMessage(issue: $ZodIssueNotMultipleOf): string {
    return `number must be multiple of ${issue.divisor}`;
}
