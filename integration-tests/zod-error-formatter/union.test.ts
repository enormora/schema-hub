import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { z } from 'zod';
import { safeParse } from '../../source/zod-error-formatter/formatter.js';

test('formats messages for invalid union schemas with primitives correctly', () => {
    const schema = z.union([z.string(), z.number()]);
    const result = safeParse(schema, true);

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'invalid value: expected one of string or number, but got boolean'
    ]);
});

test('formats messages for invalid union schemas with literals correctly', () => {
    const schema = z.union([z.literal('a'), z.literal(1)]);
    const result = safeParse(schema, true);

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'invalid value: expected one of "a" or 1, but got boolean'
    ]);
});

test('formats messages for invalid union schemas with literals and primitives correctly', () => {
    const schema = z.union([z.literal('a'), z.number()]);
    const result = safeParse(schema, true);

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'invalid value: expected one of "a" or number, but got boolean'
    ]);
});

test('formats messages for invalid union schemas with objects correctly', () => {
    const schema = z.union([z.object({ a: z.string() }), z.number()]);
    const result = safeParse(schema, true);

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'invalid value: expected one of object or number, but got boolean'
    ]);
});

test('formats messages for invalid union schemas with only objects correctly', () => {
    const schema = z.union([z.object({ a: z.string() }), z.object({ b: z.number() })]);
    const result = safeParse(schema, {});

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'invalid value doesn’t match expected union'
    ]);
});
