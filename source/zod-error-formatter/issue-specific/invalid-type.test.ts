import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { formatInvalidTypeIssueMessage } from './invalid-type.js';

test('formats the expected and received value correctly', () => {
    const message = formatInvalidTypeIssueMessage({
        code: 'invalid_type',
        path: [],
        message: '',
        expected: 'date',
        received: 'null'
    }, '');
    assert.strictEqual(message, 'expected date, but got null');
});

test('formats the issue as missing property when the path couldn’t be resolved in the given input data', () => {
    const message = formatInvalidTypeIssueMessage({
        code: 'invalid_type',
        path: ['foo', 'bar'],
        message: '',
        expected: 'date',
        received: 'null'
    }, { foo: {} });
    assert.strictEqual(message, 'missing property');
});

test('formats the issue as missing key when the path couldn’t be resolved in the given input data', () => {
    const message = formatInvalidTypeIssueMessage({
        code: 'invalid_type',
        path: [1],
        message: '',
        expected: 'date',
        received: 'null'
    }, []);
    assert.strictEqual(message, 'missing key');
});
