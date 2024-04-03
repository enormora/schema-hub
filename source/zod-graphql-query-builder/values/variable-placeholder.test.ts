import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { isVariablePlaceholder, variablePlaceholder } from './variable-placeholder.js';

test('isVariablePlaceholder() returns false for non-objects', () => {
    const result = isVariablePlaceholder('foo');
    assert.strictEqual(result, false);
});

test('isVariablePlaceholder() returns false for empty objects', () => {
    const result = isVariablePlaceholder({});
    assert.strictEqual(result, false);
});

test('isVariablePlaceholder() returns false when there is only a variableName property', () => {
    const result = isVariablePlaceholder({ variableName: 'foo' });
    assert.strictEqual(result, false);
});

test('isVariablePlaceholder() returns false objects with a variableName and a tag, but the tag is not a symbol', () => {
    const result = isVariablePlaceholder({ variableName: 'foo', tag: 'bar' });
    assert.strictEqual(result, false);
});

test('isVariablePlaceholder() returns false when there is a variableName and a non-matching tag symbol', () => {
    const result = isVariablePlaceholder({ variableName: 'foo', tag: Symbol('non-matching') });
    assert.strictEqual(result, false);
});

test('isVariablePlaceholder() returns true for objects with a variableName and the correct tag', () => {
    const result = isVariablePlaceholder(variablePlaceholder('$foo'));
    assert.strictEqual(result, true);
});

test('variablePlaceholder() throws when the given value is not a valid graphql name', () => {
    try {
        variablePlaceholder('foo');
        assert.fail('Expected variablePlaceholder() to throw but it did not');
    } catch (error: unknown) {
        assert.strictEqual((error as Error).message, 'Variable "foo" is not a valid variable name');
    }
});

test('variablePlaceholder() returns the wrapped value', () => {
    const value = variablePlaceholder('$fooBar');
    assert.strictEqual(value.variableName, '$fooBar');
});
