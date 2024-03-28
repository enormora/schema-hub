import { getParsedType, type Primitive, type ZodInvalidLiteralIssue } from 'zod';
import { findValueByPath } from '../path.js';

function formatPrimitiveValue(value: Primitive): string {
    if (typeof value === 'bigint') {
        return value.toString();
    }
    return JSON.stringify(value);
}

export function formatInvalidLiteralIssueMessage(issue: ZodInvalidLiteralIssue, input: unknown): string {
    const result = findValueByPath(input, issue.path);

    if (result.found) {
        const received = getParsedType(issue.received);
        const expected = formatPrimitiveValue(issue.expected as Primitive);
        return `invalid literal: expected ${expected}, but got ${received}`;
    }

    return `missing ${result.pathItemKind}`;
}
