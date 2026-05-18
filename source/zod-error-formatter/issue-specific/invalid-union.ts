import {
    type $ZodIssue,
    type $ZodIssueInvalidType,
    type $ZodIssueInvalidUnion,
    type $ZodIssueInvalidValue,
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
    const expectedValues = removeDuplicateListValues(candidate.issues.map(determineExpectedValue));
    const valueAtCommonPath = findValueByPath(inputAtUnion, candidate.commonPath);
    if (!valueAtCommonPath.found) {
        const message = `missing ${valueAtCommonPath.pathItemKind}; expected ${formatOneOfList(expectedValues)}`;
        return prependPath(candidate.commonPath, message);
    }

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

type RenderedIssue = { readonly issue: $ZodIssue; readonly rendered: string; };

type RenderedAlternative = readonly RenderedIssue[];

function renderPerAlternative(
    alternatives: readonly AlternativeBucket[],
    inputAtUnion: unknown,
    formatChildIssue: FormatChildIssue
): readonly RenderedAlternative[] {
    return alternatives.map((bucket) => {
        return bucket.map((issue) => {
            return { issue, rendered: formatChildIssue(issue, inputAtUnion) };
        });
    });
}

// Returns rendered strings present (by exact match) in every alternative.
// Each string is reported once even if an alternative carries it multiple times,
// matching the "factor out shared constraints" semantics.
function findCommonRenderedStrings(perAlternative: readonly RenderedAlternative[]): readonly string[] {
    const [first, ...rest] = perAlternative;
    if (first === undefined) {
        return [];
    }
    const uniqueFirst = Array.from(
        new Set(first.map((item) => {
            return item.rendered;
        }))
    );
    return uniqueFirst.filter((rendered) => {
        return rest.every((other) => {
            return other.some((candidate) => {
                return candidate.rendered === rendered;
            });
        });
    });
}

function reduceAlternatives(
    perAlternative: readonly RenderedAlternative[],
    commonRendered: readonly string[]
): readonly AlternativeBucket[] {
    if (commonRendered.length === 0) {
        return perAlternative.map((bucket) => {
            return bucket.map((item) => {
                return item.issue;
            });
        });
    }
    return perAlternative.map((bucket) => {
        return bucket
            .filter((item) => {
                return !commonRendered.includes(item.rendered);
            })
            .map((item) => {
                return item.issue;
            });
    });
}

type Group = { readonly indices: readonly number[]; readonly body: readonly string[]; };

// Groups alternatives that produce byte-identical rendered bodies so the output
// reads "alternatives 1, 3: ..." instead of repeating the same line. Lossless:
// two alternatives with identical rendered output impose the same constraints
// at this input, so listing them once preserves all information.
function groupAlternativesByBody(perAlternative: readonly RenderedAlternative[]): readonly Group[] {
    const groups: Group[] = [];
    perAlternative.forEach((bucket, index) => {
        if (bucket.length === 0) {
            return;
        }
        const body = bucket.map((item) => {
            return item.rendered;
        });
        const key = JSON.stringify(body);
        const existing = groups.find((group) => {
            return JSON.stringify(group.body) === key;
        });
        if (existing === undefined) {
            groups.push({ indices: [index + 1], body });
        } else {
            (existing.indices as number[]).push(index + 1);
        }
    });
    return groups;
}

function renderAlternativeLabel(indices: readonly number[]): string {
    if (indices.length === 1) {
        return `alternative ${indices[0]}`;
    }
    return `alternatives ${indices.join(', ')}`;
}

function enumerateAlternatives(
    alternatives: readonly AlternativeBucket[],
    inputAtUnion: unknown,
    formatChildIssue: FormatChildIssue
): string | null {
    const perAlternative = renderPerAlternative(alternatives, inputAtUnion, formatChildIssue);
    const groups = groupAlternativesByBody(perAlternative);
    if (groups.length === 0) {
        return null;
    }
    const lines = groups.map((group) => {
        return `${renderAlternativeLabel(group.indices)}: ${group.body.join('; ')}`;
    });
    return `no union alternative matched: ${lines.join(' | ')}`;
}

function joinWithCommon(commonRendered: readonly string[], rest: string): string {
    if (commonRendered.length === 0) {
        return rest;
    }
    return `${commonRendered.join('; ')}; ${rest}`;
}

// Factor out issues that appear (by rendered-message equality) in every
// alternative — they are hard requirements of the union regardless of which
// branch the user picks. After factoring, retry collapse on the reduced
// alternatives so e.g. a discriminator field can OR-merge once shared
// constraints have been lifted. Returns null only when there is genuinely
// nothing reportable.
// If any alternative is fully described by the common issues, fixing those
// is sufficient — the union passes via that alternative. Listing the other
// alternatives' extra constraints would be misleading. Also retries collapse
// on the reduced alternatives so a discriminator field can OR-merge cleanly.
function tryFactoredCollapse(
    commonRendered: readonly string[],
    reducedAlternatives: readonly AlternativeBucket[],
    inputAtUnion: unknown
): string | null {
    const anyReducedEmpty = reducedAlternatives.some((bucket) => {
        return bucket.length === 0;
    });
    if (commonRendered.length > 0 && anyReducedEmpty) {
        return commonRendered.join('; ');
    }
    const reducedCollapsed = tryCollapseToOneOfMessage(reducedAlternatives, inputAtUnion);
    if (reducedCollapsed !== null) {
        return joinWithCommon(commonRendered, reducedCollapsed);
    }
    return null;
}

function enumerateOrCommonFallback(
    reducedAlternatives: readonly AlternativeBucket[],
    commonRendered: readonly string[],
    inputAtUnion: unknown,
    formatChildIssue: FormatChildIssue
): string | null {
    const enumerated = enumerateAlternatives(reducedAlternatives, inputAtUnion, formatChildIssue);
    if (enumerated !== null) {
        return joinWithCommon(commonRendered, enumerated);
    }
    return commonRendered.length > 0 ? commonRendered.join('; ') : null;
}

function formatAlternativesWithFactoring(
    alternatives: readonly AlternativeBucket[],
    inputAtUnion: unknown,
    formatChildIssue: FormatChildIssue
): string | null {
    if (alternatives.length === 0) {
        return null;
    }
    const perAlternative = renderPerAlternative(alternatives, inputAtUnion, formatChildIssue);
    const commonRendered = findCommonRenderedStrings(perAlternative);
    const reducedAlternatives = reduceAlternatives(perAlternative, commonRendered);
    const factored = tryFactoredCollapse(commonRendered, reducedAlternatives, inputAtUnion);
    if (factored !== null) {
        return factored;
    }
    return enumerateOrCommonFallback(reducedAlternatives, commonRendered, inputAtUnion, formatChildIssue);
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

    const factored = formatAlternativesWithFactoring(relativeAlternatives, valueAtUnion, formatChildIssue);
    if (factored !== null) {
        return factored;
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
