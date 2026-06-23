import type {
    $ZodIssue,
    $ZodIssueInvalidValue,
    $ZodIssueUnrecognizedKeys,
    util
} from 'zod/v4/core';
import { findValueByPath } from '../path.ts';

export type AlternativeBucket = readonly $ZodIssue[];

type Selection = {
    readonly alternatives: readonly AlternativeBucket[];
};

export type InvalidValuePathCandidate = {
    readonly path: readonly PropertyKey[];
    readonly issues: readonly $ZodIssueInvalidValue[];
};

export function isInvalidValueIssue(issue: $ZodIssue): issue is $ZodIssueInvalidValue {
    return issue.code === 'invalid_value';
}

function isUnrecognizedKeysIssue(issue: $ZodIssue): issue is $ZodIssueUnrecognizedKeys {
    return issue.code === 'unrecognized_keys';
}

export function isPrimitive(value: unknown): value is util.Primitive {
    return [ 'string', 'number', 'symbol', 'bigint', 'boolean', 'undefined' ].includes(typeof value) || value === null;
}

export function isSamePath(pathA: readonly PropertyKey[], pathB: readonly PropertyKey[]): boolean {
    if (pathA.length !== pathB.length) {
        return false;
    }

    return pathA.every(function (element, index) {
        return element === pathB[index];
    });
}

function isSameAlternativeSet(selectionA: Selection, selectionB: Selection): boolean {
    if (selectionA.alternatives.length !== selectionB.alternatives.length) {
        return false;
    }
    return selectionA.alternatives.every(function (alternative, index) {
        return alternative === selectionB.alternatives[index];
    });
}

function getUniquePaths(issues: readonly $ZodIssueInvalidValue[]): readonly (readonly PropertyKey[])[] {
    const paths: (readonly PropertyKey[])[] = [];

    for (const issue of issues) {
        if (
            paths.every(function (path) {
                return !isSamePath(path, issue.path);
            })
        ) {
            paths.push(issue.path);
        }
    }

    return paths;
}

export function collectInvalidValueIssues(
    alternatives: readonly AlternativeBucket[]
): readonly $ZodIssueInvalidValue[] {
    return alternatives.flatMap(function (bucket) {
        return bucket.filter(isInvalidValueIssue);
    });
}

function findInvalidValueIssuesAtPath(
    bucket: AlternativeBucket,
    path: readonly PropertyKey[]
): readonly $ZodIssueInvalidValue[] {
    return bucket.filter(function (issue): issue is $ZodIssueInvalidValue {
        return isInvalidValueIssue(issue) && isSamePath(issue.path, path);
    });
}

export function allValuesArePrimitive(issues: readonly $ZodIssueInvalidValue[]): boolean {
    return issues.every(function (issue) {
        return issue.values.every(isPrimitive);
    });
}

function hasRepeatedExpectedValue(issues: readonly $ZodIssueInvalidValue[]): boolean {
    const expectedValues = issues.flatMap(function (issue) {
        return issue.values;
    });
    const uniqueExpectedValues = new Set(expectedValues);
    return uniqueExpectedValues.size < expectedValues.length;
}

function everyAlternativeHasOnlyInvalidValueAtPath(
    alternatives: readonly AlternativeBucket[],
    path: readonly PropertyKey[]
): boolean {
    return alternatives.every(function (bucket) {
        return bucket.length === 1 && findInvalidValueIssuesAtPath(bucket, path).length === 1;
    });
}

function collectIssuesAtPath(
    alternatives: readonly AlternativeBucket[],
    path: readonly PropertyKey[]
): readonly $ZodIssueInvalidValue[] {
    return alternatives.flatMap(function (bucket) {
        return findInvalidValueIssuesAtPath(bucket, path);
    });
}

function everyAlternativeHasIssueAtPath(
    alternatives: readonly AlternativeBucket[],
    path: readonly PropertyKey[]
): boolean {
    return alternatives.every(function (bucket) {
        return findInvalidValueIssuesAtPath(bucket, path).length > 0;
    });
}

function canCollapseInvalidValuePath(
    alternatives: readonly AlternativeBucket[],
    path: readonly PropertyKey[]
): boolean {
    const issuesAtPath = collectIssuesAtPath(alternatives, path);
    const safelyRepresentsBranchChoice = everyAlternativeHasOnlyInvalidValueAtPath(alternatives, path)
        || hasRepeatedExpectedValue(issuesAtPath);

    return everyAlternativeHasIssueAtPath(alternatives, path) && safelyRepresentsBranchChoice;
}

