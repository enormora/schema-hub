import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { formatTooSmallIssueMessage } from './too-small.js';

test('formats the boundary correctly for string type with minimum 1', () => {
    const message = formatTooSmallIssueMessage({
        code: 'too_small',
        path: [],
        message: '',
        input: '',
        origin: 'string',
        minimum: 1,
        inclusive: true
    });
    assert.strictEqual(message, 'string must contain at least 1 character');
});

test('formats the boundary correctly for string type with minimum more than 1', () => {
    const message = formatTooSmallIssueMessage({
        code: 'too_small',
        path: [],
        message: '',
        input: '',
        origin: 'string',
        minimum: 2,
        inclusive: true
    });
    assert.strictEqual(message, 'string must contain at least 2 characters');
});

test('formats the boundary correctly for array type with minimum 1', () => {
    const message = formatTooSmallIssueMessage({
        code: 'too_small',
        path: [],
        message: '',
        input: '',
        origin: 'array',
        minimum: 1,
        inclusive: true
    });
    assert.strictEqual(message, 'array must contain at least 1 element');
});

test('formats the boundary correctly for array type with minimum more than 1', () => {
    const message = formatTooSmallIssueMessage({
        code: 'too_small',
        path: [],
        message: '',
        input: '',
        origin: 'array',
        minimum: 2,
        inclusive: true
    });
    assert.strictEqual(message, 'array must contain at least 2 elements');
});

test('formats the boundary correctly for set type with minimum 1', () => {
    const message = formatTooSmallIssueMessage({
        code: 'too_small',
        path: [],
        message: '',
        input: '',
        origin: 'set',
        minimum: 1,
        inclusive: true
    });
    assert.strictEqual(message, 'set must contain at least 1 element');
});

test('formats the boundary correctly for set type with minimum more than 1', () => {
    const message = formatTooSmallIssueMessage({
        code: 'too_small',
        path: [],
        message: '',
        input: '',
        origin: 'set',
        minimum: 2,
        inclusive: true
    });
    assert.strictEqual(message, 'set must contain at least 2 elements');
});

test('formats the boundary correctly for number type', () => {
    const message = formatTooSmallIssueMessage({
        code: 'too_small',
        path: [],
        message: '',
        input: '',
        origin: 'number',
        minimum: 1,
        inclusive: true
    });
    assert.strictEqual(message, 'number must be greater than or equal to 1');
});

test('formats the boundary correctly for bigint type', () => {
    const message = formatTooSmallIssueMessage({
        code: 'too_small',
        path: [],
        message: '',
        input: '',
        origin: 'bigint',
        minimum: 1n,
        inclusive: true
    });
    assert.strictEqual(message, 'bigint must be greater than or equal to 1');
});

test('formats the boundary correctly for date type', () => {
    const message = formatTooSmallIssueMessage({
        code: 'too_small',
        path: [],
        message: '',
        input: '',
        origin: 'date',
        minimum: 1,
        inclusive: true
    });
    assert.strictEqual(message, 'date must be greater than or equal to Thu, 01 Jan 1970 00:00:00 GMT');
});

test('formats the predicate correctly when inclusive true for string type', () => {
    const message = formatTooSmallIssueMessage({
        code: 'too_small',
        path: [],
        message: '',
        input: '',
        origin: 'string',
        minimum: 1,
        inclusive: true
    });
    assert.strictEqual(message, 'string must contain at least 1 character');
});

test('formats the predicate correctly when inclusive false for string type', () => {
    const message = formatTooSmallIssueMessage({
        code: 'too_small',
        path: [],
        message: '',
        input: '',
        origin: 'string',
        minimum: 1,
        inclusive: false
    });
    assert.strictEqual(message, 'string must contain more than 1 character');
});

test('formats the predicate correctly when inclusive true for set type', () => {
    const message = formatTooSmallIssueMessage({
        code: 'too_small',
        path: [],
        message: '',
        input: '',
        origin: 'set',
        minimum: 1,
        inclusive: true
    });
    assert.strictEqual(message, 'set must contain at least 1 element');
});

test('formats the predicate correctly when inclusive false for set type', () => {
    const message = formatTooSmallIssueMessage({
        code: 'too_small',
        path: [],
        message: '',
        input: '',
        origin: 'set',
        minimum: 1,
        inclusive: false
    });
    assert.strictEqual(message, 'set must contain more than 1 element');
});

test('formats the predicate correctly when inclusive true for array type', () => {
    const message = formatTooSmallIssueMessage({
        code: 'too_small',
        path: [],
        message: '',
        input: '',
        origin: 'array',
        minimum: 1,
        inclusive: true
    });
    assert.strictEqual(message, 'array must contain at least 1 element');
});

test('formats the predicate correctly when inclusive false for array type', () => {
    const message = formatTooSmallIssueMessage({
        code: 'too_small',
        path: [],
        message: '',
        input: '',
        origin: 'array',
        minimum: 1,
        inclusive: false
    });
    assert.strictEqual(message, 'array must contain more than 1 element');
});

test('formats the predicate correctly when inclusive true for number type', () => {
    const message = formatTooSmallIssueMessage({
        code: 'too_small',
        path: [],
        message: '',
        input: '',
        origin: 'number',
        minimum: 1,
        inclusive: true
    });
    assert.strictEqual(message, 'number must be greater than or equal to 1');
});

test('formats the predicate correctly when inclusive false for number type', () => {
    const message = formatTooSmallIssueMessage({
        code: 'too_small',
        path: [],
        message: '',
        input: '',
        origin: 'number',
        minimum: 1
    });
    assert.strictEqual(message, 'number must be greater than 1');
});

test('formats the predicate correctly when inclusive true for bigint type', () => {
    const message = formatTooSmallIssueMessage({
        code: 'too_small',
        path: [],
        message: '',
        input: '',
        origin: 'bigint',
        minimum: 1,
        inclusive: true
    });
    assert.strictEqual(message, 'bigint must be greater than or equal to 1');
});

test('formats the predicate correctly when inclusive false for bigint type', () => {
    const message = formatTooSmallIssueMessage({
        code: 'too_small',
        path: [],
        message: '',
        input: '',
        origin: 'bigint',
        minimum: 1,
        inclusive: false
    });
    assert.strictEqual(message, 'bigint must be greater than 1');
});

test('formats the predicate correctly when inclusive true for date type', () => {
    const message = formatTooSmallIssueMessage({
        code: 'too_small',
        path: [],
        message: '',
        input: '',
        origin: 'date',
        minimum: 1,
        inclusive: true
    });
    assert.strictEqual(message, 'date must be greater than or equal to Thu, 01 Jan 1970 00:00:00 GMT');
});

test('formats the predicate correctly when inclusive false for date type', () => {
    const message = formatTooSmallIssueMessage({
        code: 'too_small',
        path: [],
        message: '',
        input: '',
        origin: 'date',
        minimum: 1,
        inclusive: false
    });
    assert.strictEqual(message, 'date must be greater than Thu, 01 Jan 1970 00:00:00 GMT');
});

test('formats the predicate correctly when exact is true', () => {
    const message = formatTooSmallIssueMessage({
        code: 'too_small',
        path: [],
        message: '',
        input: '',
        origin: 'number',
        minimum: 1,
        exact: true,
        inclusive: true
    });
    assert.strictEqual(message, 'number must be exactly 1');
});
