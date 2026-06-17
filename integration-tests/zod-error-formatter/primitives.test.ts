import assert from 'node:assert';
import { test } from '@sondr3/minitest';
import { z } from 'zod/v4-mini';
import { safeParse } from '../../source/zod-error-formatter/formatter.ts';

test('formats messages for invalid string schemas correctly', function () {
    const schema = z.string();
    const result = safeParse(schema, 0);

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'expected string, but got number'
    ]);
});

test('formats messages for invalid number schemas correctly', function () {
    const schema = z.number();
    const result = safeParse(schema, '');

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'expected number, but got string'
    ]);
});

test('formats messages for invalid null schemas correctly', function () {
    const schema = z.null();
    const result = safeParse(schema, true);

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'expected null, but got boolean'
    ]);
});

test('formats messages for invalid object schemas correctly', function () {
    const schema = z.object({ foo: z.string() });
    const result = safeParse(schema, new Map());

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'at foo: missing property; expected string'
    ]);
});

test('formats messages for missing object properties correctly', function () {
    const schema = z.object({ foo: z.string() });
    const result = safeParse(schema, {});

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'at foo: missing property; expected string'
    ]);
});
