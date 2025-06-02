import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { z } from 'zod/v4-mini';
import { safeParse } from '../../source/zod-error-formatter/formatter.js';

test('formats messages for invalid discriminated union schemas correctly', () => {
    const schema = z.discriminatedUnion('type', [
        z.object({ type: z.literal('foo'), data: z.number() }),
        z.object({ type: z.literal('bar'), data: z.boolean() })
    ]);
    const result = safeParse(schema, { type: 42 });

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'at type: invalid value doesn’t match expected union'
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
        'at type: missing property'
    ]);
});

test('formats messages for invalid discriminated union schemas correctly when discriminator is undefined', () => {
    const schema = z.discriminatedUnion('type', [
        z.object({ type: z.literal('foo'), data: z.number() }),
        z.object({ type: z.literal('bar'), data: z.boolean() })
    ]);
    const result = safeParse(schema, { type: undefined });

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'at type: invalid value doesn’t match expected union'
    ]);
});
