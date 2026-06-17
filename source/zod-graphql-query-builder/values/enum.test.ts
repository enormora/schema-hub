import assert from 'node:assert';
import { test } from '@sondr3/minitest';
import { enumValue, isEnumValue } from './enum.ts';

test('isEnumValue() returns false for non-objects', function () {
    const result = isEnumValue('foo');
    assert.strictEqual(result, false);
});

test('isEnumValue() returns false for empty objects', function () {
    const result = isEnumValue({});
    assert.strictEqual(result, false);
});

test('isEnumValue() returns false for objects with an enumValue property', function () {
    const result = isEnumValue({ enumValue: 'foo' });
    assert.strictEqual(result, false);
});

test('isEnumValue() returns false for objects with an enumValue and a tag, but the tag is not a symbol', function () {
    const result = isEnumValue({ enumValue: 'foo', tag: 'bar' });
    assert.strictEqual(result, false);
});

test('isEnumValue() returns false for objects with an enumValue and a non-matching tag symbol', function () {
    const result = isEnumValue({ enumValue: 'foo', tag: Symbol('non-matching') });
    assert.strictEqual(result, false);
});

test('isEnumValue() returns true for objects with an enumValue and the correct tag', function () {
    const result = isEnumValue(enumValue('foo'));
    assert.strictEqual(result, true);
});

test('enumValue() throws when the given value is not a valid graphql name', function () {
    try {
        enumValue('foo-bar');
        assert.fail('Expected enumValue() to throw but it did not');
    } catch (error: unknown) {
        assert.strictEqual((error as Error).message, 'Enum value "foo-bar" is not a valid enum value');
    }
});

test('enumValue() returns the wrapped value', function () {
    const value = enumValue('fooBar');
    assert.strictEqual(value.enumValue, 'fooBar');
});
