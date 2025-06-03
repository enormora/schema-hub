import { z } from 'zod/v4-mini';
import type { $ZodError, $ZodType, output as TypeOf } from 'zod/v4/core';
import type { NonEmptyArray } from '../tuple/non-empty-array.js';
import { formatIssue } from './format-issue.js';
import { createFormattedZodError, type FormattedZodError } from './formatted-error.js';

export function formatZodError(error: $ZodError, input: unknown): FormattedZodError {
    const formattedIssues = error.issues.map((issue) => {
        return formatIssue(issue, input);
    });
    return createFormattedZodError(formattedIssues as unknown as NonEmptyArray<string>);
}

export function parse<Schema extends $ZodType>(schema: Schema, value: unknown): TypeOf<Schema> {
    const result = z.safeParse(schema, value);

    if (result.success) {
        return result.data;
    }

    throw formatZodError(result.error, value);
}

type SafeParseSuccessResult<Output> = {
    success: true;
    data: Output;
};

type SafeParseErrorResult = {
    success: false;
    error: FormattedZodError;
};

type SafeParseResult<Output> = SafeParseErrorResult | SafeParseSuccessResult<Output>;

export function safeParse<Schema extends $ZodType>(
    schema: Schema,
    value: unknown
): SafeParseResult<TypeOf<Schema>> {
    const result = z.safeParse(schema, value);

    if (result.success) {
        return { success: true, data: result.data };
    }

    return { success: false, error: formatZodError(result.error, value) };
}

export { FormattedZodError } from './formatted-error.js';
