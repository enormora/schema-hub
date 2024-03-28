import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { ZodError } from 'zod';
import { formatIssue } from './format-issue.js';

test('returns just the message when the path is empty', () => {
    const formattedIssue = formatIssue({ code: 'custom', message: 'foo', path: [] }, '');
    assert.strictEqual(formattedIssue, 'invalid input');
});

test('returns the message with path when the path is not empty', () => {
    const formattedIssue = formatIssue({ code: 'custom', message: 'bar', path: ['foo'] }, '');
    assert.strictEqual(formattedIssue, 'at foo: invalid input');
});

test('returns the formatted issue when an invalid_type issue is given', () => {
    const formattedIssue = formatIssue({
        code: 'invalid_type',
        message: '',
        expected: 'nan',
        received: 'float',
        path: ['foo']
    }, { foo: '' });
    assert.strictEqual(formattedIssue, 'at foo: expected nan, but got float');
});

test('returns the formatted issue when an invalid_literal issue is given', () => {
    const formattedIssue = formatIssue({
        code: 'invalid_literal',
        message: '',
        expected: 'foo',
        received: 'bar',
        path: ['foo']
    }, { foo: '' });
    assert.strictEqual(formattedIssue, 'at foo: invalid literal: expected "foo", but got string');
});

test('returns the formatted issue when an unrecognized_keys issue is given', () => {
    const formattedIssue = formatIssue({
        code: 'unrecognized_keys',
        message: '',
        keys: ['bar'],
        path: ['foo']
    }, '');
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
    }, '');
    assert.strictEqual(formattedIssue, 'at foo: string must contain less than 2 characters');
});

test('returns the formatted issue when an too_small issue is given', () => {
    const formattedIssue = formatIssue({
        code: 'too_small',
        message: '',
        path: ['foo'],
        inclusive: false,
        type: 'string',
        minimum: 2
    }, '');
    assert.strictEqual(formattedIssue, 'at foo: string must contain more than 2 characters');
});

test('returns the formatted issue when an not_multiple_of issue is given', () => {
    const formattedIssue = formatIssue({
        code: 'not_multiple_of',
        path: ['foo'],
        message: '',
        multipleOf: 42
    }, '');
    assert.strictEqual(formattedIssue, 'at foo: number must be multiple of 42');
});

test('returns the formatted issue when an invalid_enum_value issue is given', () => {
    const formattedIssue = formatIssue({
        code: 'invalid_enum_value',
        path: ['foo'],
        message: '',
        options: ['a', 'b'],
        received: 1
    }, '');
    assert.strictEqual(formattedIssue, 'at foo: invalid enum value: expected one of "a" or "b", but got number');
});

test('returns the formatted issue when an invalid_string issue is given', () => {
    const formattedIssue = formatIssue({
        code: 'invalid_string',
        path: ['foo'],
        message: '',
        validation: 'ip'
    }, '');
    assert.strictEqual(formattedIssue, 'at foo: invalid ip');
});

test('returns the formatted issue when an invalid_union_discriminator issue is given', () => {
    const formattedIssue = formatIssue({
        code: 'invalid_union_discriminator',
        path: ['foo'],
        message: '',
        options: ['a']
    }, { foo: undefined });
    assert.strictEqual(formattedIssue, 'at foo: invalid discriminator: expected "a", but got undefined');
});

test('returns the formatted issue when an invalid_union issue is given', () => {
    const formattedIssue = formatIssue({
        code: 'invalid_union',
        path: ['foo'],
        message: '',
        unionErrors: []
    }, { foo: undefined });
    assert.strictEqual(formattedIssue, 'at foo: invalid value doesn’t match expected union');
});

test('returns the formatted issue when an invalid_arguments issue is given', () => {
    const formattedIssue = formatIssue({
        code: 'invalid_arguments',
        path: ['foo'],
        message: '',
        argumentsError: new ZodError([])
    }, '');
    assert.strictEqual(formattedIssue, 'at foo: invalid function arguments');
});

test('returns the formatted issue when an invalid_return_type issue is given', () => {
    const formattedIssue = formatIssue({
        code: 'invalid_return_type',
        path: ['foo'],
        message: '',
        returnTypeError: new ZodError([])
    }, '');
    assert.strictEqual(formattedIssue, 'at foo: invalid function return type');
});

test('returns the formatted issue when an invalid_date issue is given', () => {
    const formattedIssue = formatIssue({
        code: 'invalid_date',
        path: ['foo'],
        message: ''
    }, '');
    assert.strictEqual(formattedIssue, 'at foo: invalid date');
});

test('returns the formatted issue when a custom issue is given', () => {
    const formattedIssue = formatIssue({
        code: 'custom',
        path: ['foo'],
        message: ''
    }, '');
    assert.strictEqual(formattedIssue, 'at foo: invalid input');
});

test('returns the formatted issue when an invalid_intersection_types issue is given', () => {
    const formattedIssue = formatIssue({
        code: 'invalid_intersection_types',
        path: ['foo'],
        message: ''
    }, '');
    assert.strictEqual(formattedIssue, 'at foo: intersection results could not be merged');
});

test('returns the formatted issue when an not_finite issue is given', () => {
    const formattedIssue = formatIssue({
        code: 'not_finite',
        path: ['foo'],
        message: ''
    }, '');
    assert.strictEqual(formattedIssue, 'at foo: number must be finite');
});
