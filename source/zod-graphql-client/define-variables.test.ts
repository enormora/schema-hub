import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { z } from 'zod/v4';
import { isVariablePlaceholder } from '../zod-graphql-query-builder/values/variable-placeholder.js';
import { defineVariables, getVariableMapMetadata } from './define-variables.js';
import { variable } from './variable-entry.js';

test('defineVariables() exposes placeholders keyed by variable name', () => {
    const vars = defineVariables({ bar: z.string(), count: z.int() });

    assert.strictEqual(isVariablePlaceholder(vars.bar), true);
    assert.strictEqual(vars.bar.variableName, '$bar');
    assert.strictEqual(vars.count.variableName, '$count');
});

test('defineVariables() builds definitions with $-prefixed keys and inferred GraphQL types', () => {
    const vars = defineVariables({ bar: z.string(), count: z.int().nullable() });
    const { definitions } = getVariableMapMetadata(vars);

    assert.deepStrictEqual(definitions, { $bar: 'String!', $count: 'Int' });
});

test('defineVariables() uses the literal type from an explicit variable() entry', () => {
    const vars = defineVariables({
        filter: variable('FilterInput!', z.object({ q: z.string() }))
    });
    const { definitions } = getVariableMapMetadata(vars);

    assert.deepStrictEqual(definitions, { $filter: 'FilterInput!' });
});

test('defineVariables() freezes the definitions record', () => {
    const vars = defineVariables({ bar: z.string() });
    const { definitions } = getVariableMapMetadata(vars);

    assert.strictEqual(Object.isFrozen(definitions), true);
});

test('defineVariables() parse() returns the parsed values when they match', () => {
    const vars = defineVariables({ bar: z.string(), count: z.int() });
    const { parse } = getVariableMapMetadata(vars);

    const result = parse({ bar: 'hello', count: 3 });
    assert.deepStrictEqual(result, { success: true, data: { bar: 'hello', count: 3 } });
});

test('defineVariables() parse() surfaces zod-error-formatter issues when values don’t match', () => {
    const vars = defineVariables({ bar: z.string() });
    const { parse } = getVariableMapMetadata(vars);

    const result = parse({ bar: 22 });
    if (result.success) {
        assert.fail('Expected parse() to fail but it did not');
    }
    assert.deepStrictEqual(result.error.issues, ['at bar: expected string, but got number']);
});

test('defineVariables() parse() validates against the schema in an explicit entry', () => {
    const vars = defineVariables({
        filter: variable('FilterInput!', z.object({ q: z.string() }))
    });
    const { parse } = getVariableMapMetadata(vars);

    const success = parse({ filter: { q: 'hello' } });
    assert.deepStrictEqual(success, { success: true, data: { filter: { q: 'hello' } } });

    const failure = parse({ filter: { q: 22 } });
    if (failure.success) {
        assert.fail('Expected parse() to fail but it did not');
    }
    assert.deepStrictEqual(failure.error.issues, ['at filter.q: expected string, but got number']);
});

test('defineVariables() throws when a variable name is not a valid GraphQL identifier', () => {
    try {
        defineVariables({ 'invalid-name': z.string() });
        assert.fail('Expected defineVariables() to throw but it did not');
    } catch (error: unknown) {
        assert.strictEqual(
            (error as Error).message,
            'Variable "$invalid-name" is not a valid variable name'
        );
    }
});

test('defineVariables() throws when an inferred entry’s Zod schema is not inferable', () => {
    try {
        defineVariables({ filter: z.object({ q: z.string() }) });
        assert.fail('Expected defineVariables() to throw but it did not');
    } catch (error: unknown) {
        const expected = [
            'Cannot infer a GraphQL type for Zod schema of kind "object".',
            'Use variable(type, schema) to declare the GraphQL type explicitly.'
        ]
            .join(' ');
        assert.strictEqual((error as Error).message, expected);
    }
});
