import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { z } from 'zod/v4-mini';
import { safeParse } from '../../source/zod-error-formatter/formatter.js';

test('formats messages for invalid string email validation', () => {
    const schema = z.string().check(z.email());
    const result = safeParse(schema, 'foo');

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, ['invalid email']);
});

test('formats messages for invalid string includes validation', () => {
    const schema = z.string().check(z.includes('foo', { position: 2 }));
    const result = safeParse(schema, 'foo');

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'string must include "foo"'
    ]);
});
