import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { formatTooBigIssueMessage } from './too-big.js';

test('formats the boundary correctly for string type with maximum 0', () => {
    const message = formatTooBigIssueMessage({
        code: 'too_big',
        path: [],
        message: '',
        input: '',
        origin: 'string',
        maximum: 0,
        inclusive: true
    });
    assert.strictEqual(message, 'string must contain at most 0 characters');
});

test('formats the boundary correctly for string type with maximum 1', () => {
    const message = formatTooBigIssueMessage({
        code: 'too_big',
        path: [],
        message: '',
        input: '',
        origin: 'string',
        maximum: 1,
        inclusive: true
    });
    assert.strictEqual(message, 'string must contain at most 1 character');
});

test('formats the boundary correctly for string type with maximum more than 1', () => {
    const message = formatTooBigIssueMessage({
        code: 'too_big',
        path: [],
        message: '',
        input: '',
        origin: 'string',
        maximum: 2,
        inclusive: true
    });
    assert.strictEqual(message, 'string must contain at most 2 characters');
});

test('formats the boundary correctly for array type with maximum 0', () => {
    const message = formatTooBigIssueMessage({
        code: 'too_big',
        path: [],
        message: '',
        input: '',
        origin: 'array',
        maximum: 0,
        inclusive: true
    });
    assert.strictEqual(message, 'array must contain at most 0 elements');
});

test('formats the boundary correctly for array type with maximum 1', () => {
    const message = formatTooBigIssueMessage({
        code: 'too_big',
        path: [],
        message: '',
        input: '',
        origin: 'array',
        maximum: 1,
        inclusive: true
    });
    assert.strictEqual(message, 'array must contain at most 1 element');
});

test('formats the boundary correctly for array type with maximum more than 1', () => {
    const message = formatTooBigIssueMessage({
        code: 'too_big',
        path: [],
        message: '',
        input: '',
        origin: 'array',
        maximum: 2,
        inclusive: true
    });
    assert.strictEqual(message, 'array must contain at most 2 elements');
});

test('formats the boundary correctly for set type with maximum 0', () => {
    const message = formatTooBigIssueMessage({
        code: 'too_big',
        path: [],
        message: '',
        input: '',
        origin: 'set',
        maximum: 0,
        inclusive: true
    });
    assert.strictEqual(message, 'set must contain at most 0 elements');
});

test('formats the boundary correctly for set type with maximum 1', () => {
    const message = formatTooBigIssueMessage({
        code: 'too_big',
        path: [],
        message: '',
        input: '',
        origin: 'set',
        maximum: 1,
        inclusive: true
    });
    assert.strictEqual(message, 'set must contain at most 1 element');
});

test('formats the boundary correctly for set type with maximum more than 1', () => {
    const message = formatTooBigIssueMessage({
        code: 'too_big',
        path: [],
        message: '',
        input: '',
        origin: 'set',
        maximum: 2,
        inclusive: true
    });
    assert.strictEqual(message, 'set must contain at most 2 elements');
});

test('formats the boundary correctly for number type', () => {
    const message = formatTooBigIssueMessage({
        code: 'too_big',
        path: [],
        message: '',
        input: '',
        origin: 'number',
        maximum: 1,
        inclusive: true
    });
    assert.strictEqual(message, 'number must be less than or equal to 1');
});

test('formats the boundary correctly for bigint type', () => {
    const message = formatTooBigIssueMessage({
        code: 'too_big',
        path: [],
        message: '',
        input: '',
        origin: 'bigint',
        maximum: 1n,
        inclusive: true
    });
    assert.strictEqual(message, 'bigint must be less than or equal to 1');
});

test('formats the boundary correctly for date type', () => {
    const message = formatTooBigIssueMessage({
        code: 'too_big',
        path: [],
        message: '',
        input: '',
        origin: 'date',
        maximum: 1,
        inclusive: true
    });
    assert.strictEqual(message, 'date must be smaller than or equal to Thu, 01 Jan 1970 00:00:00 GMT');
});

