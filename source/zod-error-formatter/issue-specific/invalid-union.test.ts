import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { ZodError } from 'zod';
import { formatInvalidUnionIssueMessage } from './invalid-union.js';

test('formats the invalid union issue correctly when there are no union errors', () => {
    const message = formatInvalidUnionIssueMessage({
        code: 'invalid_union',
        path: [],
        message: '',
        unionErrors: []
    });
    assert.strictEqual(message, 'invalid value doesn’t match expected union');
});

test('formats the invalid union issue correctly when there are only union errors without issues', () => {
    const message = formatInvalidUnionIssueMessage({
        code: 'invalid_union',
        path: [],
        message: '',
        unionErrors: [new ZodError([]), new ZodError([])]
    });
    assert.strictEqual(message, 'invalid value doesn’t match expected union');
});

test('formats the invalid union issue correctly when there is only one union error with one invalid type issue', () => {
    const message = formatInvalidUnionIssueMessage({
        code: 'invalid_union',
        path: [],
        message: '',
        unionErrors: [
            new ZodError([{ code: 'invalid_type', path: [], message: '', expected: 'string', received: 'null' }])
        ]
    });
    assert.strictEqual(message, 'invalid value: expected string, but got null');
});

test('formats the invalid union issue correctly when there are only invalid type issues', () => {
    const message = formatInvalidUnionIssueMessage({
        code: 'invalid_union',
        path: [],
        message: '',
        unionErrors: [
            new ZodError([{ code: 'invalid_type', path: [], message: '', expected: 'string', received: 'null' }]),
            new ZodError([{ code: 'invalid_type', path: [], message: '', expected: 'number', received: 'null' }])
        ]
    });
    assert.strictEqual(message, 'invalid value: expected one of string or number, but got null');
});

test('formats the invalid union issue correctly given only invalid type issues in nested unions', () => {
    const message = formatInvalidUnionIssueMessage({
        code: 'invalid_union',
        path: [],
        message: '',
        unionErrors: [
            new ZodError([{ code: 'invalid_type', path: [], message: '', expected: 'string', received: 'null' }]),
            new ZodError([{
                code: 'invalid_union',
                path: [],
                message: '',
                unionErrors: [
                    new ZodError([{
                        code: 'invalid_union',
                        path: [],
                        message: '',
                        unionErrors: [
                            new ZodError([{
                                code: 'invalid_type',
                                path: [],
                                message: '',
                                expected: 'number',
                                received: 'null'
                            }])
                        ]
                    }]),
                    new ZodError([{
                        code: 'invalid_union',
                        path: [],
                        message: '',
                        unionErrors: [
                            new ZodError([{
                                code: 'invalid_type',
                                path: [],
                                message: '',
                                expected: 'boolean',
                                received: 'null'
                            }])
                        ]
                    }])
                ]
            }])
        ]
    });
    assert.strictEqual(message, 'invalid value: expected one of string, number or boolean, but got null');
});

test('formats the issue correctly when there are only invalid type issues but all have the same expected type', () => {
    const message = formatInvalidUnionIssueMessage({
        code: 'invalid_union',
        path: [],
        message: '',
        unionErrors: [
            new ZodError([{ code: 'invalid_type', path: [], message: '', expected: 'string', received: 'null' }]),
            new ZodError([{ code: 'invalid_type', path: [], message: '', expected: 'string', received: 'null' }])
        ]
    });
    assert.strictEqual(message, 'invalid value: expected string, but got null');
});

test('formats the invalid union issue correctly when there are only invalid literal issues', () => {
    const message = formatInvalidUnionIssueMessage({
        code: 'invalid_union',
        path: [],
        message: '',
        unionErrors: [
            new ZodError([{ code: 'invalid_literal', path: [], message: '', expected: 'foo', received: 'bar' }]),
            new ZodError([{ code: 'invalid_literal', path: [], message: '', expected: 'baz', received: 'bar' }])
        ]
    });
    assert.strictEqual(message, 'invalid value: expected one of "foo" or "baz", but got string');
});

test('formats the invalid union issue correctly when there is a invalid literal issues with null as expected', () => {
    const message = formatInvalidUnionIssueMessage({
        code: 'invalid_union',
        path: [],
        message: '',
        unionErrors: [
            new ZodError([{ code: 'invalid_literal', path: [], message: '', expected: null, received: 'bar' }])
        ]
    });
    assert.strictEqual(message, 'invalid value: expected null, but got string');
});

test('formats the invalid union issue correctly when there is a invalid literal with non-primitive as expected', () => {
    const message = formatInvalidUnionIssueMessage({
        code: 'invalid_union',
        path: [],
        message: '',
        unionErrors: [
            new ZodError([{ code: 'invalid_literal', path: [], message: '', expected: {}, received: 'bar' }])
        ]
    });
    assert.strictEqual(message, 'invalid value: expected "{}", but got string');
});

test('formats the invalid union issue correctly when there are only invalid literal or invalid type issues', () => {
    const message = formatInvalidUnionIssueMessage({
        code: 'invalid_union',
        path: [],
        message: '',
        unionErrors: [
            new ZodError([{ code: 'invalid_type', path: [], message: '', expected: 'number', received: 'boolean' }]),
            new ZodError([{ code: 'invalid_literal', path: [], message: '', expected: 'foo', received: true }])
        ]
    });
    assert.strictEqual(message, 'invalid value: expected one of number or "foo", but got boolean');
});

test('formats the issue correctly when there are multiple issues but not all are invalid type issues', () => {
    const message = formatInvalidUnionIssueMessage({
        code: 'invalid_union',
        path: [],
        message: '',
        unionErrors: [
            new ZodError([{ code: 'invalid_type', path: [], message: '', expected: 'string', received: 'null' }]),
            new ZodError([{ code: 'custom', path: [], message: '' }])
        ]
    });
    assert.strictEqual(message, 'invalid value doesn’t match expected union');
});

test('formats the issue correctly given multiple invalid type issues but some of them are on a different path', () => {
    const message = formatInvalidUnionIssueMessage({
        code: 'invalid_union',
        path: ['foo'],
        message: '',
        unionErrors: [
            new ZodError([{ code: 'invalid_type', path: ['foo'], message: '', expected: 'string', received: 'null' }]),
            new ZodError([{
                code: 'invalid_type',
                path: ['foo', 'bar'],
                message: '',
                expected: 'number',
                received: 'null'
            }])
        ]
    });
    assert.strictEqual(message, 'invalid value doesn’t match expected union');
});
