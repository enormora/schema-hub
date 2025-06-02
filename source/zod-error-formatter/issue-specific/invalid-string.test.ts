import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { formatInvalidStringIssueMessage } from './invalid-string.js';

test('formats the invalid string issue correctly when validation is "regex"', () => {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_format',
        path: [],
        message: '',
        input: '',
        format: 'regex'
    });
    assert.strictEqual(message, 'string doesn’t match expected pattern');
});

test('formats the invalid string issue correctly when validation is "email"', () => {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_format',
        path: [],
        message: '',
        input: '',
        format: 'email'
    });
    assert.strictEqual(message, 'invalid email');
});

test('formats the invalid string issue correctly when validation is "url"', () => {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_format',
        path: [],
        message: '',
        input: '',
        format: 'url'
    });
    assert.strictEqual(message, 'invalid url');
});

test('formats the invalid string issue correctly when validation is "emoji"', () => {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_format',
        path: [],
        message: '',
        input: '',
        format: 'emoji'
    });
    assert.strictEqual(message, 'invalid emoji');
});

test('formats the invalid string issue correctly when validation is "uuid"', () => {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_format',
        path: [],
        message: '',
        input: '',
        format: 'uuid'
    });
    assert.strictEqual(message, 'invalid uuid');
});

test('formats the invalid string issue correctly when validation is "cuid"', () => {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_format',
        path: [],
        message: '',
        input: '',
        format: 'cuid'
    });
    assert.strictEqual(message, 'invalid cuid');
});

test('formats the invalid string issue correctly when validation is "cuid2"', () => {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_format',
        path: [],
        message: '',
        input: '',
        format: 'cuid2'
    });
    assert.strictEqual(message, 'invalid cuid2');
});

test('formats the invalid string issue correctly when validation is "ulid"', () => {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_format',
        path: [],
        message: '',
        input: '',
        format: 'ulid'
    });
    assert.strictEqual(message, 'invalid ulid');
});

test('formats the invalid string issue correctly when validation is "datetime"', () => {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_format',
        path: [],
        message: '',
        input: '',
        format: 'datetime'
    });
    assert.strictEqual(message, 'invalid datetime');
});

test('formats the invalid string issue correctly when validation is "ip"', () => {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_format',
        path: [],
        message: '',
        input: '',
        format: 'ip'
    });
    assert.strictEqual(message, 'invalid ip');
});

test('formats the invalid string issue correctly when validation is requires an includes term without position', () => {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_format',
        path: [],
        message: '',
        input: '',
        format: 'includes',
        includes: 'foo'
    });
    assert.strictEqual(message, 'string must include "foo"');
});

test('formats the invalid string issue correctly when validation is requires a starts-with term', () => {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_format',
        path: [],
        message: '',
        input: '',
        format: 'starts_with',
        prefix: 'foo'
    });
    assert.strictEqual(message, 'string must start with "foo"');
});

test('formats the invalid string issue correctly when validation is requires a ends-with term', () => {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_format',
        path: [],
        message: '',
        input: '',
        format: 'ends_with',
        suffix: 'foo'
    });
    assert.strictEqual(message, 'string must end with "foo"');
});
