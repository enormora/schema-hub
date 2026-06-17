import assert from 'node:assert';
import { test } from '@sondr3/minitest';
import { serializeVariableDefinitions } from './variable-definition.ts';

test('throws when a variable identifier is invalid', function () {
    try {
        serializeVariableDefinitions({ foo: 'bar' });
        assert.fail('Expected serializeVariableDefinitions() to throw but it did not');
    } catch (error: unknown) {
        assert.strictEqual((error as Error).message, 'Variable name "foo" is not a valid GraphQL variable name');
    }
});

test('throws when a variable type is invalid', function () {
    try {
        serializeVariableDefinitions({ $foo: 'bar-baz' });
        assert.fail('Expected serializeVariableDefinitions() to throw but it did not');
    } catch (error: unknown) {
        assert.strictEqual((error as Error).message, 'Type "bar-baz" for variable "$foo" is invalid');
    }
});

test('serializes an empty definitions set to an empty string', function () {
    const result = serializeVariableDefinitions({});
    assert.strictEqual(result, '');
});

test('serializes one variable definition correctly', function () {
    const result = serializeVariableDefinitions({ $foo: 'bar' });
    assert.strictEqual(result, '($foo: bar)');
});

test('serializes multiple variable definitions correctly', function () {
    const result = serializeVariableDefinitions({ $foo: 'bar', $bar: '[String!]!' });
    assert.strictEqual(result, '($bar: [String!]!, $foo: bar)');
});
