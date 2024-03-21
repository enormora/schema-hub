import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { z } from 'zod';
import { safeParse } from '../../source/zod-error-formatter/formatter.js';

test('formats messages for invalid set schemas with min boundary correctly', () => {
    const schema = z.set(z.string()).min(1);
    const result = safeParse(schema, new Set());

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'set must contain at least 1 element'
    ]);
});

test('formats messages for invalid array schemas with length boundary correctly', () => {
    const length = 3;
    const schema = z.array(z.string()).length(length);
    const result = safeParse(schema, ['a', 'b']);

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'array must contain exactly 3 elements'
    ]);
});
