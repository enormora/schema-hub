import assert from 'node:assert';
import { test } from '@sondr3/minitest';
import { z } from 'zod/v4-mini';
import { safeParse } from '../../source/zod-error-formatter/formatter.ts';

type VersionProvider = () => string;

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

test('formats messages for nested literal object unions with the matching branch issues', function () {
    const nonEmptyStringSchema = z.string().check(z.minLength(1));
    const automaticVersioningSettingsSchema = z.readonly(
        z.strictObject({
            automatic: z.literal(true),
            minimumVersion: z.optional(nonEmptyStringSchema)
        })
    );
    const staticManualVersioningSettingsSchema = z.readonly(
        z.strictObject({
            automatic: z.literal(false),
            version: nonEmptyStringSchema
        })
    );
    const providerManualVersioningSettingsSchema = z.readonly(
        z.strictObject({
            automatic: z.literal(false),
            provideVersion: z.custom<VersionProvider>(function (value) {
                return typeof value === 'function';
            })
        })
    );
    const manualVersioningSettingsSchema = z.readonly(
        z.union([ staticManualVersioningSettingsSchema, providerManualVersioningSettingsSchema ])
    );
    const versioningSettingsSchema = z.readonly(
        z.union([ automaticVersioningSettingsSchema, manualVersioningSettingsSchema ])
    );

    const emptyManualResult = safeParse(versioningSettingsSchema, { automatic: false });
    const invalidStaticManualResult = safeParse(versioningSettingsSchema, { automatic: false, version: '' });
    const invalidProviderManualResult = safeParse(versioningSettingsSchema, {
        automatic: false,
        provideVersion: '1.0.0'
    });
    const invalidAutomaticResult = safeParse(versioningSettingsSchema, { automatic: true, minimumVersion: '' });
    const invalidDiscriminatorResult = safeParse(versioningSettingsSchema, { automatic: 'maybe' });

    assert.strictEqual(emptyManualResult.success, false);
    assert.deepStrictEqual(emptyManualResult.error.issues, [
        'no union alternative matched: alternative 1: at version: missing property; expected string | alternative 2: at provideVersion: Invalid input'
    ]);

    assert.strictEqual(invalidStaticManualResult.success, false);
    assert.deepStrictEqual(invalidStaticManualResult.error.issues, [
        'at version: string must contain at least 1 character'
    ]);

    assert.strictEqual(invalidProviderManualResult.success, false);
    assert.deepStrictEqual(invalidProviderManualResult.error.issues, [
        'at provideVersion: Invalid input'
    ]);

    assert.strictEqual(invalidAutomaticResult.success, false);
    assert.deepStrictEqual(invalidAutomaticResult.error.issues, [
        'at minimumVersion: string must contain at least 1 character'
    ]);

    assert.strictEqual(invalidDiscriminatorResult.success, false);
    assert.deepStrictEqual(invalidDiscriminatorResult.error.issues, [
        'at automatic: invalid value: expected one of true or false, but got string'
    ]);
});
