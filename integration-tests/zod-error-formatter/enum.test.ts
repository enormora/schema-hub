import assert from 'node:assert';
import { test } from '@sondr3/minitest';
import { z } from 'zod/v4-mini';
import { safeParse } from '../../source/zod-error-formatter/formatter.ts';

test('formats messages for invalid enum schemas correctly', function () {
    const schema = z.enum([ 'foo' ]);
    const result = safeParse(schema, 'bar');

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'invalid value: expected "foo", but got string'
    ]);
});

test('formats messages for invalid native enum schemas correctly', function () {
    const Example = { 0: 'foo', foo: 0 } as const;
    const schema = z.enum(Example);
    const result = safeParse(schema, 1);

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'invalid value: expected 0, but got number'
    ]);
});
