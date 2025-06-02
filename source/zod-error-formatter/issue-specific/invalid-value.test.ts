import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { formatInvalidValueIssueMessage } from './invalid-value.js';

test('formats the issue by using the expected value as is and only the type of the received value', () => {
    const message = formatInvalidValueIssueMessage({
        code: 'invalid_value',
        path: [],
        message: '',
        values: [1],
        input: { foo: 'bar' }
    }, { foo: 'bar' });
    assert.strictEqual(message, 'invalid literal: expected 1, but got object');
});

test('wraps the expected value in double quotes when it is a string', () => {
    const message = formatInvalidValueIssueMessage({
        code: 'invalid_value',
        path: [],
        message: '',
        values: ['foo'],
        input: null
    }, null);
    assert.strictEqual(message, 'invalid literal: expected "foo", but got null');
});

test('correctly works with undefined as expected value', () => {
    const message = formatInvalidValueIssueMessage({
        code: 'invalid_value',
        path: [],
        message: '',
        values: [undefined],
        input: null
    }, null);
    assert.strictEqual(message, 'invalid literal: expected undefined, but got null');
});

test('correctly works with bigint as expected value', () => {
    const message = formatInvalidValueIssueMessage({
        code: 'invalid_value',
        path: [],
        message: '',
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers -- using a large number for testing
        values: [9_007_199_254_740_993n],
        input: null
    }, null);
    assert.strictEqual(message, 'invalid literal: expected 9007199254740993, but got null');
});

test('formats the issue as missing property when the path doesn’t exist in the given object', () => {
    const message = formatInvalidValueIssueMessage({
        code: 'invalid_value',
        path: ['foo'],
        message: '',
        values: [1],
        input: { foo: 'bar' }
    }, {});
    assert.strictEqual(message, 'missing property');
});

test('formats the issue as missing key when the path doesn’t exist in the given array', () => {
    const message = formatInvalidValueIssueMessage({
        code: 'invalid_value',
        path: [0],
        message: '',
        values: [1],
        input: { foo: 'bar' }
    }, []);
    assert.strictEqual(message, 'missing key');
});
