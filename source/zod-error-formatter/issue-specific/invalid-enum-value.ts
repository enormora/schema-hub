import { getParsedType, type ZodInvalidEnumValueIssue } from 'zod';
import { formatOneOfList } from '../list.js';

export function formatInvalidEnumValueIssueMessage(issue: ZodInvalidEnumValueIssue): string {
    const { options, received } = issue;
    const receivedType = getParsedType(received);
    const formattedOptions = formatOneOfList(options);

    return `invalid enum value: expected ${formattedOptions}, but got ${receivedType}`;
}
