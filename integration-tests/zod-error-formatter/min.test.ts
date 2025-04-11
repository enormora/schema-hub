import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { z } from 'zod/v4-mini';
import { safeParse } from '../../source/zod-error-formatter/formatter.js';

test('formats messages for invalid set schemas with min boundary correctly', () => {
    const schema = z.number().check(z.minimum(1));
    const result = safeParse(schema, 0);

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'number must be greater than or equal to 1'
    ]);
});

test('formats messages for invalid array schemas with length boundary correctly', () => {
    const length = 3;
    const schema = z.array(z.string()).check(z.length(length));
    const result = safeParse(schema, ['a', 'b']);

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'array must contain more than 3 elements'
    ]);
});
