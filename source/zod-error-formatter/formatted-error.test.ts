import assert from 'node:assert';
import { test } from '@sondr3/minitest';
import { createFormattedZodError } from './formatted-error.ts';

test('creates an instance of error', function () {
    const error = createFormattedZodError([ '' ]);
    assert.strictEqual(error instanceof Error, true, 'expected and instance of Error');
});

test('exposes the given issues', function () {
    const error = createFormattedZodError([ 'first', 'second' ]);
    assert.deepStrictEqual(error.issues, [ 'first', 'second' ]);
});

test('exposes a simple message when there is only one issue', function () {
    const error = createFormattedZodError([ 'foo' ]);
    assert.strictEqual(error.message, 'Validation failed: foo');
});

test('exposes a multi-line message when there more than one issues', function () {
    const error = createFormattedZodError([ 'foo', 'bar', 'baz' ]);
    assert.strictEqual(error.message, 'Validation failed with 3 issues:\n- foo\n- bar\n- baz');
});
