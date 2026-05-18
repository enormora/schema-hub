import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { formatIssue } from '../format-issue.js';
import { formatInvalidUnionIssueMessage } from './invalid-union.js';

test('formats the invalid union issue correctly when there are no union errors', () => {
    const message = formatInvalidUnionIssueMessage(
        {
            code: 'invalid_union',
            path: [],
            message: '',
            input: '',
            errors: []
        },
        '',
        formatIssue
    );
    assert.strictEqual(message, 'invalid value doesn’t match expected union');
});

test('formats the invalid union issue correctly when there are only union errors without issues', () => {
    const message = formatInvalidUnionIssueMessage(
        {
            code: 'invalid_union',
            path: [],
            message: '',
            input: '',
            errors: [[], []]
        },
        '',
        formatIssue
    );
    assert.strictEqual(message, 'invalid value doesn’t match expected union');
});

test('formats the invalid union issue correctly when there is only one union error with one invalid type issue', () => {
    const message = formatInvalidUnionIssueMessage(
        {
            code: 'invalid_union',
            path: [],
            message: '',
            input: '',
            errors: [
                [{ code: 'invalid_type', path: [], message: '', expected: 'string', input: 'null' }]
            ]
        },
        null,
        formatIssue
    );
    assert.strictEqual(message, 'invalid value: expected string, but got null');
});

test('formats the invalid union issue correctly when there are only invalid type issues', () => {
    const message = formatInvalidUnionIssueMessage(
        {
            code: 'invalid_union',
            path: [],
            message: '',
            input: '',
            errors: [
                [{ code: 'invalid_type', path: [], message: '', expected: 'string', input: 'null' }],
                [{ code: 'invalid_type', path: [], message: '', expected: 'number', input: 'null' }]
            ]
        },
        null,
        formatIssue
    );
    assert.strictEqual(message, 'invalid value: expected one of string or number, but got null');
});

test('formats the invalid union issue correctly given only invalid type issues in nested unions', () => {
    const message = formatInvalidUnionIssueMessage(
        {
            code: 'invalid_union',
            path: [],
            message: '',
            input: '',
            errors: [
                [{ code: 'invalid_type', path: [], message: '', expected: 'string', input: 'null' }],
                [{
                    code: 'invalid_union',
                    path: [],
                    message: '',
                    input: '',
                    errors: [
                        [{
                            code: 'invalid_union',
                            path: [],
                            message: '',
                            input: '',
                            errors: [
                                [{
                                    code: 'invalid_type',
                                    path: [],
                                    message: '',
                                    expected: 'number',
                                    input: 'null'
                                }]
                            ]
                        }],
                        [{
                            code: 'invalid_union',
                            path: [],
                            message: '',
                            input: '',
                            errors: [
                                [{
                                    code: 'invalid_type',
                                    path: [],
                                    message: '',
                                    expected: 'boolean',
                                    input: 'null'
                                }]
                            ]
                        }]
                    ]
                }]
            ]
        },
        null,
        formatIssue
    );
    assert.strictEqual(message, 'invalid value: expected one of string, number or boolean, but got null');
});

test('formats the issue correctly when there are only invalid type issues but all have the same expected type', () => {
    const message = formatInvalidUnionIssueMessage(
        {
            code: 'invalid_union',
            path: [],
            message: '',
            input: '',
            errors: [
                [{ code: 'invalid_type', path: [], message: '', expected: 'string', input: 'null' }],
                [{ code: 'invalid_type', path: [], message: '', expected: 'string', input: 'null' }]
            ]
        },
        null,
        formatIssue
    );
    assert.strictEqual(message, 'invalid value: expected string, but got null');
});

test('formats the invalid union issue correctly when there are only invalid literal issues', () => {
    const message = formatInvalidUnionIssueMessage(
        {
            code: 'invalid_union',
            path: [],
            message: '',
            input: '',
            errors: [
                [{ code: 'invalid_value', path: [], message: '', values: ['foo'], input: 'bar' }],
                [{ code: 'invalid_value', path: [], message: '', values: ['baz'], input: 'bar' }]
            ]
        },
        '',
        formatIssue
    );
    assert.strictEqual(message, 'invalid value: expected one of "foo" or "baz", but got string');
});

