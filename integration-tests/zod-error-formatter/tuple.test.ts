import assert from 'node:assert';
import { test } from '@sondr3/minitest';
import { z } from 'zod/v4-mini';
import { safeParse } from '../../source/zod-error-formatter/formatter.ts';

test('formats messages for invalid items in tuple schemas correctly', function () {
    const schema = z.tuple([ z.literal('a') ]);
    const result = safeParse(schema, [ 'b' ]);

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'at [0]: invalid value: expected "a", but got string'
    ]);
});

test('formats messages for missing keys correctly', function () {
    const schema = z.tuple([ z.string(), z.string(), z.string() ]);
    // eslint-disable-next-line no-sparse-arrays -- we need a sparse array to test this use-case
    const result = safeParse(schema, [ 'a', , 'b' ]);

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'at [1]: missing key; expected string'
    ]);
});

test('formats messages for invalid rest values in tuple schemas correctly', function () {
    const schema = z.tuple([ z.literal('a') ], z.number());
    const result = safeParse(schema, [ 'a', true ]);

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'at [1]: expected number, but got boolean'
    ]);
});

test('formats messages for extra items in fixed tuple schemas correctly', function () {
    const schema = z.tuple([ z.literal('a') ]);
    const result = safeParse(schema, [ 'a', 'b' ]);

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'array must contain at most 1 element'
    ]);
});
