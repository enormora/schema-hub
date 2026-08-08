import assert from 'node:assert';
import { test } from '@sondr3/minitest';
import { type SinonSpy, fake } from 'sinon';
import { z } from 'zod/v4';
import { graphqlFieldOptions } from '../zod-graphql-query-builder/default-query-builder.ts';
import { variablePlaceholder } from '../zod-graphql-query-builder/values/variable-placeholder.ts';
import { type CreateClientDependencies, createClientFactory, type GraphqlClient } from './client.ts';
import { defineVariables } from './define-variables.ts';
import { defineQuery } from './operation-handle.ts';
import { variable } from './variable-entry.ts';

function createFakeKyMethod(): SinonSpy {
    return fake.resolves({ status: 200, json: fake.resolves(null) });
}

function clientFactory(post: SinonSpy): GraphqlClient {
    const createClient = createClientFactory({ ky: { post } } as unknown as CreateClientDependencies);
    return createClient({ endpoint: 'http://example/the-endpoint' });
}

const variablesForQuery = defineVariables({ bar: variable('Foo!', z.string()) });
const queryWithVariablesSchema = z
    .strictObject({ foo: graphqlFieldOptions(z.string(), { parameters: { bar: variablePlaceholder('$bar') } }) });
const queryWithVariables = defineQuery({
    variables: variablesForQuery,
    schema: queryWithVariablesSchema
});
const numericValueForTypeMismatch = 22;

test('query() with a handle sends the variable definitions and values', async function () {
    const post = createFakeKyMethod();
    const client = clientFactory(post);
    await client.query(queryWithVariables, { bar: 'foo' });

    assert.strictEqual(post.callCount, 1);
    assert.deepStrictEqual(post.firstCall.args, [ 'http://example/the-endpoint', {
        headers: {},
        json: { operationName: undefined, query: 'query ($bar: Foo!) { foo(bar: $bar) }', variables: { bar: 'foo' } },
        retry: 0,
        throwHttpErrors: false,
        timeout: 10_000
    } ]);
});

test('query() with a handle returns a validation failure when values don’t match the variable schema', async function () {
    const post = createFakeKyMethod();
    const client = clientFactory(post);
    const result = await client.query(queryWithVariables, { bar: numericValueForTypeMismatch as unknown as string });

    assert.strictEqual(post.callCount, 0);
    assert.deepStrictEqual(result, {
        success: false,
        errorDetails: {
            type: 'validation',
            message: 'GraphQL variable values don’t match the expected schema',
            issues: [ 'at bar: expected string, but got number' ]
        }
    });
});

const nestedFilterSchema = z.strictObject({
    q: z.string(),
    pagination: z.strictObject({ limit: z.int(), offset: z.int() })
});
const variablesForNestedInput = defineVariables({
    filter: variable('FilterInput!', nestedFilterSchema)
});
const queryWithNestedInputSchema = z.strictObject({
    foo: graphqlFieldOptions(z.string(), { parameters: { filter: variablePlaceholder('$filter') } })
});
const queryWithNestedInput = defineQuery({
    variables: variablesForNestedInput,
    schema: queryWithNestedInputSchema
});

test('query() sends a nested input object as a variable value', async function () {
    const post = createFakeKyMethod();
    const client = clientFactory(post);
    await client.query(queryWithNestedInput, {
        filter: { q: 'hello', pagination: { limit: 10, offset: 20 } }
    });

    assert.strictEqual(post.callCount, 1);
    assert.deepStrictEqual(post.firstCall.args, [ 'http://example/the-endpoint', {
        headers: {},
        json: {
            operationName: undefined,
            query: 'query ($filter: FilterInput!) { foo(filter: $filter) }',
            variables: { filter: { q: 'hello', pagination: { limit: 10, offset: 20 } } }
        },
        retry: 0,
        throwHttpErrors: false,
        timeout: 10_000
    } ]);
});

test('query() with a nested input variable reports validation issues with a nested path', async function () {
    const post = createFakeKyMethod();
    const client = clientFactory(post);
    const result = await client.query(queryWithNestedInput, {
        filter: {
            q: 'hello',
            pagination: { limit: 'ten' as unknown as number, offset: 20 }
        }
    });

    assert.strictEqual(post.callCount, 0);
    assert.deepStrictEqual(result, {
        success: false,
        errorDetails: {
            type: 'validation',
            message: 'GraphQL variable values don’t match the expected schema',
            issues: [ 'at filter.pagination.limit: expected number, but got string' ]
        }
    });
});

const variablesForListInput = defineVariables({
    filters: variable('[FilterInput!]!', z.array(nestedFilterSchema))
});
const queryWithListInputSchema = z.strictObject({
    foo: graphqlFieldOptions(z.string(), { parameters: { filters: variablePlaceholder('$filters') } })
});
const queryWithListInput = defineQuery({
    variables: variablesForListInput,
    schema: queryWithListInputSchema
});

test('query() sends a list of input objects as a variable value', async function () {
    const post = createFakeKyMethod();
    const client = clientFactory(post);
    await client.query(queryWithListInput, {
        filters: [
            { q: 'hello', pagination: { limit: 10, offset: 0 } },
            { q: 'world', pagination: { limit: 5, offset: 10 } }
        ]
    });

    assert.strictEqual(post.callCount, 1);
    assert.deepStrictEqual(post.firstCall.args, [ 'http://example/the-endpoint', {
        headers: {},
        json: {
            operationName: undefined,
            query: 'query ($filters: [FilterInput!]!) { foo(filters: $filters) }',
            variables: {
                filters: [
                    { q: 'hello', pagination: { limit: 10, offset: 0 } },
                    { q: 'world', pagination: { limit: 5, offset: 10 } }
                ]
            }
        },
        retry: 0,
        throwHttpErrors: false,
        timeout: 10_000
    } ]);
});
