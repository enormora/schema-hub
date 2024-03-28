import { getParsedType, type ZodInvalidUnionDiscriminatorIssue } from 'zod';
import { formatOneOfList } from '../list.js';
import { findValueByPath } from '../path.js';

export function formatInvalidUnionDiscriminatorIssueMessage(
    issue: ZodInvalidUnionDiscriminatorIssue,
    input: unknown
): string {
    const result = findValueByPath(input, issue.path);

    if (result.found) {
        const formattedOptions = formatOneOfList(issue.options);
        const receivedValue = result.value;
        const receivedType = getParsedType(receivedValue);
        return `invalid discriminator: expected ${formattedOptions}, but got ${receivedType}`;
    }

    return 'missing property';
}
