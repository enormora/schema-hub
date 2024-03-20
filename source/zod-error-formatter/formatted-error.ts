function formatCombinedMessage(issues: readonly string[]): string {
    if (issues.length === 0) {
        return 'Validation failed, but there are no issues';
    }

    if (issues.length === 1) {
        return `Validation failed: ${issues[0]}`;
    }

    return `Validation failed with ${issues.length} issues:\n- ${issues.join('\n- ')}`;
}

export class FormattedZodError extends Error {
    public issues: readonly string[];

    constructor(issues: readonly string[]) {
        const fullMessage = formatCombinedMessage(issues);
        super(fullMessage);
        // eslint-disable-next-line functional/no-this-expressions -- sub-classing errors is one of the few exceptions where classes are useful
        this.issues = issues;
    }
}

export function createFormattedZodError(issues: readonly string[]): FormattedZodError {
    return new FormattedZodError(issues);
}
