import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { z } from 'zod';
import { safeParse } from '../../source/zod-error-formatter/formatter.js';

test('formats messages for invalid discriminated union schemas correctly', () => {
    const schema = z.discriminatedUnion('type', [
        z.object({ type: z.literal('foo'), data: z.number() }),
        z.object({ type: z.literal('bar'), data: z.boolean() })
    ]);
    const result = safeParse(schema, { type: 42 });

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'at type: invalid discriminator value, expected one of "foo" or "bar"'
    ]);
});

test('formats messages for invalid discriminated union schemas correctly when the discriminator is missing', () => {
    const schema = z.discriminatedUnion('type', [
        z.object({ type: z.literal('foo'), data: z.number() }),
        z.object({ type: z.literal('bar'), data: z.boolean() })
    ]);
    const result = safeParse(schema, {});

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'at type: invalid discriminator value, expected one of "foo" or "bar"'
    ]);
});
