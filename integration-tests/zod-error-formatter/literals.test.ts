import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { z } from 'zod';
import { safeParse } from '../../source/zod-error-formatter/formatter.js';

test('formats messages for invalid string literals correctly', () => {
    const schema = z.literal('foo');
    const result = safeParse(schema, 'bar');

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'invalid literal: expected "foo", but got string'
    ]);
});
