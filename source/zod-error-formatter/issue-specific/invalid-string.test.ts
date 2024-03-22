import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { formatInvalidStringIssueMessage } from './invalid-string.js';

test('formats the invalid string issue correctly when validation is "regex"', () => {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_string',
        path: [],
        message: '',
        validation: 'regex'
    });
    assert.strictEqual(message, 'string doesn’t match expected pattern');
});

test('formats the invalid string issue correctly when validation is "email"', () => {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_string',
        path: [],
        message: '',
        validation: 'email'
    });
    assert.strictEqual(message, 'invalid email');
});

test('formats the invalid string issue correctly when validation is "url"', () => {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_string',
        path: [],
        message: '',
        validation: 'url'
    });
    assert.strictEqual(message, 'invalid url');
});

test('formats the invalid string issue correctly when validation is "emoji"', () => {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_string',
        path: [],
        message: '',
        validation: 'emoji'
    });
    assert.strictEqual(message, 'invalid emoji');
});

test('formats the invalid string issue correctly when validation is "uuid"', () => {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_string',
        path: [],
        message: '',
        validation: 'uuid'
    });
    assert.strictEqual(message, 'invalid uuid');
});

test('formats the invalid string issue correctly when validation is "cuid"', () => {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_string',
        path: [],
        message: '',
        validation: 'cuid'
    });
    assert.strictEqual(message, 'invalid cuid');
});

test('formats the invalid string issue correctly when validation is "cuid2"', () => {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_string',
        path: [],
        message: '',
        validation: 'cuid2'
    });
    assert.strictEqual(message, 'invalid cuid2');
});

test('formats the invalid string issue correctly when validation is "ulid"', () => {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_string',
        path: [],
        message: '',
        validation: 'ulid'
    });
    assert.strictEqual(message, 'invalid ulid');
});

test('formats the invalid string issue correctly when validation is "datetime"', () => {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_string',
        path: [],
        message: '',
        validation: 'datetime'
    });
    assert.strictEqual(message, 'invalid datetime');
});

test('formats the invalid string issue correctly when validation is "ip"', () => {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_string',
        path: [],
        message: '',
        validation: 'ip'
    });
    assert.strictEqual(message, 'invalid ip');
});

test('formats the invalid string issue correctly when validation is requires an includes term without position', () => {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_string',
        path: [],
        message: '',
        validation: { includes: 'foo' }
    });
    assert.strictEqual(message, 'string must include "foo"');
});

test('formats the invalid string issue correctly when validation is requires an includes term with position', () => {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_string',
        path: [],
        message: '',
        validation: { includes: 'foo', position: 42 }
    });
    assert.strictEqual(message, 'string must include "foo" at one ore more positions greater than or equal to 42');
});

test('formats the invalid string issue correctly when validation is requires a starts-with term', () => {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_string',
        path: [],
        message: '',
        validation: { startsWith: 'foo' }
    });
    assert.strictEqual(message, 'string must start with "foo"');
});

test('formats the invalid string issue correctly when validation is requires a ends-with term', () => {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_string',
        path: [],
        message: '',
        validation: { endsWith: 'foo' }
    });
    assert.strictEqual(message, 'string must end with "foo"');
});
