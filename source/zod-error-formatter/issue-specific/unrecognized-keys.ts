import type { ZodUnrecognizedKeysIssue } from 'zod';
import { formatList } from '../list.js';

export function formatUnrecognizedKeysIssueMessage(issue: ZodUnrecognizedKeysIssue): string {
    const formattedProperties = formatList(issue.keys, ' and ');
    const label = issue.keys.length > 1 ? 'properties' : 'property';
    return `unexpected additional ${label}: ${formattedProperties}`;
}
