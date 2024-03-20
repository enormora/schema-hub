import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { z } from 'zod';


test('works', () => {
    const schema = z.string();
    const result = schema.parse(null);

    assert.deepStrictEqual(result, {});
});
