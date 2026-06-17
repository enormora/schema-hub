import assert from 'node:assert';
import { test } from '@sondr3/minitest';
import { formatUnrecognizedKeysIssueMessage } from './unrecognized-keys.ts';

test('formats a message which says the property is unknown when the given keys is an empty array', function () {
    const message = formatUnrecognizedKeysIssueMessage({
        code: 'unrecognized_keys',
        path: [],
        message: '',
        input: {},
        keys: []
    });
    assert.strictEqual(message, 'unexpected additional property: unknown');
});

test('properly escapes the keys so it doesn’t get confused with unknown when the key is unknown', function () {
    const message = formatUnrecognizedKeysIssueMessage({
        code: 'unrecognized_keys',
        path: [],
        message: '',
        input: {},
        keys: [ 'unknown' ]
    });
    assert.strictEqual(message, 'unexpected additional property: "unknown"');
});

test('properly escapes the keys in case they contain special characters', function () {
    const message = formatUnrecognizedKeysIssueMessage({
        code: 'unrecognized_keys',
        path: [],
        message: '',
        input: {},
        keys: [ 'foo"bar' ]
    });
    assert.strictEqual(message, 'unexpected additional property: "foo\\"bar"');
});

test('correctly formats two properties using "and" as a separator', function () {
    const message = formatUnrecognizedKeysIssueMessage({
        code: 'unrecognized_keys',
        path: [],
        message: '',
        input: {},
        keys: [ 'foo', 'bar' ]
    });
    assert.strictEqual(message, 'unexpected additional properties: "foo" and "bar"');
});

test('correctly formats three properties using comma as separator and "and" for the last item', function () {
    const message = formatUnrecognizedKeysIssueMessage({
        code: 'unrecognized_keys',
        path: [],
        message: '',
        input: {},
        keys: [ 'foo', 'bar', 'baz' ]
    });
    assert.strictEqual(message, 'unexpected additional properties: "foo", "bar" and "baz"');
});
