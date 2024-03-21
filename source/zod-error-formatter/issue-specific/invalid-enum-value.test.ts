import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { formatInvalidEnumValueIssueMessage } from './invalid-enum-value.js';

test('formats invalid enum string values', () => {
    const message = formatInvalidEnumValueIssueMessage({
        code: 'invalid_enum_value',
        path: [],
        message: '',
        options: ['a', 'b'],
        received: 'foo'
    });
    assert.strictEqual(message, 'invalid enum value: expected one of "a" or "b", but got string');
});

test('formats invalid enum number values', () => {
    const message = formatInvalidEnumValueIssueMessage({
        code: 'invalid_enum_value',
        path: [],
        message: '',
        options: [0, 1],
        received: 2
    });
    assert.strictEqual(message, 'invalid enum value: expected one of 0 or 1, but got number');
});

test('formats invalid enum values with a single option', () => {
    const message = formatInvalidEnumValueIssueMessage({
        code: 'invalid_enum_value',
        path: [],
        message: '',
        options: ['a'],
        received: 'foo'
    });
    assert.strictEqual(message, 'invalid enum value: expected "a", but got string');
});

test('formats invalid enum values with many options', () => {
    const message = formatInvalidEnumValueIssueMessage({
        code: 'invalid_enum_value',
        path: [],
        message: '',
        options: ['a', 'b', 'c', 'd', 'e'],
        received: 'foo'
    });
    assert.strictEqual(message, 'invalid enum value: expected one of "a", "b", "c", "d" or "e", but got string');
});
