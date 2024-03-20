import { getParsedType, type Primitive, type ZodInvalidLiteralIssue } from 'zod';

function formatPrimitiveValue(value: Primitive): string {
    if (typeof value === 'bigint') {
        return value.toString();
    }
    return JSON.stringify(value);
}

export function formatInvalidLiteralIssueMessage(issue: ZodInvalidLiteralIssue): string {
    const received = getParsedType(issue.received);
    const expected = formatPrimitiveValue(issue.expected as Primitive);
    return `invalid literal: expected ${expected}, but got ${received}`;
}
