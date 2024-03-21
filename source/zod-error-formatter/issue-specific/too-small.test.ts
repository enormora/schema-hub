import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { formatTooSmallIssueMessage } from './too-small.js';

test('formats the boundary correctly for string type with minimum 1', () => {
    const message = formatTooSmallIssueMessage({
        code: 'too_small',
        path: [],
        message: '',
        type: 'string',
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
        type: 'string',
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
        type: 'array',
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
        type: 'array',
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
        type: 'set',
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
        type: 'set',
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
        type: 'number',
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
        type: 'bigint',
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
        type: 'date',
        minimum: 1,
        inclusive: true
    });
    assert.strictEqual(message, 'date must be greater than or equal to Thu, 01 Jan 1970 00:00:00 GMT');
});

test('formats the predicate correctly when exact is true', () => {
    const message = formatTooSmallIssueMessage({
        code: 'too_small',
        path: [],
        message: '',
        type: 'number',
        minimum: 1,
        inclusive: true,
        exact: true
    });
    assert.strictEqual(message, 'number must be exactly 1');
});

test('formats the predicate correctly when exact is false and inclusive true for string type', () => {
    const message = formatTooSmallIssueMessage({
        code: 'too_small',
        path: [],
        message: '',
        type: 'string',
        minimum: 1,
        inclusive: true,
        exact: false
    });
    assert.strictEqual(message, 'string must contain at least 1 character');
});

test('formats the predicate correctly when exact is false and inclusive false for string type', () => {
    const message = formatTooSmallIssueMessage({
        code: 'too_small',
        path: [],
        message: '',
        type: 'string',
        minimum: 1,
        inclusive: false,
        exact: false
    });
    assert.strictEqual(message, 'string must contain more than 1 character');
});

test('formats the predicate correctly when exact is false and inclusive true for set type', () => {
    const message = formatTooSmallIssueMessage({
        code: 'too_small',
        path: [],
        message: '',
        type: 'set',
        minimum: 1,
        inclusive: true,
        exact: false
    });
    assert.strictEqual(message, 'set must contain at least 1 element');
});

test('formats the predicate correctly when exact is false and inclusive false for set type', () => {
    const message = formatTooSmallIssueMessage({
        code: 'too_small',
        path: [],
        message: '',
        type: 'set',
        minimum: 1,
        inclusive: false,
        exact: false
    });
    assert.strictEqual(message, 'set must contain more than 1 element');
});

test('formats the predicate correctly when exact is false and inclusive true for array type', () => {
    const message = formatTooSmallIssueMessage({
        code: 'too_small',
        path: [],
        message: '',
        type: 'array',
        minimum: 1,
        inclusive: true,
        exact: false
    });
    assert.strictEqual(message, 'array must contain at least 1 element');
});

test('formats the predicate correctly when exact is false and inclusive false for array type', () => {
    const message = formatTooSmallIssueMessage({
        code: 'too_small',
        path: [],
        message: '',
        type: 'array',
        minimum: 1,
        inclusive: false,
        exact: false
    });
    assert.strictEqual(message, 'array must contain more than 1 element');
});

test('formats the predicate correctly when exact is false and inclusive true for number type', () => {
    const message = formatTooSmallIssueMessage({
        code: 'too_small',
        path: [],
        message: '',
        type: 'number',
        minimum: 1,
        inclusive: true,
        exact: false
    });
    assert.strictEqual(message, 'number must be greater than or equal to 1');
});

test('formats the predicate correctly when exact is false and inclusive false for number type', () => {
    const message = formatTooSmallIssueMessage({
        code: 'too_small',
        path: [],
        message: '',
        type: 'number',
        minimum: 1,
        inclusive: false,
        exact: false
    });
    assert.strictEqual(message, 'number must be greater than 1');
});

test('formats the predicate correctly when exact is false and inclusive true for bigint type', () => {
    const message = formatTooSmallIssueMessage({
        code: 'too_small',
        path: [],
        message: '',
        type: 'bigint',
        minimum: 1,
        inclusive: true,
        exact: false
    });
    assert.strictEqual(message, 'bigint must be greater than or equal to 1');
});

test('formats the predicate correctly when exact is false and inclusive false for bigint type', () => {
    const message = formatTooSmallIssueMessage({
        code: 'too_small',
        path: [],
        message: '',
        type: 'bigint',
        minimum: 1,
        inclusive: false,
        exact: false
    });
    assert.strictEqual(message, 'bigint must be greater than 1');
});

test('formats the predicate correctly when exact is false and inclusive true for date type', () => {
    const message = formatTooSmallIssueMessage({
        code: 'too_small',
        path: [],
        message: '',
        type: 'date',
        minimum: 1,
        inclusive: true,
        exact: false
    });
    assert.strictEqual(message, 'date must be greater than or equal to Thu, 01 Jan 1970 00:00:00 GMT');
});

test('formats the predicate correctly when exact is false and inclusive false for date type', () => {
    const message = formatTooSmallIssueMessage({
        code: 'too_small',
        path: [],
        message: '',
        type: 'date',
        minimum: 1,
        inclusive: false,
        exact: false
    });
    assert.strictEqual(message, 'date must be greater than Thu, 01 Jan 1970 00:00:00 GMT');
});
