import type { ZodInvalidUnionDiscriminatorIssue } from 'zod';
import { formatOneOfList } from '../list.js';

export function formatInvalidUnionDiscriminatorIssueMessage(issue: ZodInvalidUnionDiscriminatorIssue): string {
    const formattedOptions = formatOneOfList(issue.options);
    return `invalid discriminator value, expected ${formattedOptions}`;
}
