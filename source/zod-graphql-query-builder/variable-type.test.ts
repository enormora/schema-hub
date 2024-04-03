import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { isValidGraphqlType } from './variable-type.js';

test('returns true when the given type is a valid primitive type', () => {
    const result = isValidGraphqlType('String');
    assert.strictEqual(result, true);
});

test('returns true when the given type is a valid non-nullable primitive type', () => {
    const result = isValidGraphqlType('String!');
    assert.strictEqual(result, true);
});

test('returns true when the given type is a valid non-nullable list of primitive type', () => {
    const result = isValidGraphqlType('[String]!');
    assert.strictEqual(result, true);
});

test('returns true when the given type is a valid custom type', () => {
    const result = isValidGraphqlType('MyCustomType');
    assert.strictEqual(result, true);
});

test('returns true when the given type is a valid list of custom type', () => {
    const result = isValidGraphqlType('[MyCustomType]');
    assert.strictEqual(result, true);
});

test('returns false when the given value contains incorrect syntax', () => {
    const result = isValidGraphqlType('[MyCustomType');
    assert.strictEqual(result, false);
});