test('formats the invalid union issue correctly when there is a invalid literal issues with null as expected', () => {
    const message = formatInvalidUnionIssueMessage(
        {
            code: 'invalid_union',
            path: [],
            message: '',
            input: '',
            errors: [
                [{ code: 'invalid_value', path: [], message: '', values: [null], input: 'bar' }]
            ]
        },
        '',
        formatIssue
    );
    assert.strictEqual(message, 'invalid value: expected null, but got string');
});

test('formats the invalid union issue correctly when there are only invalid literal or invalid type issues', () => {
    const message = formatInvalidUnionIssueMessage(
        {
            code: 'invalid_union',
            path: [],
            message: '',
            input: '',
            errors: [
                [{ code: 'invalid_type', path: [], message: '', expected: 'number', input: 'boolean' }],
                [{ code: 'invalid_value', path: [], message: '', values: ['foo'], input: true }]
            ]
        },
        true,
        formatIssue
    );
    assert.strictEqual(message, 'invalid value: expected one of number or "foo", but got boolean');
});

test('enumerates each alternative when one is supported and another is custom', () => {
    const message = formatInvalidUnionIssueMessage(
        {
            code: 'invalid_union',
            path: [],
            message: '',
            input: '',
            errors: [
                [{ code: 'invalid_type', path: [], message: '', expected: 'string', input: 'null' }],
                [{ code: 'custom', path: [], message: 'must satisfy something', input: '' }]
            ]
        },
        '',
        formatIssue
    );
    assert.strictEqual(
        message,
        // eslint-disable-next-line @stylistic/max-len -- expected enumeration is intentionally explicit
        'no union alternative matched: alternative 1: expected string, but got string | alternative 2: must satisfy something'
    );
});

test('enumerates each alternative when supported issues live at different relative paths', () => {
    const message = formatInvalidUnionIssueMessage(
        {
            code: 'invalid_union',
            path: ['foo'],
            message: '',
            input: [],
            errors: [
                [{ code: 'invalid_type', path: ['foo'], message: '', expected: 'string', input: 'null' }],
                [{
                    code: 'invalid_type',
                    path: ['foo', 'bar'],
                    message: '',
                    expected: 'number',
                    input: 'null'
                }]
            ]
        },
        { foo: {} },
        formatIssue
    );
    assert.strictEqual(
        message,
        // eslint-disable-next-line @stylistic/max-len -- test expectation must match the produced multi-issue string exactly
        'at foo: no union alternative matched: alternative 1: expected string, but got object | alternative 2: at bar: missing property; expected number'
    );
});

test('collapses to a deeper common path when every alternative produces exactly one issue at the same field', () => {
    const message = formatInvalidUnionIssueMessage(
        {
            code: 'invalid_union',
            path: [],
            message: '',
            input: '',
            errors: [
                [{ code: 'invalid_type', path: ['a'], message: '', expected: 'string', input: 'null' }],
                [{ code: 'invalid_type', path: ['a'], message: '', expected: 'number', input: 'null' }]
            ]
        },
        { a: true },
        formatIssue
    );
    assert.strictEqual(message, 'at a: invalid value: expected one of string or number, but got boolean');
});

test('collapses discriminator-style unions where every alternative reports the same literal field', () => {
    const message = formatInvalidUnionIssueMessage(
        {
            code: 'invalid_union',
            path: [],
            message: '',
            input: '',
            errors: [
                [{ code: 'invalid_value', path: ['kind'], message: '', values: ['a'], input: 'c' }],
                [{ code: 'invalid_value', path: ['kind'], message: '', values: ['b'], input: 'c' }]
            ]
        },
        { kind: 'c' },
        formatIssue
    );
    assert.strictEqual(message, 'at kind: invalid value: expected one of "a" or "b", but got string');
});

