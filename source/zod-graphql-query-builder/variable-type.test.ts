import assert from 'node:assert';
import { test } from '@sondr3/minitest';
import { isValidGraphqlType } from './variable-type.ts';

test('returns true when the given type is a valid primitive type', function () {
    const result = isValidGraphqlType('String');
    assert.strictEqual(result, true);
});

test('returns true when the given type is a valid non-nullable primitive type', function () {
    const result = isValidGraphqlType('String!');
    assert.strictEqual(result, true);
});

test('returns true when the given type is a valid non-nullable list of primitive type', function () {
    const result = isValidGraphqlType('[String]!');
    assert.strictEqual(result, true);
});

test('returns true when the given type is a valid custom type', function () {
    const result = isValidGraphqlType('MyCustomType');
    assert.strictEqual(result, true);
});

test('returns true when the given type is a valid list of custom type', function () {
    const result = isValidGraphqlType('[MyCustomType]');
    assert.strictEqual(result, true);
});

test('returns false when the given value contains incorrect syntax', function () {
    const result = isValidGraphqlType('[MyCustomType');
    assert.strictEqual(result, false);
});
