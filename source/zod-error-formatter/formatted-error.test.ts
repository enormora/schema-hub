import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { createFormattedZodError } from './formatted-error.js';

test('creates an instance of error', () => {
    const error = createFormattedZodError(['']);
    assert.strictEqual(error instanceof Error, true, 'expected and instance of Error');
});

test('exposes the given issues', () => {
    const error = createFormattedZodError(['first', 'second']);
    assert.deepStrictEqual(error.issues, ['first', 'second']);
});

test('exposes a simple message when there is only one issue', () => {
    const error = createFormattedZodError(['foo']);
    assert.strictEqual(error.message, 'Validation failed: foo');
});

test('exposes a multi-line message when there more than one issues', () => {
    const error = createFormattedZodError(['foo', 'bar', 'baz']);
    assert.strictEqual(error.message, 'Validation failed with 3 issues:\n- foo\n- bar\n- baz');
});
