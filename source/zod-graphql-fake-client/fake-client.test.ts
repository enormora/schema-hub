import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { z } from 'zod/v4';
import {
    defineMutation,
    defineQuery,
    defineVariables,
    graphqlFieldOptions,
    type OperationHandle
} from '../zod-graphql-client/entry-point.js';
import type { GraphqlOperationError } from '../zod-graphql-client/operation-error.js';
import { createFakeGraphqlClient } from './fake-client.js';

const simpleSchema = z.object({ foo: z.string() }).strict();

type SimpleHandle = OperationHandle<typeof simpleSchema, undefined>;

function namedQuery(operationName: string): SimpleHandle {
    return defineQuery({ schema: simpleSchema, operationName });
}

function namedMutation(operationName: string): SimpleHandle {
    return defineMutation({ schema: simpleSchema, operationName });
}

test('throws when inspecting a query that doesn’t exist', () => {
    const client = createFakeGraphqlClient();

    try {
        client.inspectFirstOperationPayload();
        assert.fail('Expected inspectFirstQueryPayload() to throw but it did not');
    } catch (error: unknown) {
        assert.strictEqual((error as Error).message, 'No query payload at index 0 recorded');
    }
});

test('throws when inspecting an operation that doesn’t exist', () => {
    const client = createFakeGraphqlClient();

    try {
        client.inspectFirstOperation();
        assert.fail('Expected inspectFirstOperation() to throw but it did not');
    } catch (error: unknown) {
        assert.strictEqual((error as Error).message, 'No operation at index 0 recorded');
    }
});

test('query() returns the default result when no result is configured', async () => {
    const client = createFakeGraphqlClient();

    const result = await client.query(simpleSchema);
    assert.deepStrictEqual(result, { success: true, data: {} });
});

test('mutate() returns the default result when no result is configured', async () => {
    const client = createFakeGraphqlClient();

    const result = await client.mutate(simpleSchema);
    assert.deepStrictEqual(result, { success: true, data: {} });
});

test('query() returns the default result when some results are configured but not for that call', async () => {
    const client = createFakeGraphqlClient({ results: [{ data: 'foo' }] });

    await client.query(simpleSchema);
    const result = await client.query(simpleSchema);
    assert.deepStrictEqual(result, { success: true, data: {} });
});

test('query() returns the configured success result', async () => {
    const client = createFakeGraphqlClient({ results: [{ data: 'foo' }] });

    const result = await client.query(simpleSchema);
    assert.deepStrictEqual(result, { success: true, data: 'foo' });
});

test('query() returns the configured error result', async () => {
    const client = createFakeGraphqlClient({ results: [{ error: { type: 'unknown', message: 'foo' } }] });

    const result = await client.query(simpleSchema);
    assert.deepStrictEqual(result, { success: false, errorDetails: { type: 'unknown', message: 'foo' } });
});

test('queryOrThrow() returns the configured success data', async () => {
    const client = createFakeGraphqlClient({ results: [{ data: 'foo' }] });

    const result = await client.queryOrThrow(simpleSchema);
    assert.strictEqual(result, 'foo');
});

test('mutateOrThrow() returns the configured success data', async () => {
    const client = createFakeGraphqlClient({ results: [{ data: 'foo' }] });

    const result = await client.mutateOrThrow(simpleSchema);
    assert.strictEqual(result, 'foo');
});

test('queryOrThrow() throws the configured error', async () => {
    const client = createFakeGraphqlClient({ results: [{ error: { type: 'unknown', message: 'foo' } }] });

    try {
        await client.queryOrThrow(simpleSchema);
        assert.fail('Expected queryOrThrow() to throw but it did not');
    } catch (error: unknown) {
        assert.strictEqual((error as GraphqlOperationError).message, 'foo');
        assert.deepStrictEqual((error as GraphqlOperationError).details, { type: 'unknown' });
    }
});

test('mutateOrThrow() throws the configured error', async () => {
    const client = createFakeGraphqlClient({ results: [{ error: { type: 'unknown', message: 'foo' } }] });

    try {
        await client.mutateOrThrow(simpleSchema);
        assert.fail('Expected mutateOrThrow() to throw but it did not');
    } catch (error: unknown) {
        assert.strictEqual((error as GraphqlOperationError).message, 'foo');
        assert.deepStrictEqual((error as GraphqlOperationError).details, { type: 'unknown' });
    }
});

test('inspectFirstOperationPayload() returns the query payload of the first query', async () => {
    const client = createFakeGraphqlClient();

    await client.queryOrThrow(namedQuery('foo'));
    const payload = client.inspectFirstOperationPayload();

    assert.deepStrictEqual(payload, { operationName: 'foo', query: 'query foo { foo }', variables: {} });
});

test('inspectFirstOperationPayload() returns the mutation payload of the first mutation', async () => {
    const client = createFakeGraphqlClient();

    await client.mutateOrThrow(namedMutation('foo'));
    const payload = client.inspectFirstOperationPayload();

    assert.deepStrictEqual(payload, { operationName: 'foo', query: 'mutation foo { foo }', variables: {} });
});

test('inspectFirstOperation() returns the recorded operation for the first query', async () => {
    const client = createFakeGraphqlClient();
    const handle = defineQuery({ schema: simpleSchema, operationName: 'foo' });

    await client.queryOrThrow(handle, { headers: { foo: 'bar' }, timeout: 42 });
    const recorded = client.inspectFirstOperation();

    assert.strictEqual(recorded.type, 'query');
    assert.strictEqual(recorded.schema, simpleSchema);
    assert.strictEqual(recorded.operationName, 'foo');
    assert.deepStrictEqual(recorded.values, {});
    assert.deepStrictEqual(recorded.options, { headers: { foo: 'bar' }, timeout: 42 });
    assert.deepStrictEqual(recorded.payload, { operationName: 'foo', query: 'query foo { foo }', variables: {} });
});