test('formats the predicate correctly when inclusive true for string type', () => {
    const message = formatTooBigIssueMessage({
        code: 'too_big',
        path: [],
        message: '',
        input: '',
        origin: 'string',
        maximum: 1,
        inclusive: true
    });
    assert.strictEqual(message, 'string must contain at most 1 character');
});

test('formats the predicate correctly when inclusive false for string type', () => {
    const message = formatTooBigIssueMessage({
        code: 'too_big',
        path: [],
        message: '',
        input: '',
        origin: 'string',
        maximum: 1,
        inclusive: false
    });
    assert.strictEqual(message, 'string must contain less than 1 character');
});

test('formats the predicate correctly when inclusive true for set type', () => {
    const message = formatTooBigIssueMessage({
        code: 'too_big',
        path: [],
        message: '',
        input: '',
        origin: 'set',
        maximum: 1,
        inclusive: true
    });
    assert.strictEqual(message, 'set must contain at most 1 element');
});

test('formats the predicate correctly when inclusive false for set type', () => {
    const message = formatTooBigIssueMessage({
        code: 'too_big',
        path: [],
        message: '',
        input: '',
        origin: 'set',
        maximum: 1,
        inclusive: false
    });
    assert.strictEqual(message, 'set must contain less than 1 element');
});

test('formats the predicate correctly when inclusive true for array type', () => {
    const message = formatTooBigIssueMessage({
        code: 'too_big',
        path: [],
        message: '',
        input: '',
        origin: 'array',
        maximum: 1,
        inclusive: true
    });
    assert.strictEqual(message, 'array must contain at most 1 element');
});

test('formats the predicate correctly when inclusive false for array type', () => {
    const message = formatTooBigIssueMessage({
        code: 'too_big',
        path: [],
        message: '',
        input: '',
        origin: 'array',
        maximum: 1,
        inclusive: false
    });
    assert.strictEqual(message, 'array must contain less than 1 element');
});

test('formats the predicate correctly when inclusive true for number type', () => {
    const message = formatTooBigIssueMessage({
        code: 'too_big',
        path: [],
        message: '',
        input: '',
        origin: 'number',
        maximum: 1,
        inclusive: true
    });
    assert.strictEqual(message, 'number must be less than or equal to 1');
});

test('formats the predicate correctly when inclusive false for number type', () => {
    const message = formatTooBigIssueMessage({
        code: 'too_big',
        path: [],
        message: '',
        input: '',
        origin: 'number',
        maximum: 1,
        inclusive: false
    });
    assert.strictEqual(message, 'number must be less than 1');
});

test('formats the predicate correctly when inclusive true for bigint type', () => {
    const message = formatTooBigIssueMessage({
        code: 'too_big',
        path: [],
        message: '',
        input: '',
        origin: 'bigint',
        maximum: 1,
        inclusive: true
    });
    assert.strictEqual(message, 'bigint must be less than or equal to 1');
});

test('formats the predicate correctly when inclusive false for bigint type', () => {
    const message = formatTooBigIssueMessage({
        code: 'too_big',
        path: [],
        message: '',
        input: '',
        origin: 'bigint',
        maximum: 1,
        inclusive: false
    });
    assert.strictEqual(message, 'bigint must be less than 1');
});

test('formats the predicate correctly when inclusive true for date type', () => {
    const message = formatTooBigIssueMessage({
        code: 'too_big',
        path: [],
        message: '',
        input: '',
        origin: 'date',
        maximum: 1,
        inclusive: true
    });
    assert.strictEqual(message, 'date must be smaller than or equal to Thu, 01 Jan 1970 00:00:00 GMT');
});

test('formats the predicate correctly when inclusive false for date type', () => {
    const message = formatTooBigIssueMessage({
        code: 'too_big',
        path: [],
        message: '',
        input: '',
        origin: 'date',
        maximum: 1,
        inclusive: false
    });
    assert.strictEqual(message, 'date must be smaller than Thu, 01 Jan 1970 00:00:00 GMT');
});
