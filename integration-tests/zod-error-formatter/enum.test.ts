import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { z } from 'zod';
import { safeParse } from '../../source/zod-error-formatter/formatter.js';

test('formats messages for invalid enum schemas correctly', () => {
    const schema = z.enum(['foo']);
    const result = safeParse(schema, 'bar');

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'invalid enum value: expected "foo", but got string'
    ]);
});

test('formats messages for invalid native enum schemas correctly', () => {
    enum Example {
        foo
    }
    const schema = z.nativeEnum(Example);
    const result = safeParse(schema, 1);

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'invalid enum value: expected 0, but got number'
    ]);
});