test('enumerates instead of collapsing when an alternative has multiple issues', () => {
    const message = formatInvalidUnionIssueMessage(
        {
            code: 'invalid_union',
            path: [],
            message: '',
            input: '',
            errors: [
                [
                    { code: 'invalid_value', path: ['a'], message: '', values: ['X'], input: 'Z' },
                    { code: 'invalid_type', path: ['b'], message: '', expected: 'number', input: 'boolean' }
                ],
                [
                    { code: 'invalid_value', path: ['a'], message: '', values: ['Y'], input: 'Z' },
                    { code: 'invalid_type', path: ['b'], message: '', expected: 'string', input: 'boolean' }
                ]
            ]
        },
        { a: 'Z', b: true },
        formatIssue
    );
    assert.strictEqual(
        message,
        // eslint-disable-next-line @stylistic/max-len -- test expectation must match the produced multi-issue string exactly
        'no union alternative matched: alternative 1: at a: invalid value: expected "X", but got string; at b: expected number, but got boolean | alternative 2: at a: invalid value: expected "Y", but got string; at b: expected string, but got boolean'
    );
});

test('formats the invalid union issue with a path when no info is available', () => {
    const message = formatInvalidUnionIssueMessage(
        {
            code: 'invalid_union',
            path: ['foo'],
            message: '',
            input: '',
            errors: []
        },
        { foo: 1 },
        formatIssue
    );
    assert.strictEqual(message, 'at foo: invalid value doesn’t match expected union');
});

test('formats a missing property message when the path doesn’t exist in the given object', () => {
    const message = formatInvalidUnionIssueMessage(
        {
            code: 'invalid_union',
            path: ['foo'],
            message: '',
            input: [],
            errors: []
        },
        {},
        formatIssue
    );
    assert.strictEqual(message, 'at foo: missing property');
});

test('formats a missing property message when the path doesn’t exist in the given array', () => {
    const message = formatInvalidUnionIssueMessage(
        {
            code: 'invalid_union',
            path: [0],
            message: '',
            input: [],
            errors: []
        },
        [],
        formatIssue
    );
    assert.strictEqual(message, 'at [0]: missing key');
});

test('groups duplicate alternative bodies into one labeled entry', () => {
    const message = formatInvalidUnionIssueMessage(
        {
            code: 'invalid_union',
            path: [],
            message: '',
            input: '',
            errors: [
                [
                    { code: 'invalid_type', path: ['a'], message: '', expected: 'string', input: 1 },
                    { code: 'invalid_type', path: ['b'], message: '', expected: 'number', input: 'x' }
                ],
                [
                    { code: 'invalid_type', path: ['a'], message: '', expected: 'string', input: 1 },
                    { code: 'invalid_type', path: ['b'], message: '', expected: 'number', input: 'x' }
                ],
                [{ code: 'invalid_type', path: ['c'], message: '', expected: 'boolean', input: null }]
            ]
        },
        { a: 1, b: 'x', c: null },
        formatIssue
    );
    assert.strictEqual(
        message,
        // eslint-disable-next-line @stylistic/max-len -- expected enumeration string is intentionally explicit
        'no union alternative matched: alternatives 1, 2: at a: expected string, but got number; at b: expected number, but got string | alternative 3: at c: expected boolean, but got null'
    );
});

test('factors out issues common to every alternative and re-collapses the remaining single-issue alternatives', () => {
    const message = formatInvalidUnionIssueMessage(
        {
            code: 'invalid_union',
            path: [],
            message: '',
            input: '',
            errors: [
                [
                    { code: 'invalid_value', path: ['type'], message: '', values: ['a'], input: 'c' },
                    { code: 'invalid_type', path: ['x'], message: '', expected: 'number', input: 'wrong' }
                ],
                [
                    { code: 'invalid_value', path: ['type'], message: '', values: ['b'], input: 'c' },
                    { code: 'invalid_type', path: ['x'], message: '', expected: 'number', input: 'wrong' }
                ]
            ]
        },
        { type: 'c', x: 'wrong' },
        formatIssue
    );
    assert.strictEqual(
        message,
        'at x: expected number, but got string; at type: invalid value: expected one of "a" or "b", but got string'
    );
});

