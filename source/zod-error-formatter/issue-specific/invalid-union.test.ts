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
        'no union alternative matched: alternative 1: expected string, but got string | alternative 2: invalid input'
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
        'at foo: no union alternative matched: alternative 1: expected string, but got object | alternative 2: at bar: missing property'
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
        'no union alternative matched: alternative 1: at a: invalid literal: expected "X", but got string; at b: expected number, but got boolean | alternative 2: at a: invalid literal: expected "Y", but got string; at b: expected string, but got boolean'
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
