import assert from 'node:assert';
import { test } from '@sondr3/minitest';
import { z } from 'zod/v4-mini';
import { safeParse } from '../../source/zod-error-formatter/formatter.ts';

test('formats messages for invalid union schemas with primitives correctly', function () {
    const schema = z.union([ z.string(), z.number() ]);
    const result = safeParse(schema, true);

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'invalid value: expected one of string or number, but got boolean'
    ]);
});

test('formats messages for invalid union schemas with literals correctly', function () {
    const schema = z.union([ z.literal('a'), z.literal(1) ]);
    const result = safeParse(schema, true);

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'invalid value: expected one of "a" or 1, but got boolean'
    ]);
});

test('formats messages for invalid union schemas with literals and primitives correctly', function () {
    const schema = z.union([ z.literal('a'), z.number() ]);
    const result = safeParse(schema, true);

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'invalid value: expected one of "a" or number, but got boolean'
    ]);
});

test('formats messages for invalid union schemas with objects correctly', function () {
    const schema = z.union([ z.object({ a: z.string() }), z.number() ]);
    const result = safeParse(schema, true);

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'invalid value: expected one of object or number, but got boolean'
    ]);
});

test('formats messages for invalid union schemas with only objects correctly', function () {
    const schema = z.union([ z.object({ a: z.string() }), z.object({ b: z.number() }) ]);
    const result = safeParse(schema, {});

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'no union alternative matched: alternative 1: at a: missing property; expected string | alternative 2: at b: missing property; expected number'
    ]);
});

test('formats messages missing properties of union schemas within object correctly', function () {
    const schema = z.object({ foo: z.union([ z.literal('a'), z.literal('b') ]) });
    const result = safeParse(schema, {});

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'at foo: missing property'
    ]);
});
