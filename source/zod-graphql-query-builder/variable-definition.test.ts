import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { serializeVariableDefinitions } from './variable-definition.js';

test('throws when a variable identifier is invalid', () => {
    try {
        serializeVariableDefinitions({ foo: 'bar' });
        assert.fail('Expected serializeVariableDefinitions() to throw but it did not');
    } catch (error: unknown) {
        assert.strictEqual((error as Error).message, 'Variable name "foo" is not a valid GraphQL variable name');
    }
});

test('throws when a variable type is invalid', () => {
    try {
        serializeVariableDefinitions({ $foo: 'bar-baz' });
        assert.fail('Expected serializeVariableDefinitions() to throw but it did not');
    } catch (error: unknown) {
        assert.strictEqual((error as Error).message, 'Type "bar-baz" for variable "$foo" is invalid');
    }
});

test('serializes an empty definitions set to an empty string', () => {
    const result = serializeVariableDefinitions({});
    assert.strictEqual(result, '');
});

test('serializes one variable definition correctly', () => {
    const result = serializeVariableDefinitions({ $foo: 'bar' });
    assert.strictEqual(result, '($foo: bar)');
});

test('serializes multiple variable definitions correctly', () => {
    const result = serializeVariableDefinitions({ $foo: 'bar', $bar: '[String!]!' });
    assert.strictEqual(result, '($foo: bar, $bar: [String!]!)');
});
