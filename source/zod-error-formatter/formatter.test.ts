import { test } from '@sondr3/minitest';
import { stripIndents } from 'common-tags';
import assert from 'node:assert';
import { z } from 'zod';
import type { FormattedZodError } from './formatted-error.js';
import { formatZodError, parse, safeParse } from './formatter.js';

const exampleSchema = z.object({ foo: z.string() }).strict();

test('formatZodError() takes a zod error and formats all issues', () => {
    const result = exampleSchema.safeParse({ foo: 42, bar: '' });

    assert.strictEqual(result.success, false);
    const formattedError = formatZodError(result.error);

    assert.strictEqual(
        formattedError.message,
        stripIndents`Validation failed with 2 issues:
            - at foo: expected string, but got number
            - Unrecognized key(s) in object: 'bar'`
    );
    assert.deepStrictEqual(formattedError.issues, [
        'at foo: expected string, but got number',
        "Unrecognized key(s) in object: 'bar'"
    ]);
});

test('parse() parses a given value with a given schema and throws the formatted error when the data is invalid', () => {
    try {
        parse(exampleSchema, { foo: 42, bar: '' });
        assert.fail('Expected parse() to fail but it did not');
    } catch (error: unknown) {
        assert.strictEqual(
            (error as Error).message,
            stripIndents`Validation failed with 2 issues:
            - at foo: expected string, but got number
            - Unrecognized key(s) in object: 'bar'`
        );
        assert.deepStrictEqual((error as FormattedZodError).issues, [
            'at foo: expected string, but got number',
            "Unrecognized key(s) in object: 'bar'"
        ]);
    }
});

test('parse() parses a given value with a given schema returns the data when it is valid', () => {
    const result = parse(exampleSchema, { foo: 'bar' });
    assert.deepStrictEqual(result, { foo: 'bar' });
});

test('safeParse() parses a given value with a given schema and returns a failure result when data is invalid', () => {
    const result = safeParse(exampleSchema, { foo: 42, bar: '' });

    assert.strictEqual(result.success, false, 'expected safeParse() to return a failure result but it did not');
    assert.strictEqual(
        result.error.message,
        stripIndents`Validation failed with 2 issues:
            - at foo: expected string, but got number
            - Unrecognized key(s) in object: 'bar'`
    );
    assert.deepStrictEqual(result.error.issues, [
        'at foo: expected string, but got number',
        "Unrecognized key(s) in object: 'bar'"
    ]);
});

test('safeParse() parses a given value with a given schema returns the success result when it is valid', () => {
    const result = safeParse(exampleSchema, { foo: 'bar' });
    assert.deepStrictEqual(result, { success: true, data: { foo: 'bar' } });
});
