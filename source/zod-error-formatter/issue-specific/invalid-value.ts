import { type $ZodIssueInvalidValue, util } from 'zod/v4/core';
import { formatOneOfList } from '../list.ts';
import { findValueByPath } from '../path.ts';

export function formatInvalidValueIssueMessage(
    issue: $ZodIssueInvalidValue,
    input: unknown
): string {
    const result = findValueByPath(input, issue.path);

    if (result.found) {
        const received = util.getParsedType(result.value);
        const expected = formatOneOfList(issue.values);
        return `invalid value: expected ${expected}, but got ${received}`;
    }

    return `missing ${result.pathItemKind}; expected ${formatOneOfList(issue.values)}`;
}
