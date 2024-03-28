import type { ZodInvalidTypeIssue } from 'zod';
import { findValueByPath } from '../path.js';

export function formatInvalidTypeIssueMessage(issue: ZodInvalidTypeIssue, input: unknown): string {
    const result = findValueByPath(input, issue.path);

    if (result.found) {
        return `expected ${issue.expected}, but got ${issue.received}`;
    }

    return `missing ${result.pathItemKind}`;
}