export function findInvalidValuePathCandidate(
    alternatives: readonly AlternativeBucket[]
): InvalidValuePathCandidate | null {
    const paths = getUniquePaths(collectInvalidValueIssues(alternatives));
    const path = paths.find(function (candidatePath) {
        return canCollapseInvalidValuePath(alternatives, candidatePath);
    });

    if (path === undefined) {
        return null;
    }

    return { path, issues: collectIssuesAtPath(alternatives, path) };
}

function selectWithoutInvalidValuePath(
    alternatives: readonly AlternativeBucket[],
    path: readonly PropertyKey[]
): Selection | null {
    const alternativesWithIssue = alternatives.filter(function (bucket) {
        return findInvalidValueIssuesAtPath(bucket, path).length > 0;
    });
    const alternativesWithoutIssue = alternatives.filter(function (bucket) {
        return findInvalidValueIssuesAtPath(bucket, path).length === 0;
    });
    const issuesAtPath = alternativesWithIssue.flatMap(function (bucket) {
        return findInvalidValueIssuesAtPath(bucket, path);
    });

    if (
        alternativesWithIssue.length > 0 &&
        alternativesWithoutIssue.length > 0 &&
        allValuesArePrimitive(issuesAtPath)
    ) {
        return { alternatives: alternativesWithoutIssue };
    }

    return null;
}

function selectAlternativesWithoutInvalidValuePath(
    alternatives: readonly AlternativeBucket[],
    inputAtUnion: unknown
): Selection | null {
    const paths = getUniquePaths(collectInvalidValueIssues(alternatives));
    const path = paths.find(function (candidatePath) {
        return candidatePath.length > 0 && findValueByPath(inputAtUnion, candidatePath).found;
    });

    return path === undefined ? null : selectWithoutInvalidValuePath(alternatives, path);
}

function issueHasUnrecognizedKey(issue: $ZodIssue, key: string): boolean {
    return isUnrecognizedKeysIssue(issue) && issue.keys.includes(key);
}

function bucketHasUnrecognizedKey(bucket: AlternativeBucket, key: string): boolean {
    return bucket.some(function (issue) {
        return issueHasUnrecognizedKey(issue, key);
    });
}

function collectUnrecognizedKeys(alternatives: readonly AlternativeBucket[]): readonly string[] {
    const keys = alternatives.flatMap(function (bucket) {
        return bucket
            .filter(isUnrecognizedKeysIssue)
            .flatMap(function (issue) {
                return issue.keys;
            });
    });

    return Array.from(new Set(keys));
}

function selectWithoutUnrecognizedKey(alternatives: readonly AlternativeBucket[], key: string): Selection | null {
    const alternativesWithKey = alternatives.filter(function (bucket) {
        return bucketHasUnrecognizedKey(bucket, key);
    });
    const alternativesWithoutKey = alternatives.filter(function (bucket) {
        return bucket.every(function (issue) {
            return !issueHasUnrecognizedKey(issue, key);
        });
    });

    if (alternativesWithKey.length > 0 && alternativesWithoutKey.length > 0) {
        return { alternatives: alternativesWithoutKey };
    }

    return null;
}

function selectAlternativesWithoutUnrecognizedKey(
    alternatives: readonly AlternativeBucket[]
): Selection | null {
    const selections = collectUnrecognizedKeys(alternatives)
        .map(function (key) {
            return selectWithoutUnrecognizedKey(alternatives, key);
        })
        .filter(function (selection): selection is Selection {
            return selection !== null;
        });

    const [ firstSelection ] = selections;
    const allSelectionsMatch = firstSelection !== undefined && selections.every(function (selection) {
        return isSameAlternativeSet(selection, firstSelection);
    });

    return allSelectionsMatch ? firstSelection : null;
}

export function selectRelevantAlternatives(
    alternatives: readonly AlternativeBucket[],
    inputAtUnion: unknown
): readonly AlternativeBucket[] {
    let currentAlternatives = alternatives;

    while (currentAlternatives.length > 1) {
        const selection = selectAlternativesWithoutInvalidValuePath(currentAlternatives, inputAtUnion)
            ?? selectAlternativesWithoutUnrecognizedKey(currentAlternatives);

        if (selection === null || selection.alternatives.length === currentAlternatives.length) {
            return currentAlternatives;
        }

        currentAlternatives = selection.alternatives;
    }

    return currentAlternatives;
}
