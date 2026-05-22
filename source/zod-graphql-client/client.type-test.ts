import { describe, expect, test } from 'tstyche';
import { z } from 'zod';
import { graphqlFieldOptions, variablePlaceholder } from '../zod-graphql-query-builder/entry-point.js';
import type { GraphqlClient } from './client.js';
import { defineVariables } from './define-variables.js';
import { defineMutation, defineQuery } from './operation-handle.js';
import type { OperationResult } from './operation-result.js';
import { variable } from './variable-entry.js';

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

describe('client.query / client.mutate require a handle', () => {
    test('accepts a handle without variables', () => {
        expect(client.query).type.toBeCallableWith(queryHandle);
        expect(client.mutate).type.toBeCallableWith(mutationHandle);
    });

    test('accepts a handle without variables and request options', () => {
        expect(client.query).type.toBeCallableWith(queryHandle, { timeout: 5000 });
        expect(client.mutate).type.toBeCallableWith(mutationHandle, { headers: { foo: 'bar' } });
    });

    test('rejects a raw schema (handle is now mandatory)', () => {
        expect(client.query).type.not.toBeCallableWith(schema);
        expect(client.mutate).type.not.toBeCallableWith(schema);
    });

    test('rejects calling without any arguments', () => {
        expect(client.query).type.not.toBeCallableWith();
        expect(client.mutate).type.not.toBeCallableWith();
    });
});

describe('client.query with a handle that declared variables', () => {
    test('requires the matching variable values as the second argument', () => {
        expect(client.query).type.toBeCallableWith(queryHandleWithVars, { id: 'abc' });
    });

    test('accepts request options after the variable values', () => {
        expect(client.query).type.toBeCallableWith(queryHandleWithVars, { id: 'abc' }, { timeout: 1 });
    });

    test('rejects calling without variable values', () => {
        expect(client.query).type.not.toBeCallableWith(queryHandleWithVars);
    });

    test('rejects variable values with a wrong shape', () => {
        expect(client.query).type.not.toBeCallableWith(queryHandleWithVars, { id: 42 });
        expect(client.query).type.not.toBeCallableWith(queryHandleWithVars, { wrong: 'abc' });
    });
});

describe('client return types preserve per-schema inference', () => {
    test('query returns Promise<OperationResult<Schema>>', () => {
        expect(client.query(queryHandle)).type.toBe<Promise<OperationResult<Schema>>>();
    });

    test('mutate returns Promise<OperationResult<Schema>>', () => {
        expect(client.mutate(mutationHandle)).type.toBe<Promise<OperationResult<Schema>>>();
    });

    test('queryOrThrow / mutateOrThrow return Promise<TypeOf<Schema>> (not any)', () => {
        type ExpectedData = { foo: string; };
        expect(client.queryOrThrow(queryHandle)).type.toBe<Promise<ExpectedData>>();
        expect(client.mutateOrThrow(mutationHandle)).type.toBe<Promise<ExpectedData>>();
    });
});
