import { type $ZodIssueInvalidType, util } from 'zod/v4/core';
import { findValueByPath } from '../path.js';

export function formatInvalidTypeIssueMessage(issue: $ZodIssueInvalidType, input: unknown): string {
    const result = findValueByPath(input, issue.path);

    if (result.found) {
        return `expected ${issue.expected}, but got ${util.getParsedType(result.value)}`;
    }

    return `missing ${result.pathItemKind}`;
}
