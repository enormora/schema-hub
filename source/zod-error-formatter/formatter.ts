import type { TypeOf, ZodError, ZodSchema } from 'zod';
import { formatIssue } from './format-issue.js';
import { createFormattedZodError, type FormattedZodError } from './formatted-error.js';

export function formatZodError(error: ZodError, input: unknown): FormattedZodError {
    const formattedIssues = error.issues.map((issue) => {
        return formatIssue(issue, input);
    });
    return createFormattedZodError(formattedIssues);
}

export function parse<Schema extends ZodSchema<unknown>>(schema: Schema, value: unknown): TypeOf<Schema> {
    const result = schema.safeParse(value);

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

export function safeParse<Schema extends ZodSchema<unknown>>(
    schema: Schema,
    value: unknown
): SafeParseResult<TypeOf<Schema>> {
    const result = schema.safeParse(value);

    if (result.success) {
        return { success: true, data: result.data };
    }

    return { success: false, error: formatZodError(result.error, value) };
}

export { FormattedZodError } from './formatted-error.js';
