import assert from 'node:assert';
import { test } from '@sondr3/minitest';
import { normalizeParameterList } from './parameter-list.ts';
import { variablePlaceholder } from './variable-placeholder.ts';

test('normalizes an empty object correctly', function () {
    const result = normalizeParameterList({});
    assert.deepStrictEqual(result, {
        serializedValue: '',
        referencedVariables: new Set()
    });
});

test('normalizes one parameter correctly', function () {
    const result = normalizeParameterList({ foo: 'bar' });
    assert.deepStrictEqual(result, {
        serializedValue: '(foo: "bar")',
        referencedVariables: new Set()
    });
});

test('normalizes multiple parameters correctly', function () {
    const result = normalizeParameterList({ foo: 'bar', bar: true });
    assert.deepStrictEqual(result, {
        serializedValue: '(bar: true, foo: "bar")',
        referencedVariables: new Set()
    });
});

test('normalizes multiple parameters with multiple variable placeholders correctly', function () {
    const result = normalizeParameterList({
        foo: variablePlaceholder('$foo'),
        bar: { baz: variablePlaceholder('$baz') }
    });
    assert.deepStrictEqual(result, {
        serializedValue: '(bar: {baz: $baz}, foo: $foo)',
        referencedVariables: new Set([ '$foo', '$baz' ])
    });
});

test('throws when a parameter name is invalid', function () {
    try {
        normalizeParameterList({ 'foo-bar': 42 });
        assert.fail('Expected normalizeParameterList() to throw but it did not');
    } catch (error: unknown) {
        assert.strictEqual((error as Error).message, 'Parameter name "foo-bar" is not a valid GraphQL parameter name');
    }
});
