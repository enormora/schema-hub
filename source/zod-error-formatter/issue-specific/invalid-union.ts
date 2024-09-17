import {
    getParsedType,
    type Primitive,
    type ZodError,
    type ZodInvalidLiteralIssue,
    type ZodInvalidTypeIssue,
    type ZodInvalidUnionIssue,
    type ZodIssue
} from 'zod';
import { formatOneOfList, isParsedType, type ListValue } from '../list.js';
import { findValueByPath } from '../path.js';

function flattenAllIssues(errors: readonly ZodError[]): readonly ZodIssue[] {
    return errors.flatMap((error) => {
        return error.issues.flatMap((issue) => {
            if (issue.code === 'invalid_union') {
                return flattenAllIssues(issue.unionErrors);
            }
            return issue;
        });
    });
}

function isSamePath(pathA: readonly (number | string)[], pathB: readonly (number | string)[]): boolean {
    if (pathA.length !== pathB.length) {
        return false;
    }

    return pathA.every((element, index) => {
        return element === pathB[index];
    });
}

type SupportedIssueType = ZodInvalidLiteralIssue | ZodInvalidTypeIssue;
// eslint-disable-next-line @typescript-eslint/no-restricted-types -- we don’t have type-fest here
type BaseZodIssue = Omit<ZodIssue, 'fatal' | 'message'>;

function isSupportedIssueWithSamePath(
    issue: BaseZodIssue,
    expectedPath: readonly (number | string)[]
): issue is SupportedIssueType {
    return ['invalid_type', 'invalid_literal'].includes(issue.code) && isSamePath(issue.path, expectedPath);
}

function filterSupportedIssuesWithSamePath(
    issues: readonly BaseZodIssue[],
    expectedPath: readonly (number | string)[]
): readonly SupportedIssueType[] {
    return issues.filter((issue): issue is SupportedIssueType => {
        return isSupportedIssueWithSamePath(issue, expectedPath);
    });
}

function determineReceivedValue(issue: SupportedIssueType): string {
    if (issue.code === 'invalid_type') {
        return issue.received;
    }

    return getParsedType(issue.received);
}

function isPrimitive(value: unknown): value is Primitive {
    return ['string', 'number', 'symbol', 'bigint', 'boolean', 'undefined'].includes(typeof value) || value === null;
}

function determineExpectedValue(issue: SupportedIssueType): ListValue {
    if (issue.code === 'invalid_type') {
        return { type: issue.expected };
    }

    if (isPrimitive(issue.expected)) {
        return issue.expected;
    }

    return JSON.stringify(issue.expected);
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
export function formatInvalidUnionIssueMessage(issue: ZodInvalidUnionIssue, input: unknown): string {
    const result = findValueByPath(input, issue.path);

    if (result.found) {
        const memberIssues = flattenAllIssues(issue.unionErrors);
        const supportedIssues = filterSupportedIssuesWithSamePath(memberIssues, issue.path);
        if (memberIssues.length === supportedIssues.length) {
            const [firstIssue] = supportedIssues;

            if (firstIssue !== undefined) {
                const expectedValues = removeDuplicateListValues(supportedIssues.map(determineExpectedValue));
                const receivedValue = determineReceivedValue(firstIssue);

                return `invalid value: expected ${formatOneOfList(expectedValues)}, but got ${receivedValue}`;
            }
        }

        return 'invalid value doesn’t match expected union';
    }

    return `missing ${result.pathItemKind}`;
}
