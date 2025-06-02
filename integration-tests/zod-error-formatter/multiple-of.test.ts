import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { z } from 'zod/v4-mini';
import { safeParse } from '../../source/zod-error-formatter/formatter.js';

test('formats messages for invalid number schemas with multiple-of validation correctly', () => {
    const multipleOf = 2;
    const input = 7;
    const schema = z.number().check(z.multipleOf(multipleOf));
    const result = safeParse(schema, input);

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'number must be multiple of 2'
    ]);
});

test('formats messages for invalid bigint schemas with multiple-of validation correctly', () => {
    const multipleOf = 2n;
    const input = 7n;
    const schema = z.bigint().check(z.multipleOf(multipleOf));
    const result = safeParse(schema, input);

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'number must be multiple of 2'
    ]);
});