test('inspectFirstOperation() returns the recorded operation for the first mutation', async () => {
    const client = createFakeGraphqlClient();
    const handle = defineMutation({ schema: simpleSchema, operationName: 'foo' });

    await client.mutateOrThrow(handle, { headers: { foo: 'bar' }, timeout: 42 });
    const recorded = client.inspectFirstOperation();

    assert.strictEqual(recorded.type, 'mutation');
    assert.strictEqual(recorded.operationName, 'foo');
    assert.deepStrictEqual(recorded.options, { headers: { foo: 'bar' }, timeout: 42 });
});

test('inspectFirstOperation() captures the parsed variable values from the handle', async () => {
    const client = createFakeGraphqlClient();
    const vars = defineVariables({ bar: z.string() });
    const schemaWithVar = z
        .object({
            foo: graphqlFieldOptions(z.string(), { parameters: { bar: vars.bar } })
        })
        .strict();
    const handle = defineQuery({ schema: schemaWithVar, variables: vars });

    await client.queryOrThrow(handle, { bar: 'hello' });
    const recorded = client.inspectFirstOperation();

    assert.deepStrictEqual(recorded.values, { bar: 'hello' });
});

test('findOperation() returns undefined when no operation was recorded', () => {
    const client = createFakeGraphqlClient();

    const found = client.findOperation({ operationName: 'foo' });

    assert.strictEqual(found, undefined);
});

test('findOperation() returns the first operation matching by operationName', async () => {
    const client = createFakeGraphqlClient();

    await client.queryOrThrow(namedQuery('first'));
    await client.queryOrThrow(namedQuery('second'));

    const found = client.findOperation({ operationName: 'second' });

    assert.strictEqual(found?.operationName, 'second');
});

test('findOperation() returns the first operation matching by type', async () => {
    const client = createFakeGraphqlClient();

    await client.queryOrThrow(namedQuery('a-query'));
    await client.mutateOrThrow(namedMutation('a-mutation'));

    const found = client.findOperation({ type: 'mutation' });

    assert.strictEqual(found?.operationName, 'a-mutation');
});

test('findOperation() returns the first operation matching by schema identity', async () => {
    const otherSchema = z.object({ bar: z.string() }).strict();
    const client = createFakeGraphqlClient();

    await client.queryOrThrow(defineQuery({ schema: simpleSchema, operationName: 'a' }));
    await client.queryOrThrow(defineQuery({ schema: otherSchema, operationName: 'b' }));

    const found = client.findOperation({ schema: otherSchema });

    assert.strictEqual(found?.operationName, 'b');
});

test('findOperation() ANDs all fields of the matcher object', async () => {
    const client = createFakeGraphqlClient();

    await client.queryOrThrow(namedQuery('foo'));
    await client.mutateOrThrow(namedMutation('foo'));

    const found = client.findOperation({ operationName: 'foo', type: 'mutation' });

    assert.strictEqual(found?.type, 'mutation');
});

test('findOperation() returns undefined when no operation matches', async () => {
    const client = createFakeGraphqlClient();

    await client.queryOrThrow(namedQuery('foo'));

    const found = client.findOperation({ operationName: 'bar' });

    assert.strictEqual(found, undefined);
});

test('findOperation() accepts a predicate function', async () => {
    const client = createFakeGraphqlClient();

    await client.queryOrThrow(namedQuery('foo'), { headers: { 'x-tenant': 'a' } });
    await client.queryOrThrow(namedQuery('bar'), { headers: { 'x-tenant': 'b' } });

    const found = client.findOperation((recorded) => {
        return recorded.options.headers?.['x-tenant'] === 'b';
    });

    assert.strictEqual(found?.operationName, 'bar');
});

test('findAllOperations() returns every operation matching the matcher', async () => {
    const client = createFakeGraphqlClient();

    await client.queryOrThrow(namedQuery('a'));
    await client.mutateOrThrow(namedMutation('b'));
    await client.queryOrThrow(namedQuery('c'));

    const found = client.findAllOperations({ type: 'query' });

    assert.deepStrictEqual(
        found.map((recorded) => {
            return recorded.operationName;
        }),
        ['a', 'c']
    );
});

test('findAllOperations() returns an empty array when nothing matches', () => {
    const client = createFakeGraphqlClient();

    const found = client.findAllOperations({ operationName: 'nope' });

    assert.deepStrictEqual(found, []);
});

test('findOperationOrThrow() returns the matching operation', async () => {
    const client = createFakeGraphqlClient();

    await client.queryOrThrow(namedQuery('foo'));

    const found = client.findOperationOrThrow({ operationName: 'foo' });

    assert.strictEqual(found.operationName, 'foo');
});

test('findOperationOrThrow() throws with a description of the matcher object', async () => {
    const client = createFakeGraphqlClient();

    await client.queryOrThrow(namedQuery('foo'));

    try {
        client.findOperationOrThrow({ operationName: 'bar', type: 'mutation' });
        assert.fail('Expected findOperationOrThrow() to throw but it did not');
    } catch (error: unknown) {
        assert.strictEqual(
            (error as Error).message,
            'No operation recorded matching { operationName=bar, type=mutation }'
        );
    }
});

test('findOperationOrThrow() throws with predicate description for predicate matchers', () => {
    const client = createFakeGraphqlClient();

    try {
        client.findOperationOrThrow(() => {
            return true;
        });
        assert.fail('Expected findOperationOrThrow() to throw but it did not');
    } catch (error: unknown) {
        assert.strictEqual((error as Error).message, 'No operation recorded matching predicate function');
    }
});
