import type { $ZodIssueInvalidType } from '@zod/core';
import { formatInput } from '../input.js';
import { findValueByPath } from '../path.js';

export function formatInvalidTypeIssueMessage(issue: $ZodIssueInvalidType, input: unknown): string {
    const result = findValueByPath(input, issue.path);

    if (result.found) {
        return `expected ${issue.expected}, but got ${formatInput(input)}`;
    }

    return `missing ${result.pathItemKind}`;
}
