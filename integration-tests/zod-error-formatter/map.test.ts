import assert from 'node:assert';
import { test } from '@sondr3/minitest';
import { z } from 'zod/v4-mini';
import { safeParse } from '../../source/zod-error-formatter/formatter.ts';

test('formats messages for invalid keys in map schemas correctly', function () {
    const schema = z.map(z.literal('a'), z.string());
    const result = safeParse(schema, new Map([ [ 'b', 'foo' ] ]));

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'at b: invalid value: expected "a", but got string'
    ]);
});

test('formats messages for invalid values in map schemas correctly', function () {
    const schema = z.map(z.literal('a'), z.string());
    const result = safeParse(schema, new Map([ [ 'a', 0 ] ]));

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'at a: expected string, but got number'
    ]);
});

test('formats messages for invalid objects within map values correctly', function () {
    const schema = z.object({ foo: z.map(z.literal('a'), z.object({ bar: z.number() })) });
    const result = safeParse(schema, { foo: new Map([ [ 'a', { bar: true } ] ]) });

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'at foo.a.bar: expected number, but got boolean'
    ]);
});

test('formats messages for missing object properties within map values correctly', function () {
    const schema = z.object({ foo: z.map(z.literal('a'), z.object({ bar: z.number() })) });
    const result = safeParse(schema, { foo: new Map([ [ 'a', {} ] ]) });

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'at foo.a.bar: missing property; expected number'
    ]);
});
