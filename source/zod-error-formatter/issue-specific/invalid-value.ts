import { type $ZodIssueInvalidValue, util } from 'zod/v4/core';
import { formatList } from '../list.js';
import { findValueByPath } from '../path.js';

export function formatInvalidValueIssueMessage(
    issue: $ZodIssueInvalidValue,
    input: unknown
): string {
    const result = findValueByPath(input, issue.path);

    if (result.found) {
        const received = util.getParsedType(result.value);
        const expected = formatList(issue.values, ',');
        return `invalid literal: expected ${expected}, but got ${received}`;
    }

    return `missing ${result.pathItemKind}`;
}
