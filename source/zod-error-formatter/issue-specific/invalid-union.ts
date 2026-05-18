import {
    type $ZodIssue,
    type $ZodIssueInvalidType,
    type $ZodIssueInvalidUnion,
    type $ZodIssueInvalidValue,
    type $ZodType,
    util
} from 'zod/v4/core';
import { formatOneOfList, isParsedType, type ListValue } from '../list.js';
import { findValueByPath, formatPath, isNonEmptyPath } from '../path.js';

type FormatChildIssue = (issue: $ZodIssue, input: unknown) => string;

type AlternativeBucket = readonly $ZodIssue[];

type SupportedIssueType = $ZodIssueInvalidType | $ZodIssueInvalidValue;

type CollapseCandidate = {
    readonly commonPath: readonly PropertyKey[];
    readonly issues: readonly SupportedIssueType[];
};

function isSupportedIssue(issue: $ZodIssue): issue is SupportedIssueType {
    return issue.code === 'invalid_type' || issue.code === 'invalid_value';
}

function isPrimitive(value: unknown): value is util.Primitive {
    return ['string', 'number', 'symbol', 'bigint', 'boolean', 'undefined'].includes(typeof value) || value === null;
}

function isSamePath(pathA: readonly PropertyKey[], pathB: readonly PropertyKey[]): boolean {
    if (pathA.length !== pathB.length) {
        return false;
    }

    return pathA.every((element, index) => {
        return element === pathB[index];
    });
}

function prependPath(path: readonly PropertyKey[], message: string): string {
    if (isNonEmptyPath(path)) {
        return `at ${formatPath(path)}: ${message}`;
    }
    return message;
}

function determineExpectedValue(issue: SupportedIssueType): ListValue {
    if (issue.code === 'invalid_type') {
        return { type: issue.expected as $ZodType['_zod']['def']['type'] };
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

// When a top-level alternative's only issue is itself an invalid_union, replace
// that bucket with the nested union's alternatives. This preserves precision:
// every constraint that a deeper union imposed becomes its own effective
// alternative without merging unrelated alternatives together.
function expandAlternatives(alternatives: readonly (readonly $ZodIssue[])[]): readonly AlternativeBucket[] {
    return alternatives.flatMap((bucket): readonly AlternativeBucket[] => {
        if (bucket.length === 1) {
            const [only] = bucket;
            if (only?.code === 'invalid_union') {
                return expandAlternatives(only.errors);
            }
        }
        return [bucket];
    });
}

function stripPathPrefix<Issue extends $ZodIssue>(issue: Issue, prefix: readonly PropertyKey[]): Issue {
    if (prefix.length === 0) {
        return issue;
    }
    return { ...issue, path: issue.path.slice(prefix.length) };
}

function makeRelativeAlternatives(
    alternatives: readonly AlternativeBucket[],
    unionPath: readonly PropertyKey[]
): readonly AlternativeBucket[] {
    return alternatives.map((bucket) => {
        return bucket.map((subIssue) => {
            return stripPathPrefix(subIssue, unionPath);
        });
    });
}

function extractSingleSupportedIssue(bucket: AlternativeBucket): SupportedIssueType | null {
    if (bucket.length !== 1) {
        return null;
    }
    const [only] = bucket;
    if (only === undefined || !isSupportedIssue(only)) {
        return null;
    }
    return only;
}

function collectSingleSupportedIssues(
    alternatives: readonly AlternativeBucket[]
): readonly SupportedIssueType[] | null {
    const issues: SupportedIssueType[] = [];
    for (const bucket of alternatives) {
        const single = extractSingleSupportedIssue(bucket);
        if (single === null) {
            return null;
        }
        issues.push(single);
    }
    return issues;
}

function findCommonPath(issues: readonly SupportedIssueType[]): readonly PropertyKey[] | null {
    const [first, ...rest] = issues;
    if (first === undefined) {
        return null;
    }
    const matchesFirst = rest.every((issue) => {
        return isSamePath(first.path, issue.path);
    });
    return matchesFirst ? first.path : null;
}

// Returns the collapse candidate if every alternative produces exactly one
// supported issue at the same relative path. Otherwise returns null. The single-
// issue-per-alternative invariant is what makes the OR-merge safe: multi-issue
// alternatives would force a cross-field merge that loses correlation.
function findCollapseCandidate(alternatives: readonly AlternativeBucket[]): CollapseCandidate | null {
    const issues = collectSingleSupportedIssues(alternatives);
    if (issues === null) {
        return null;
    }
    const commonPath = findCommonPath(issues);
    if (commonPath === null) {
        return null;
    }
    return { commonPath, issues };
}

function renderCollapsedMessage(candidate: CollapseCandidate, inputAtUnion: unknown): string {
    const valueAtCommonPath = findValueByPath(inputAtUnion, candidate.commonPath);
    if (!valueAtCommonPath.found) {
        return prependPath(candidate.commonPath, `missing ${valueAtCommonPath.pathItemKind}`);
    }

    const expectedValues = removeDuplicateListValues(candidate.issues.map(determineExpectedValue));
    const receivedValue = util.getParsedType(valueAtCommonPath.value);
    const message = `invalid value: expected ${formatOneOfList(expectedValues)}, but got ${receivedValue}`;
    return prependPath(candidate.commonPath, message);
}

function tryCollapseToOneOfMessage(
    alternatives: readonly AlternativeBucket[],
    inputAtUnion: unknown
): string | null {
    const candidate = findCollapseCandidate(alternatives);
    if (candidate === null) {
        return null;
    }
    return renderCollapsedMessage(candidate, inputAtUnion);
}

function formatEnumeratedAlternatives(
    alternatives: readonly AlternativeBucket[],
    inputAtUnion: unknown,
    formatChildIssue: FormatChildIssue
): string | null {
    const renderedAlternatives = alternatives
        .map((bucket, index): string | null => {
            if (bucket.length === 0) {
                return null;
            }
            const childMessages = bucket.map((issue) => {
                return formatChildIssue(issue, inputAtUnion);
            });
            return `alternative ${index + 1}: ${childMessages.join('; ')}`;
        })
        .filter((line): line is string => {
            return line !== null;
        });

    if (renderedAlternatives.length === 0) {
        return null;
    }

    return `no union alternative matched: ${renderedAlternatives.join(' | ')}`;
}

function buildUnionMessage(
    issue: $ZodIssueInvalidUnion,
    valueAtUnion: unknown,
    formatChildIssue: FormatChildIssue
): string {
    const expanded = expandAlternatives(issue.errors);
    const relativeAlternatives = makeRelativeAlternatives(expanded, issue.path);

    const collapsed = tryCollapseToOneOfMessage(relativeAlternatives, valueAtUnion);
    if (collapsed !== null) {
        return collapsed;
    }

    const enumerated = formatEnumeratedAlternatives(relativeAlternatives, valueAtUnion, formatChildIssue);
    if (enumerated !== null) {
        return enumerated;
    }

    return 'invalid value doesn’t match expected union';
}

export function formatInvalidUnionIssueMessage(
    issue: $ZodIssueInvalidUnion,
    input: unknown,
    formatChildIssue: FormatChildIssue
): string {
    const valueAtUnion = findValueByPath(input, issue.path);

    if (!valueAtUnion.found) {
        return prependPath(issue.path, `missing ${valueAtUnion.pathItemKind}`);
    }

    return prependPath(issue.path, buildUnionMessage(issue, valueAtUnion.value, formatChildIssue));
}
