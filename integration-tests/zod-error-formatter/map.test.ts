import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { z } from 'zod';
import { safeParse } from '../../source/zod-error-formatter/formatter.js';

test('formats messages for invalid keys in map schemas correctly', () => {
    const schema = z.map(z.literal('a'), z.string());
    const result = safeParse(schema, new Map([['b', 'foo']]));

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'at [0].key: invalid literal: expected "a", but got string'
    ]);
});

test('formats messages for invalid values in map schemas correctly', () => {
    const schema = z.map(z.literal('a'), z.string());
    const result = safeParse(schema, new Map([['a', 0]]));

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'at [0].value: expected string, but got number'
    ]);
});
