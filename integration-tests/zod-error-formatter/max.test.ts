import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { z } from 'zod/v4-mini';
import { safeParse } from '../../source/zod-error-formatter/formatter.js';

test('formats messages for invalid string schemas with max boundary correctly', () => {
    const schema = z.string().check(z.maxLength(1));
    const result = safeParse(schema, 'ab');

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'string must contain at most 1 character'
    ]);
});

test('formats messages for invalid string schemas with length boundary correctly', () => {
    const length = 3;
    const schema = z.string().check(z.length(length));
    const result = safeParse(schema, 'abcd');

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'string must contain less than 3 characters'
    ]);
});
