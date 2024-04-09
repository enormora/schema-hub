import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { enumValue } from './enum.js';
import { normalizeGraphqlValue } from './value.js';
import { variablePlaceholder } from './variable-placeholder.js';

test('normalizes a string value correctly', () => {
    const result = normalizeGraphqlValue('foo');
    assert.deepStrictEqual(result, {
        serializedValue: '"foo"',
        referencedVariables: new Set()
    });
});

test('normalizes a number value correctly', () => {
    const result = normalizeGraphqlValue(1);
    assert.deepStrictEqual(result, {
        serializedValue: '1',
        referencedVariables: new Set()
    });
});

test('normalizes a boolean value correctly', () => {
    const result = normalizeGraphqlValue(false);
    assert.deepStrictEqual(result, {
        serializedValue: 'false',
        referencedVariables: new Set()
    });
});

test('normalizes null correctly', () => {
    const result = normalizeGraphqlValue(null);
    assert.deepStrictEqual(result, {
        serializedValue: 'null',
        referencedVariables: new Set()
    });
});

test('normalizes an empty array correctly', () => {
    const result = normalizeGraphqlValue([]);
    assert.deepStrictEqual(result, {
        serializedValue: '[]',
        referencedVariables: new Set()
    });
});

test('normalizes an empty object correctly', () => {
    const result = normalizeGraphqlValue({});
    assert.deepStrictEqual(result, {
        serializedValue: '{}',
        referencedVariables: new Set()
    });
});

test('normalizes an enum value correctly', () => {
    const result = normalizeGraphqlValue(enumValue('foo'));
    assert.deepStrictEqual(result, {
        serializedValue: 'foo',
        referencedVariables: new Set()
    });
});

test('normalizes a variable placeholder correctly', () => {
    const result = normalizeGraphqlValue(variablePlaceholder('$foo'));
    assert.deepStrictEqual(result, {
        serializedValue: '$foo',
        referencedVariables: new Set(['$foo'])
    });
});

test('normalizes an array of primitives correctly', () => {
    const result = normalizeGraphqlValue(['foo', 1, null, true]);
    assert.deepStrictEqual(result, {
        serializedValue: '["foo", 1, null, true]',
        referencedVariables: new Set()
    });
});

test('normalizes an array of enum values correctly', () => {
    const result = normalizeGraphqlValue([enumValue('foo')]);
    assert.deepStrictEqual(result, {
        serializedValue: '[foo]',
        referencedVariables: new Set()
    });
});

test('normalizes an array of arrays correctly', () => {
    const result = normalizeGraphqlValue([[[], 'bar']]);
    assert.deepStrictEqual(result, {
        serializedValue: '[[[], "bar"]]',
        referencedVariables: new Set()
    });
});

test('normalizes an array of variable placeholders correctly', () => {
    const result = normalizeGraphqlValue([variablePlaceholder('$foo'), variablePlaceholder('$bar')]);
    assert.deepStrictEqual(result, {
        serializedValue: '[$foo, $bar]',
        referencedVariables: new Set(['$foo', '$bar'])
    });
});

test('normalizes an object of primitives correctly', () => {
    const result = normalizeGraphqlValue({ foo: 'bar', bar: 1, qux: null });
    assert.deepStrictEqual(result, {
        serializedValue: '{foo: "bar", bar: 1, qux: null}',
        referencedVariables: new Set()
    });
});

test('throws when an object contains an invalid property name', () => {
    try {
        normalizeGraphqlValue({ 'foo-bar': true });
        assert.fail('Expected normalizeGraphqlValue() to throw but it did not');
    } catch (error: unknown) {
        assert.strictEqual((error as Error).message, 'Field name "foo-bar" is not a valid GraphQL field name');
    }
});

test('normalizes an object of variable placeholders correctly', () => {
    const result = normalizeGraphqlValue({ foo: variablePlaceholder('$bar') });
    assert.deepStrictEqual(result, {
        serializedValue: '{foo: $bar}',
        referencedVariables: new Set(['$bar'])
    });
});

test('normalizes a nested object with multiple variable placeholders correctly', () => {
    const result = normalizeGraphqlValue({
        foo: variablePlaceholder('$bar'),
        bar: [[variablePlaceholder('$baz')], null]
    });
    assert.deepStrictEqual(result, {
        serializedValue: '{foo: $bar, bar: [[$baz], null]}',
        referencedVariables: new Set(['$bar', '$baz'])
    });
});
