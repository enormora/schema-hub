import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { z } from 'zod';
import { safeParse } from '../../source/zod-error-formatter/formatter.js';

test('formats messages for invalid string schemas correctly', () => {
    const schema = z.string();
    const result = safeParse(schema, 0);

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'expected string, but got number'
    ]);
});

test('formats messages for invalid number schemas correctly', () => {
    const schema = z.number();
    const result = safeParse(schema, '');

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'expected number, but got string'
    ]);
});

test('formats messages for invalid null schemas correctly', () => {
    const schema = z.null();
    const result = safeParse(schema, true);

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'expected null, but got boolean'
    ]);
});

test('formats messages for invalid object schemas correctly', () => {
    const schema = z.object({ foo: z.string() });
    const result = safeParse(schema, new Date(0));

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'expected object, but got date'
    ]);
});

test('formats messages for missing object properties correctly', () => {
    const schema = z.object({ foo: z.string() });
    const result = safeParse(schema, {});

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'at foo: missing property'
    ]);
});
