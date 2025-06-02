import type { $ZodIssueUnrecognizedKeys } from 'zod/v4/core';
import { formatList } from '../list.js';

export function formatUnrecognizedKeysIssueMessage(issue: $ZodIssueUnrecognizedKeys): string {
    const formattedProperties = formatList(issue.keys, ' and ');
    const label = issue.keys.length > 1 ? 'properties' : 'property';
    return `unexpected additional ${label}: ${formattedProperties}`;
}
