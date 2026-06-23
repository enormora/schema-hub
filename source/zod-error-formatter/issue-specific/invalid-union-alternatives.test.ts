import assert from 'node:assert';
import { test } from '@sondr3/minitest';
import type {
    $ZodIssue,
    $ZodIssueCustom,
    $ZodIssueInvalidType,
    $ZodIssueInvalidValue,
    $ZodIssueUnrecognizedKeys,
    util
} from 'zod/v4/core';
import {
    allValuesArePrimitive,
    collectInvalidValueIssues,
    findInvalidValuePathCandidate,
    isInvalidValueIssue,
    isPrimitive,
    isSamePath,
    selectRelevantAlternatives
} from './invalid-union-alternatives.ts';

function invalidValue(path: PropertyKey[], values: util.Primitive[]): $ZodIssueInvalidValue {
    return { code: 'invalid_value', path, message: '', input: undefined, values };
}

function invalidType(path: PropertyKey[], expected: $ZodIssueInvalidType['expected']): $ZodIssueInvalidType {
    return { code: 'invalid_type', path, message: '', input: undefined, expected };
}

function customIssue(path: PropertyKey[]): $ZodIssueCustom {
    return { code: 'custom', path, message: '', input: undefined };
}

function unrecognizedKeys(keys: string[]): $ZodIssueUnrecognizedKeys {
    return { code: 'unrecognized_keys', path: [], message: '', input: {}, keys };
}

test('identifies invalid value issues', function () {
    const issue = invalidValue([ 'kind' ], [ 'a' ]);
    const otherIssue = invalidType([ 'kind' ], 'string');

    assert.strictEqual(isInvalidValueIssue(issue), true);
    assert.strictEqual(isInvalidValueIssue(otherIssue), false);
});

test('identifies primitive values', function () {
    assert.strictEqual(isPrimitive('value'), true);
    assert.strictEqual(isPrimitive(null), true);
    assert.strictEqual(isPrimitive({}), false);
});

test('compares issue paths', function () {
    assert.strictEqual(isSamePath([ 'a', 0 ], [ 'a', 0 ]), true);
    assert.strictEqual(isSamePath([ 'a' ], [ 'a', 0 ]), false);
    assert.strictEqual(isSamePath([ 'a', 1 ], [ 'a', 0 ]), false);
});

test('collects invalid value issues from alternatives', function () {
    const first = invalidValue([ 'kind' ], [ 'a' ]);
    const second = invalidValue([ 'mode' ], [ 'strict' ]);
    const alternatives: readonly (readonly $ZodIssue[])[] = [
        [ first, invalidType([ 'name' ], 'string') ],
        [ second ]
    ];

    assert.deepStrictEqual(collectInvalidValueIssues(alternatives), [ first, second ]);
});

test('detects primitive values across invalid value issues', function () {
    assert.strictEqual(allValuesArePrimitive([ invalidValue([ 'kind' ], [ 'a', 1 ]) ]), true);
});

test('finds a discriminator candidate when every alternative has only that invalid value path', function () {
    const firstIssue = invalidValue([ 'kind' ], [ 'a' ]);
    const secondIssue = invalidValue([ 'kind' ], [ 'b' ]);
    const candidate = findInvalidValuePathCandidate([
        [ firstIssue ],
        [ secondIssue ]
    ]);

    assert.deepStrictEqual(candidate, { path: [ 'kind' ], issues: [ firstIssue, secondIssue ] });
});

test('finds a discriminator candidate when expected values repeat across richer alternatives', function () {
    const automaticIssue = invalidValue([ 'automatic' ], [ true ]);
    const staticManualIssue = invalidValue([ 'automatic' ], [ false ]);
    const providerManualIssue = invalidValue([ 'automatic' ], [ false ]);
    const candidate = findInvalidValuePathCandidate([
        [ automaticIssue ],
        [ staticManualIssue, invalidType([ 'version' ], 'string') ],
        [ providerManualIssue, customIssue([ 'provideVersion' ]) ]
    ]);

    assert.deepStrictEqual(
        candidate,
        { path: [ 'automatic' ], issues: [ automaticIssue, staticManualIssue, providerManualIssue ] }
    );
});

test('does not find a discriminator candidate when alternatives do not share a path', function () {
    const candidate = findInvalidValuePathCandidate([
        [ invalidValue([ 'kind' ], [ 'a' ]) ],
        [ invalidType([ 'name' ], 'string') ]
    ]);

    assert.strictEqual(candidate, null);
});

test('selects alternatives that do not reject an already present invalid value path', function () {
    const automaticAlternative = [ invalidValue([ 'automatic' ], [ true ]) ];
    const manualAlternative = [ invalidType([ 'version' ], 'string') ];
    const selected = selectRelevantAlternatives([ automaticAlternative, manualAlternative ], { automatic: false });

    assert.deepStrictEqual(selected, [ manualAlternative ]);
});

test('keeps alternatives when an invalid value path is absent from the input', function () {
    const automaticAlternative = [ invalidValue([ 'automatic' ], [ true ]) ];
    const manualAlternative = [ invalidType([ 'version' ], 'string') ];
    const alternatives = [ automaticAlternative, manualAlternative ];

    assert.deepStrictEqual(selectRelevantAlternatives(alternatives, {}), alternatives);
});

test('selects alternatives that do not reject an unrecognized key', function () {
    const staticAlternative = [ invalidType([ 'version' ], 'string') ];
    const providerAlternative = [ customIssue([ 'provideVersion' ]), unrecognizedKeys([ 'version' ]) ];
    const selected = selectRelevantAlternatives([ staticAlternative, providerAlternative ], { version: '' });

    assert.deepStrictEqual(selected, [ staticAlternative ]);
});

test('selects through repeated unrecognized-key reductions when every selection matches', function () {
    const staticAlternative = [ invalidType([ 'version' ], 'string') ];
    const providerAlternative = [
        customIssue([ 'provideVersion' ]),
        unrecognizedKeys([ 'version', 'minimumVersion' ])
    ];
    const selected = selectRelevantAlternatives([ staticAlternative, providerAlternative ], { version: '' });

    assert.deepStrictEqual(selected, [ staticAlternative ]);
});

test('keeps alternatives when unrecognized-key selections disagree', function () {
    const staticAlternative = [ invalidType([ 'version' ], 'string'), unrecognizedKeys([ 'provideVersion' ]) ];
    const providerAlternative = [
        customIssue([ 'provideVersion' ]),
        unrecognizedKeys([ 'version' ])
    ];
    const alternatives = [ staticAlternative, providerAlternative ];

    assert.deepStrictEqual(selectRelevantAlternatives(alternatives, { version: '', provideVersion: '' }), alternatives);
});

test('keeps alternatives when unrecognized-key selections have different sizes', function () {
    const firstAlternative = [ invalidType([ 'a' ], 'string') ];
    const secondAlternative = [ invalidType([ 'b' ], 'number'), unrecognizedKeys([ 'y' ]) ];
    const thirdAlternative = [ invalidType([ 'c' ], 'boolean'), unrecognizedKeys([ 'x', 'y' ]) ];
    const alternatives = [ firstAlternative, secondAlternative, thirdAlternative ];

    assert.deepStrictEqual(selectRelevantAlternatives(alternatives, { x: true, y: true }), alternatives);
});
