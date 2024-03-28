import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { z } from 'zod';
import { safeParse } from '../../source/zod-error-formatter/formatter.js';

test('formats messages for invalid string literals correctly', () => {
    const schema = z.literal('foo');
    const result = safeParse(schema, 'bar');

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'invalid literal: expected "foo", but got string'
    ]);
});

test('formats messages for invalid string literals if they are missing from a property', () => {
    const schema = z.object({ foo: z.literal('bar') });
    const result = safeParse(schema, {});

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'at foo: missing property'
    ]);
});

test('formats messages for invalid string literals if they are missing from a key', () => {
    const schema = z.tuple([z.number(), z.literal('foo'), z.number()]);
    // eslint-disable-next-line no-sparse-arrays -- sparse array needed to test this use-case
    const result = safeParse(schema, [0, , 1]);

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'at [1]: missing key'
    ]);
});