test('factors out common issues and enumerates the rest when the reduced alternatives can’t collapse', () => {
    const message = formatInvalidUnionIssueMessage(
        {
            code: 'invalid_union',
            path: [],
            message: '',
            input: '',
            errors: [
                [
                    { code: 'invalid_type', path: ['shared'], message: '', expected: 'number', input: 'x' },
                    { code: 'invalid_type', path: ['extraA'], message: '', expected: 'string', input: 1 }
                ],
                [
                    { code: 'invalid_type', path: ['shared'], message: '', expected: 'number', input: 'x' },
                    { code: 'invalid_type', path: ['extraB'], message: '', expected: 'boolean', input: null }
                ]
            ]
        },
        { shared: 'x', extraA: 1, extraB: null },
        formatIssue
    );
    assert.strictEqual(
        message,
        // eslint-disable-next-line @stylistic/max-len -- expected output combines factored and enumerated parts
        'at shared: expected number, but got string; no union alternative matched: alternative 1: at extraA: expected string, but got number | alternative 2: at extraB: expected boolean, but got null'
    );
});

test('emits only the common issue when one alternative is fully described by the shared constraints', () => {
    // alt 1 carries only the common issue, so fixing it alone makes alt 1 pass —
    // reporting alt 2's extra requirement would mislead the user into thinking
    // both must be addressed.
    const message = formatInvalidUnionIssueMessage(
        {
            code: 'invalid_union',
            path: [],
            message: '',
            input: '',
            errors: [
                [{ code: 'invalid_type', path: ['common'], message: '', expected: 'number', input: 'x' }],
                [
                    { code: 'invalid_type', path: ['common'], message: '', expected: 'number', input: 'x' },
                    { code: 'invalid_type', path: ['extra'], message: '', expected: 'boolean', input: null }
                ]
            ]
        },
        { common: 'x', extra: null },
        formatIssue
    );
    assert.strictEqual(message, 'at common: expected number, but got string');
});

test('handles a single-alternative union as a regular collapse', () => {
    const message = formatInvalidUnionIssueMessage(
        {
            code: 'invalid_union',
            path: [],
            message: '',
            input: '',
            errors: [
                [{ code: 'invalid_type', path: [], message: '', expected: 'string', input: true }]
            ]
        },
        true,
        formatIssue
    );
    assert.strictEqual(message, 'invalid value: expected string, but got boolean');
});

test('does not expand a nested invalid_union when its alternative carries other sibling issues', () => {
    // The bucket carries both a nested invalid_union and an unrelated invalid_type.
    // Expansion would discard the sibling, so the formatter must keep the bucket
    // intact and let formatIssue recurse into the nested union.
    const message = formatInvalidUnionIssueMessage(
        {
            code: 'invalid_union',
            path: [],
            message: '',
            input: '',
            errors: [
                [
                    { code: 'invalid_type', path: ['outer'], message: '', expected: 'string', input: 1 },
                    {
                        code: 'invalid_union',
                        path: ['inner'],
                        message: '',
                        input: 'x',
                        errors: [
                            [{ code: 'invalid_type', path: ['inner'], message: '', expected: 'number', input: 'x' }],
                            [{ code: 'invalid_type', path: ['inner'], message: '', expected: 'boolean', input: 'x' }]
                        ]
                    }
                ]
            ]
        },
        { outer: 1, inner: 'x' },
        formatIssue
    );
    assert.strictEqual(
        message,
        // eslint-disable-next-line @stylistic/max-len -- expected output spans both sibling messages
        'at outer: expected string, but got number; at inner: invalid value: expected one of number or boolean, but got string'
    );
});

test('walks invalid_union paths into Map values', () => {
    const message = formatInvalidUnionIssueMessage(
        {
            code: 'invalid_union',
            path: ['m', 'key'],
            message: '',
            input: true,
            errors: [
                [{ code: 'invalid_type', path: ['m', 'key'], message: '', expected: 'string', input: true }],
                [{ code: 'invalid_type', path: ['m', 'key'], message: '', expected: 'number', input: true }]
            ]
        },
        { m: new Map([['key', true]]) },
        formatIssue
    );
    assert.strictEqual(message, 'at m.key: invalid value: expected one of string or number, but got boolean');
});
