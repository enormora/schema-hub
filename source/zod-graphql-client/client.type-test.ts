import { describe, expect, test } from 'tstyche';
import { z } from 'zod';
import { graphqlFieldOptions, variablePlaceholder } from '../zod-graphql-query-builder/entry-point.ts';
import type { GraphqlClient } from './client.ts';
import { defineVariables } from './define-variables.ts';
import { defineMutation, defineQuery } from './operation-handle.ts';
import type { OperationResult } from './operation-result.ts';
import { variable } from './variable-entry.ts';

declare const client: GraphqlClient;

const schema = z.strictObject({ foo: z.string() });
type Schema = typeof schema;
const queryHandle = defineQuery({ schema });
const mutationHandle = defineMutation({ schema });

const vars = defineVariables({ id: variable('ID!', z.string()) });
const schemaWithVars = z.strictObject({
    foo: graphqlFieldOptions(z.string(), { parameters: { id: variablePlaceholder('$id') } })
});
const queryHandleWithVars = defineQuery({ schema: schemaWithVars, variables: vars });

describe('client.query / client.mutate require a handle', function () {
    test('accepts a handle without variables', function () {
        expect(client.query).type.toBeCallableWith(queryHandle);
        expect(client.mutate).type.toBeCallableWith(mutationHandle);
    });

    test('accepts a handle without variables and request options', function () {
        expect(client.query).type.toBeCallableWith(queryHandle, { timeout: 5000 });
        expect(client.mutate).type.toBeCallableWith(mutationHandle, { headers: { foo: 'bar' } });
    });

    test('rejects a raw schema (handle is now mandatory)', function () {
        expect(client.query).type.not.toBeCallableWith(schema);
        expect(client.mutate).type.not.toBeCallableWith(schema);
    });

    test('rejects calling without any arguments', function () {
        expect(client.query).type.not.toBeCallableWith();
        expect(client.mutate).type.not.toBeCallableWith();
    });
});

describe('client.query with a handle that declared variables', function () {
    test('requires the matching variable values as the second argument', function () {
        expect(client.query).type.toBeCallableWith(queryHandleWithVars, { id: 'abc' });
    });

    test('accepts request options after the variable values', function () {
        expect(client.query).type.toBeCallableWith(queryHandleWithVars, { id: 'abc' }, { timeout: 1 });
    });

    test('rejects calling without variable values', function () {
        expect(client.query).type.not.toBeCallableWith(queryHandleWithVars);
    });

    test('rejects variable values with a wrong shape', function () {
        expect(client.query).type.not.toBeCallableWith(queryHandleWithVars, { id: 42 });
        expect(client.query).type.not.toBeCallableWith(queryHandleWithVars, { wrong: 'abc' });
    });
});

describe('client return types preserve per-schema inference', function () {
    test('query returns Promise<OperationResult<Schema>>', function () {
        expect(client.query(queryHandle)).type.toBe<Promise<OperationResult<Schema>>>();
    });

    test('mutate returns Promise<OperationResult<Schema>>', function () {
        expect(client.mutate(mutationHandle)).type.toBe<Promise<OperationResult<Schema>>>();
    });

    test('queryOrThrow / mutateOrThrow return Promise<TypeOf<Schema>> (not any)', function () {
        type ExpectedData = { foo: string; };
        expect(client.queryOrThrow(queryHandle)).type.toBe<Promise<ExpectedData>>();
        expect(client.mutateOrThrow(mutationHandle)).type.toBe<Promise<ExpectedData>>();
    });
});
