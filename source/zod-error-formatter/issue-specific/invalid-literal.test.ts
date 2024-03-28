import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { formatInvalidLiteralIssueMessage } from './invalid-literal.js';

test('formats the issue by using the expected value as is and only the type of the received value', () => {
    const message = formatInvalidLiteralIssueMessage({
        code: 'invalid_literal',
        path: [],
        message: '',
        expected: 42,
        received: { foo: 'bar' }
    }, '');
    assert.strictEqual(message, 'invalid literal: expected 42, but got object');
});

test('wraps the expected value in double quotes when it is a string', () => {
    const message = formatInvalidLiteralIssueMessage({
        code: 'invalid_literal',
        path: [],
        message: '',
        expected: 'foo',
        received: null
    }, '');
    assert.strictEqual(message, 'invalid literal: expected "foo", but got null');
});

test('correctly works with undefined as expected value', () => {
    const message = formatInvalidLiteralIssueMessage({
        code: 'invalid_literal',
        path: [],
        message: '',
        expected: undefined,
        received: null
    }, '');
    assert.strictEqual(message, 'invalid literal: expected undefined, but got null');
});

test('correctly works with bigint as expected value', () => {
    const message = formatInvalidLiteralIssueMessage({
        code: 'invalid_literal',
        path: [],
        message: '',
        expected: 9_007_199_254_740_993n,
        received: null
    }, '');
    assert.strictEqual(message, 'invalid literal: expected 9007199254740993, but got null');
});

test('formats the issue as missing property when the path doesn’t exist in the given object', () => {
    const message = formatInvalidLiteralIssueMessage({
        code: 'invalid_literal',
        path: ['foo'],
        message: '',
        expected: 42,
        received: { foo: 'bar' }
    }, {});
    assert.strictEqual(message, 'missing property');
});

test('formats the issue as missing key when the path doesn’t exist in the given array', () => {
    const message = formatInvalidLiteralIssueMessage({
        code: 'invalid_literal',
        path: [0],
        message: '',
        expected: 42,
        received: { foo: 'bar' }
    }, []);
    assert.strictEqual(message, 'missing key');
});
