import type { NonEmptyArray } from '../tuple/non-empty-array.ts';

function formatCombinedMessage(issues: NonEmptyArray<string>): string {
    if (issues.length === 1) {
        return `Validation failed: ${issues[0]}`;
    }

    return `Validation failed with ${issues.length} issues:\n- ${issues.join('\n- ')}`;
}

export class FormattedZodError extends Error {
    // eslint-disable-next-line restricted-syntax-typescript/no-public-class-property -- issues is part of the error's public API
    public readonly issues: NonEmptyArray<string>;

    public constructor(issues: NonEmptyArray<string>, options?: ErrorOptions) {
        const fullMessage = formatCombinedMessage(issues);
        super(fullMessage, options);

        this.name = 'FormattedZodError';
        this.issues = issues;
    }
}

export function createFormattedZodError(issues: NonEmptyArray<string>): FormattedZodError {
    return new FormattedZodError(issues);
}
