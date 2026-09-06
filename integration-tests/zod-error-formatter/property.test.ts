import assert from 'node:assert';
import { test } from '@sondr3/minitest';
import { z } from 'zod/v4-mini';
import { safeParse } from '../../source/zod-error-formatter/formatter.ts';

test('formats messages for invalid property checks on inherited properties correctly', function () {
    const schema = z.instanceof(URL).check(z.property('protocol', z.string().check(z.startsWith('https:'))));
    const result = safeParse(schema, new URL('ftp://example.com'));

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'at protocol: string must start with "https:"'
    ]);
});

test('formats messages for invalid properties checks correctly', function () {
    const minimumLength = 4;
    const schema = z.instanceof(URL).check(...z.properties({ hostname: z.string().check(z.minLength(minimumLength)) }));
    const result = safeParse(schema, new URL('https://a'));

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'at hostname: string must contain at least 4 characters'
    ]);
});

test('formats missing plain-object property checks correctly', function () {
    const schema = z
        .custom<{ readonly foo: string; }>(function () {
            return true;
        })
        .check(z.property('foo', z.string()));
    const result = safeParse(schema, {});

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'at foo: missing property; expected string'
    ]);
});

test('formats messages for map properties when no map entry matches', function () {
    const schema = z.instanceof(Map).check(z.property('size', z.number().check(z.gt(0))));
    const result = safeParse(schema, new Map());

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'at size: number must be greater than 0'
    ]);
});
