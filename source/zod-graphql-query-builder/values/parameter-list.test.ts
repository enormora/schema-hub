import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { normalizeParameterList } from './parameter-list.js';
import { variablePlaceholder } from './variable-placeholder.js';

test('normalizes an empty object correctly', () => {
    const result = normalizeParameterList({});
    assert.deepStrictEqual(result, {
        serializedValue: '',
        referencedVariables: new Set()
    });
});

test('normalizes one parameter correctly', () => {
    const result = normalizeParameterList({ foo: 'bar' });
    assert.deepStrictEqual(result, {
        serializedValue: '(foo: "bar")',
        referencedVariables: new Set()
    });
});

test('normalizes multiple parameters correctly', () => {
    const result = normalizeParameterList({ foo: 'bar', bar: true });
    assert.deepStrictEqual(result, {
        serializedValue: '(foo: "bar", bar: true)',
        referencedVariables: new Set()
    });
});

test('normalizes multiple parameters with multiple variable placeholders correctly', () => {
    const result = normalizeParameterList({
        foo: variablePlaceholder('$foo'),
        bar: { baz: variablePlaceholder('$baz') }
    });
    assert.deepStrictEqual(result, {
        serializedValue: '(foo: $foo, bar: {baz: $baz})',
        referencedVariables: new Set(['$foo', '$baz'])
    });
});

test('throws when a parameter name is invalid', () => {
    try {
        normalizeParameterList({ 'foo-bar': 42 });
        assert.fail('Expected normalizeParameterList() to throw but it did not');
    } catch (error: unknown) {
        assert.strictEqual((error as Error).message, 'Parameter name "foo-bar" is not a valid GraphQL parameter name');
    }
});
