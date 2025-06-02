import {
    type $ZodIssue,
    type $ZodIssueInvalidType,
    type $ZodIssueInvalidUnion,
    type $ZodIssueInvalidValue,
    util
} from 'zod/v4/core';
import { formatOneOfList, isParsedType, type ListValue } from '../list.js';
import { findValueByPath } from '../path.js';

function flattenAllIssues(errors: readonly $ZodIssue[][]): readonly $ZodIssue[] {
    return errors.flatMap((issues) => {
        return issues.flatMap((issue) => {
            if (issue.code === 'invalid_union') {
                return flattenAllIssues(issue.errors);
            }
            return issue;
        });
    });
}

function isSamePath(pathA: readonly PropertyKey[], pathB: readonly PropertyKey[]): boolean {
    if (pathA.length !== pathB.length) {
        return false;
    }

    return pathA.every((element, index) => {
        return element === pathB[index];
    });
}

type SupportedIssueType = $ZodIssueInvalidType | $ZodIssueInvalidValue;
// eslint-disable-next-line @typescript-eslint/no-restricted-types -- we don’t have type-fest here
type BaseZodIssue = Omit<$ZodIssue, 'message'>;

function isSupportedIssueWithSamePath(
    issue: BaseZodIssue,
    expectedPath: readonly PropertyKey[]
): issue is SupportedIssueType {
    return ['invalid_type', 'invalid_value'].includes(issue.code as string) && isSamePath(issue.path, expectedPath);
}

function filterSupportedIssuesWithSamePath(
    issues: readonly BaseZodIssue[],
    expectedPath: readonly (PropertyKey)[]
): readonly SupportedIssueType[] {
    return issues.filter((issue): issue is SupportedIssueType => {
        return isSupportedIssueWithSamePath(issue, expectedPath);
    });
}

function isPrimitive(value: unknown): value is util.Primitive {
    return ['string', 'number', 'symbol', 'bigint', 'boolean', 'undefined'].includes(typeof value) || value === null;
}

function determineExpectedValue(issue: SupportedIssueType): ListValue {
    if (issue.code === 'invalid_type') {
        return { type: issue.expected };
    }

    if (isPrimitive(issue.values[0])) {
        return issue.values[0];
    }

    return JSON.stringify(issue.values);
}

function hasValue(values: readonly ListValue[], expectedValue: ListValue): boolean {
    return values.some((value) => {
        if (isParsedType(value) && isParsedType(expectedValue)) {
            return value.type === expectedValue.type;
        }
        return value === expectedValue;
    });
}

function removeDuplicateListValues(values: readonly ListValue[]): readonly ListValue[] {
    const uniqueValues: ListValue[] = [];

    for (const value of values) {
        if (!hasValue(uniqueValues, value)) {
            uniqueValues.push(value);
        }
    }

    return uniqueValues;
}

// eslint-disable-next-line max-statements -- no idea how to refactor right now
export function formatInvalidUnionIssueMessage(issue: $ZodIssueInvalidUnion, input: unknown): string {
    const result = findValueByPath(input, issue.path);

    if (result.found) {
        const memberIssues = flattenAllIssues(issue.errors);
        const supportedIssues = filterSupportedIssuesWithSamePath(memberIssues, []);
        if (memberIssues.length === supportedIssues.length) {
            const [firstIssue] = supportedIssues;

            if (firstIssue !== undefined) {
                const expectedValues = removeDuplicateListValues(supportedIssues.map(determineExpectedValue));
                const receivedValue = util.getParsedType(result.value);

                return `invalid value: expected ${formatOneOfList(expectedValues)}, but got ${receivedValue}`;
            }
        }

        return 'invalid value doesn’t match expected union';
    }

    return `missing ${result.pathItemKind}`;
}
