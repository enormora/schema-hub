import assert from 'node:assert';
import { test } from '@sondr3/minitest';
import { z } from 'zod/v4';
import { GraphqlTypeInferenceError, inferGraphqlType } from './infer-graphql-type.ts';

function expectedInferenceErrorMessage(kind: string): string {
    return [
        `Cannot infer a GraphQL type for Zod schema of kind "${kind}".`,
        'Use variable(type, schema) to declare the GraphQL type explicitly.'
    ]
        .join(' ');
}

test('inferGraphqlType() returns String! for z.string()', function () {
    assert.strictEqual(inferGraphqlType(z.string()), 'String!');
});

test('inferGraphqlType() returns String for z.string().nullable()', function () {
    assert.strictEqual(inferGraphqlType(z.string().nullable()), 'String');
});

test('inferGraphqlType() returns String for z.string().optional()', function () {
    assert.strictEqual(inferGraphqlType(z.string().optional()), 'String');
});

test('inferGraphqlType() returns String for z.string().nullish()', function () {
    assert.strictEqual(inferGraphqlType(z.string().nullish()), 'String');
});

test('inferGraphqlType() returns Float! for z.number()', function () {
    assert.strictEqual(inferGraphqlType(z.number()), 'Float!');
});

test('inferGraphqlType() returns Int! for z.int()', function () {
    assert.strictEqual(inferGraphqlType(z.int()), 'Int!');
});

test('inferGraphqlType() returns Int! for z.number().int()', function () {
    assert.strictEqual(inferGraphqlType(z.number().int()), 'Int!');
});

test('inferGraphqlType() returns Int for z.int().nullable()', function () {
    assert.strictEqual(inferGraphqlType(z.int().nullable()), 'Int');
});

test('inferGraphqlType() returns Boolean! for z.boolean()', function () {
    assert.strictEqual(inferGraphqlType(z.boolean()), 'Boolean!');
});

test('inferGraphqlType() returns [String!]! for z.array(z.string())', function () {
    assert.strictEqual(inferGraphqlType(z.array(z.string())), '[String!]!');
});

test('inferGraphqlType() returns [String!] for z.array(z.string()).nullable()', function () {
    assert.strictEqual(inferGraphqlType(z.array(z.string()).nullable()), '[String!]');
});

test('inferGraphqlType() returns [String]! for z.array(z.string().nullable())', function () {
    assert.strictEqual(inferGraphqlType(z.array(z.string().nullable())), '[String]!');
});

test('inferGraphqlType() returns [String] for z.array(z.string().nullable()).nullable()', function () {
    assert.strictEqual(inferGraphqlType(z.array(z.string().nullable()).nullable()), '[String]');
});

test('inferGraphqlType() returns [[Int!]!]! for nested int arrays', function () {
    assert.strictEqual(inferGraphqlType(z.array(z.array(z.int()))), '[[Int!]!]!');
});

test('inferGraphqlType() throws for z.object', function () {
    try {
        inferGraphqlType(z.object({ a: z.string() }));
        assert.fail('Expected inferGraphqlType() to throw but it did not');
    } catch (error: unknown) {
        assert.strictEqual(error instanceof GraphqlTypeInferenceError, true);
        assert.strictEqual((error as GraphqlTypeInferenceError).message, expectedInferenceErrorMessage('object'));
    }
});

test('inferGraphqlType() throws for z.enum', function () {
    try {
        inferGraphqlType(z.enum([ 'a', 'b' ]));
        assert.fail('Expected inferGraphqlType() to throw but it did not');
    } catch (error: unknown) {
        assert.strictEqual(error instanceof GraphqlTypeInferenceError, true);
        assert.strictEqual((error as GraphqlTypeInferenceError).message, expectedInferenceErrorMessage('enum'));
    }
});

test('inferGraphqlType() throws for z.literal', function () {
    try {
        inferGraphqlType(z.literal('foo'));
        assert.fail('Expected inferGraphqlType() to throw but it did not');
    } catch (error: unknown) {
        assert.strictEqual(error instanceof GraphqlTypeInferenceError, true);
        assert.strictEqual((error as GraphqlTypeInferenceError).message, expectedInferenceErrorMessage('literal'));
    }
});

test('inferGraphqlType() throws for z.union', function () {
    try {
        inferGraphqlType(z.union([ z.string(), z.number() ]));
        assert.fail('Expected inferGraphqlType() to throw but it did not');
    } catch (error: unknown) {
        assert.strictEqual(error instanceof GraphqlTypeInferenceError, true);
        assert.strictEqual((error as GraphqlTypeInferenceError).message, expectedInferenceErrorMessage('union'));
    }
});

test('inferGraphqlType() throws for z.any', function () {
    try {
        inferGraphqlType(z.any());
        assert.fail('Expected inferGraphqlType() to throw but it did not');
    } catch (error: unknown) {
        assert.strictEqual(error instanceof GraphqlTypeInferenceError, true);
        assert.strictEqual((error as GraphqlTypeInferenceError).message, expectedInferenceErrorMessage('any'));
    }
});

test('inferGraphqlType() throws for array elements that are not inferable', function () {
    try {
        inferGraphqlType(z.array(z.object({ a: z.string() })));
        assert.fail('Expected inferGraphqlType() to throw but it did not');
    } catch (error: unknown) {
        assert.strictEqual(error instanceof GraphqlTypeInferenceError, true);
        assert.strictEqual((error as GraphqlTypeInferenceError).message, expectedInferenceErrorMessage('object'));
    }
});
