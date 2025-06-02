import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { formatInvalidUnionIssueMessage } from './invalid-union.js';

test('formats the invalid union issue correctly when there are no union errors', () => {
    const message = formatInvalidUnionIssueMessage({
        code: 'invalid_union',
        path: [],
        message: '',
        input: '',
        errors: []
    }, '');
    assert.strictEqual(message, 'invalid value doesn’t match expected union');
});

test('formats the invalid union issue correctly when there are only union errors without issues', () => {
    const message = formatInvalidUnionIssueMessage({
        code: 'invalid_union',
        path: [],
        message: '',
        input: '',
        errors: [[], []]
    }, '');
    assert.strictEqual(message, 'invalid value doesn’t match expected union');
});

test('formats the invalid union issue correctly when there is only one union error with one invalid type issue', () => {
    const message = formatInvalidUnionIssueMessage({
        code: 'invalid_union',
        path: [],
        message: '',
        input: '',
        errors: [
            [{ code: 'invalid_type', path: [], message: '', expected: 'string', input: 'null' }]
        ]
    }, null);
    assert.strictEqual(message, 'invalid value: expected string, but got null');
});

test('formats the invalid union issue correctly when there are only invalid type issues', () => {
    const message = formatInvalidUnionIssueMessage({
        code: 'invalid_union',
        path: [],
        message: '',
        input: '',
        errors: [
            [{ code: 'invalid_type', path: [], message: '', expected: 'string', input: 'null' }],
            [{ code: 'invalid_type', path: [], message: '', expected: 'number', input: 'null' }]
        ]
    }, null);
    assert.strictEqual(message, 'invalid value: expected one of string or number, but got null');
});

test('formats the invalid union issue correctly given only invalid type issues in nested unions', () => {
    const message = formatInvalidUnionIssueMessage({
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
    }, null);
    assert.strictEqual(message, 'invalid value: expected one of string, number or boolean, but got null');
});

test('formats the issue correctly when there are only invalid type issues but all have the same expected type', () => {
    const message = formatInvalidUnionIssueMessage({
        code: 'invalid_union',
        path: [],
        message: '',
        input: '',
        errors: [
            [{ code: 'invalid_type', path: [], message: '', expected: 'string', input: 'null' }],
            [{ code: 'invalid_type', path: [], message: '', expected: 'string', input: 'null' }]
        ]
    }, null);
    assert.strictEqual(message, 'invalid value: expected string, but got null');
});

test('formats the invalid union issue correctly when there are only invalid literal issues', () => {
    const message = formatInvalidUnionIssueMessage({
        code: 'invalid_union',
        path: [],
        message: '',
        input: '',
        errors: [
            [{ code: 'invalid_value', path: [], message: '', values: ['foo'], input: 'bar' }],
            [{ code: 'invalid_value', path: [], message: '', values: ['baz'], input: 'bar' }]
        ]
    }, '');
    assert.strictEqual(message, 'invalid value: expected one of "foo" or "baz", but got string');
});

test('formats the invalid union issue correctly when there is a invalid literal issues with null as expected', () => {
    const message = formatInvalidUnionIssueMessage({
        code: 'invalid_union',
        path: [],
        message: '',
        input: '',
        errors: [
            [{ code: 'invalid_value', path: [], message: '', values: [null], input: 'bar' }]
        ]
    }, '');
    assert.strictEqual(message, 'invalid value: expected null, but got string');
});

test('formats the invalid union issue correctly when there are only invalid literal or invalid type issues', () => {
    const message = formatInvalidUnionIssueMessage({
        code: 'invalid_union',
        path: [],
        message: '',
        input: '',
        errors: [
            [{ code: 'invalid_type', path: [], message: '', expected: 'number', input: 'boolean' }],
            [{ code: 'invalid_value', path: [], message: '', values: ['foo'], input: true }]
        ]
    }, true);
    assert.strictEqual(message, 'invalid value: expected one of number or "foo", but got boolean');
});

test('formats the issue correctly when there are multiple issues but not all are invalid type issues', () => {
    const message = formatInvalidUnionIssueMessage({
        code: 'invalid_union',
        path: [],
        message: '',
        input: '',
        errors: [
            [{ code: 'invalid_type', path: [], message: '', expected: 'string', input: 'null' }],
            [{ code: 'custom', path: [], message: '', input: '' }]
        ]
    }, '');
    assert.strictEqual(message, 'invalid value doesn’t match expected union');
});

test('formats the issue correctly given multiple invalid type issues but some of them are on a different path', () => {
    const message = formatInvalidUnionIssueMessage({
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
    }, { foo: {} });
    assert.strictEqual(message, 'invalid value doesn’t match expected union');
});

test('formats a missing property message when the path doesn’t exist in the given object', () => {
    const message = formatInvalidUnionIssueMessage({
        code: 'invalid_union',
        path: ['foo'],
        message: '',
        input: [],
        errors: []
    }, {});
    assert.strictEqual(message, 'missing property');
});

test('formats a missing property message when the path doesn’t exist in the given array', () => {
    const message = formatInvalidUnionIssueMessage({
        code: 'invalid_union',
        path: [0],
        message: '',
        input: [],
        errors: []
    }, []);
    assert.strictEqual(message, 'missing key');
});
