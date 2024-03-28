import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { z } from 'zod';
import { safeParse } from '../../source/zod-error-formatter/formatter.js';

test('formats messages for invalid items in tuple schemas correctly', () => {
    const schema = z.tuple([z.literal('a')]);
    const result = safeParse(schema, ['b']);

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'at [0]: invalid literal: expected "a", but got string'
    ]);
});

test('formats messages for missing keys correctly', () => {
    const schema = z.tuple([z.string(), z.string(), z.string()]);
    // eslint-disable-next-line no-sparse-arrays -- we need a sparse array to test this use-case
    const result = safeParse(schema, ['a', , 'b']);

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'at [1]: missing key'
    ]);
});

test('formats messages for invalid rest values in tuple schemas correctly', () => {
    const schema = z.tuple([z.literal('a')]).rest(z.number());
    const result = safeParse(schema, ['a', true]);

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'at [1]: expected number, but got boolean'
    ]);
});

test('formats messages for extra items in fixed tuple schemas correctly', () => {
    const schema = z.tuple([z.literal('a')]);
    const result = safeParse(schema, ['a', 'b']);

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'array must contain at most 1 element'
    ]);
});
