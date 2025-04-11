import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { formatIssue } from './format-issue.js';

test('returns just the message when the path is empty', () => {
    const formattedIssue = formatIssue({ code: 'custom', message: 'foo', path: [], input: '' }, '');
    assert.strictEqual(formattedIssue, 'invalid input');
});

test('returns the message with path when the path is not empty', () => {
    const formattedIssue = formatIssue({ code: 'custom', message: 'bar', path: ['foo'], input: '' }, '');
    assert.strictEqual(formattedIssue, 'at foo: invalid input');
});

test('returns the formatted issue when an invalid_type issue is given', () => {
    const formattedIssue = formatIssue({
        code: 'invalid_type',
        message: '',
        expected: 'nan',
        input: 1.1,
        path: ['foo']
    }, { foo: 1.1 });
    assert.strictEqual(formattedIssue, 'at foo: expected nan, but got number');
});

test('returns the formatted issue when an invalid_literal issue is given', () => {
    const formattedIssue = formatIssue({
        code: 'invalid_value',
        message: '',
        values: ['foo'],
        input: 'bar',
        path: ['foo']
    }, { foo: '' });
    assert.strictEqual(formattedIssue, 'at foo: invalid literal: expected "foo", but got string');
});

test('returns the formatted issue when an unrecognized_keys issue is given', () => {
    const formattedIssue = formatIssue({
        code: 'unrecognized_keys',
        message: '',
        keys: ['bar'],
        path: ['foo'],
        input: {}
    }, '');
    assert.strictEqual(formattedIssue, 'at foo: unexpected additional property: "bar"');
});

test('returns the formatted issue when an too_big issue is given', () => {
    const formattedIssue = formatIssue({
        code: 'too_big',
        message: '',
        path: ['foo'],
        inclusive: false,
        origin: 'string',
        maximum: 2,
        input: ''
    }, '');
    assert.strictEqual(formattedIssue, 'at foo: string must contain less than 2 characters');
});

test('returns the formatted issue when an too_small issue is given', () => {
    const formattedIssue = formatIssue({
        code: 'too_small',
        message: '',
        path: ['foo'],
        inclusive: false,
        origin: 'string',
        input: '',
        minimum: 2
    }, '');
    assert.strictEqual(formattedIssue, 'at foo: string must contain more than 2 characters');
});

test('returns the formatted issue when an not_multiple_of issue is given', () => {
    const formattedIssue = formatIssue({
        code: 'not_multiple_of',
        path: ['foo'],
        message: '',
        divisor: 42,
        input: 1
    }, '');
    assert.strictEqual(formattedIssue, 'at foo: number must be multiple of 42');
});

test('returns the formatted issue when an invalid_format issue is given', () => {
    const formattedIssue = formatIssue({
        code: 'invalid_format',
        path: ['foo'],
        message: '',
        format: 'ip',
        input: ''
    }, '');
    assert.strictEqual(formattedIssue, 'at foo: invalid ip');
});

test('returns the formatted issue when an invalid_union issue is given', () => {
    const formattedIssue = formatIssue({
        code: 'invalid_union',
        path: ['foo'],
        message: '',
        errors: [],
        input: ''
    }, { foo: undefined });
    assert.strictEqual(formattedIssue, 'at foo: invalid value doesn’t match expected union');
});

test('returns the formatted issue when an invalid_key issue is given', () => {
    const formattedIssue = formatIssue({
        code: 'invalid_key',
        path: ['foo'],
        message: '',
        input: {},
        issues: [],
        origin: 'map'
    }, '');
    assert.strictEqual(formattedIssue, 'at foo: invalid key');
});

test('returns the formatted issue when an invalid_element issue is given', () => {
    const formattedIssue = formatIssue({
        code: 'invalid_element',
        origin: 'map',
        path: ['foo'],
        message: '',
        issues: [],
        input: {},
        key: ''
    }, '');
    assert.strictEqual(formattedIssue, 'at foo: invalid element');
});

test('returns the formatted issue when a custom issue is given', () => {
    const formattedIssue = formatIssue({
        code: 'custom',
        path: ['foo'],
        message: '',
        input: ''
    }, '');
    assert.strictEqual(formattedIssue, 'at foo: invalid input');
});
