import { z } from 'zod/v4-mini';
import type { $ZodError, $ZodType, output as TypeOf } from 'zod/v4/core';
import type { NonEmptyArray } from '../tuple/non-empty-array.ts';
import { formatIssue } from './format-issue.ts';
import { createFormattedZodError, type FormattedZodError } from './formatted-error.ts';

export function formatZodError(error: Readonly<$ZodError>, input: unknown): FormattedZodError {
    const formattedIssues = error.issues.map(function (issue) {
        return formatIssue(issue, input);
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- a ZodError always carries at least one issue, so the mapped list is non-empty
    return createFormattedZodError(formattedIssues as unknown as NonEmptyArray<string>);
}

export function parse<Schema extends $ZodType>(schema: Schema, value: unknown): TypeOf<Schema> {
    const result = z.safeParse(schema, value);

    if (result.success) {
        return result.data;
    }

    throw formatZodError(result.error, value);
}

export type SafeParseSuccessResult<Output> = {
    readonly success: true;
    readonly data: Output;
};

export type SafeParseErrorResult = {
    readonly success: false;
    readonly error: FormattedZodError;
};

export type SafeParseResult<Output> = SafeParseErrorResult | SafeParseSuccessResult<Output>;

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

export { FormattedZodError } from './formatted-error.ts';
