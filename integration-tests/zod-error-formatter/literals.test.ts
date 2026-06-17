import assert from 'node:assert';
import { test } from '@sondr3/minitest';
import { z } from 'zod/v4-mini';
import { safeParse } from '../../source/zod-error-formatter/formatter.ts';

test('formats messages for invalid string literals correctly', function () {
    const schema = z.literal('foo');
    const result = safeParse(schema, 'bar');

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'invalid value: expected "foo", but got string'
    ]);
});

test('formats messages for invalid string literals if they are missing from a property', function () {
    const schema = z.object({ foo: z.literal('bar') });
    const result = safeParse(schema, {});

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'at foo: missing property; expected "bar"'
    ]);
});

test('formats messages for invalid string literals if they are missing from a key', function () {
    const schema = z.tuple([ z.number(), z.literal('foo'), z.number() ]);
    // eslint-disable-next-line no-sparse-arrays -- sparse array needed to test this use-case
    const result = safeParse(schema, [ 0, , 1 ]);

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'at [1]: missing key; expected "foo"'
    ]);
});
