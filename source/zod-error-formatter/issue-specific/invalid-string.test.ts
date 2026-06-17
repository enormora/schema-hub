import assert from 'node:assert';
import { test } from '@sondr3/minitest';
import { formatInvalidStringIssueMessage } from './invalid-string.ts';

test('formats the invalid string issue correctly when validation is "regex" with a pattern', function () {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_format',
        path: [],
        message: '',
        input: '',
        format: 'regex',
        pattern: '/^foo$/i'
    });
    assert.strictEqual(message, 'string doesn’t match expected pattern /^foo$/i');
});

test('formats the invalid string issue correctly when validation is "email"', function () {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_format',
        path: [],
        message: '',
        input: '',
        format: 'email'
    });
    assert.strictEqual(message, 'invalid email');
});

test('formats the invalid string issue correctly when validation is "url"', function () {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_format',
        path: [],
        message: '',
        input: '',
        format: 'url'
    });
    assert.strictEqual(message, 'invalid url');
});

test('formats the invalid string issue correctly when validation is "emoji"', function () {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_format',
        path: [],
        message: '',
        input: '',
        format: 'emoji'
    });
    assert.strictEqual(message, 'invalid emoji');
});

test('formats the invalid string issue correctly when validation is "uuid"', function () {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_format',
        path: [],
        message: '',
        input: '',
        format: 'uuid'
    });
    assert.strictEqual(message, 'invalid uuid');
});

test('formats the invalid string issue correctly when validation is "cuid"', function () {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_format',
        path: [],
        message: '',
        input: '',
        format: 'cuid'
    });
    assert.strictEqual(message, 'invalid cuid');
});

test('formats the invalid string issue correctly when validation is "cuid2"', function () {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_format',
        path: [],
        message: '',
        input: '',
        format: 'cuid2'
    });
    assert.strictEqual(message, 'invalid cuid2');
});

test('formats the invalid string issue correctly when validation is "ulid"', function () {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_format',
        path: [],
        message: '',
        input: '',
        format: 'ulid'
    });
    assert.strictEqual(message, 'invalid ulid');
});

test('formats the invalid string issue correctly when validation is "datetime"', function () {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_format',
        path: [],
        message: '',
        input: '',
        format: 'datetime'
    });
    assert.strictEqual(message, 'invalid datetime');
});

test('formats the invalid string issue correctly when validation is "ip"', function () {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_format',
        path: [],
        message: '',
        input: '',
        format: 'ip'
    });
    assert.strictEqual(message, 'invalid ip');
});

test('formats the invalid string issue correctly when validation is "jwt" without an algorithm', function () {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_format',
        path: [],
        message: '',
        input: '',
        format: 'jwt'
    });
    assert.strictEqual(message, 'invalid jwt');
});

test('formats the invalid string issue correctly when validation is "jwt" with an algorithm', function () {
    const message = formatInvalidStringIssueMessage({
        code: 'invalid_format',
        path: [],
        message: '',
        input: '',
        format: 'jwt',
        algorithm: 'RS256'
    });
    assert.strictEqual(message, 'invalid jwt (expected algorithm RS256)');
});

test('formats the invalid string issue correctly when validation is requires an includes term without position', function () {
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

test('formats the invalid string issue correctly when validation is requires a starts-with term', function () {
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

test('formats the invalid string issue correctly when validation is requires a ends-with term', function () {
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
