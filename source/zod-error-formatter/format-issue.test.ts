import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { formatIssue } from './format-issue.js';

test('returns the original message when the issue code doesn’t have a specific formatter and the path is empty', () => {
    const formattedIssue = formatIssue({ code: 'custom', message: 'foo', path: [] });
    assert.strictEqual(formattedIssue, 'foo');
});

test('returns the original message with path when the issue code doesn’t have a specific formatter', () => {
    const formattedIssue = formatIssue({ code: 'custom', message: 'bar', path: ['foo'] });
    assert.strictEqual(formattedIssue, 'at foo: bar');
});

test('returns the formatted issue when an invalid_type issue is given', () => {
    const formattedIssue = formatIssue({
        code: 'invalid_type',
        message: '',
        expected: 'nan',
        received: 'float',
        path: ['foo']
    });
    assert.strictEqual(formattedIssue, 'at foo: expected nan, but got float');
});

test('returns the formatted issue when an invalid_literal issue is given', () => {
    const formattedIssue = formatIssue({
        code: 'invalid_literal',
        message: '',
        expected: 'foo',
        received: 'bar',
        path: ['foo']
    });
    assert.strictEqual(formattedIssue, 'at foo: invalid literal: expected "foo", but got string');
});

test('returns the formatted issue when an unrecognized_keys issue is given', () => {
    const formattedIssue = formatIssue({
        code: 'unrecognized_keys',
        message: '',
        keys: ['bar'],
        path: ['foo']
    });
    assert.strictEqual(formattedIssue, 'at foo: unexpected additional property: "bar"');
});

test('returns the formatted issue when an too_big issue is given', () => {
    const formattedIssue = formatIssue({
        code: 'too_big',
        message: '',
        path: ['foo'],
        inclusive: false,
        type: 'string',
        maximum: 2
    });
    assert.strictEqual(formattedIssue, 'at foo: string must contain less than 2 characters');
});
