import type { NonEmptyArray } from '../tuple/non-empty-array.js';

function formatCombinedMessage(issues: NonEmptyArray<string>): string {
    if (issues.length === 1) {
        return `Validation failed: ${issues[0]}`;
    }

    return `Validation failed with ${issues.length} issues:\n- ${issues.join('\n- ')}`;
}

export class FormattedZodError extends Error {
    public issues: NonEmptyArray<string>;

    constructor(issues: NonEmptyArray<string>) {
        const fullMessage = formatCombinedMessage(issues);
        super(fullMessage);
        // eslint-disable-next-line functional/no-this-expressions -- sub-classing errors is one of the few exceptions where classes are useful
        this.issues = issues;
    }
}

export function createFormattedZodError(issues: NonEmptyArray<string>): FormattedZodError {
    return new FormattedZodError(issues);
}
