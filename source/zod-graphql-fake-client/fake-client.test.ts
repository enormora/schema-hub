import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { z } from 'zod/v4';
import type { GraphqlOperationError } from '../zod-graphql-client/operation-error.js';
import { createFakeGraphqlClient } from './fake-client.js';

const simpleQuery = z.object({ foo: z.string() }).strict();

test('throws when inspecting a query that doesn’t exist', () => {
    const client = createFakeGraphqlClient();

    try {
        client.inspectFirstOperationPayload();
        assert.fail('Expected inspectFirstQueryPayload() to throw but it did not');
    } catch (error: unknown) {
        assert.strictEqual((error as Error).message, 'No query payload at index 0 recorded');
    }
});

test('throws when inspecting a operation options that don’t exist', () => {
    const client = createFakeGraphqlClient();

    try {
        client.inspectFirstOperationOptions();
        assert.fail('Expected inspectFirstOperationOptions() to throw but it did not');
    } catch (error: unknown) {
        assert.strictEqual((error as Error).message, 'No operationOption at index 0 recorded');
    }
});

test('query() returns the default result when no result is configured', async () => {
    const client = createFakeGraphqlClient();

    const result = await client.query(simpleQuery);
    assert.deepStrictEqual(result, { success: true, data: {} });
});

test('mutate() returns the default result when no result is configured', async () => {
    const client = createFakeGraphqlClient();

    const result = await client.mutate(simpleQuery);
    assert.deepStrictEqual(result, { success: true, data: {} });
});

test('query() returns the default result when some results are configured but not for that call', async () => {
    const client = createFakeGraphqlClient({ results: [{ data: 'foo' }] });

    await client.query(simpleQuery);
    const result = await client.query(simpleQuery);
    assert.deepStrictEqual(result, { success: true, data: {} });
});

test('query() returns the configured success result', async () => {
    const client = createFakeGraphqlClient({ results: [{ data: 'foo' }] });

    const result = await client.query(simpleQuery);
    assert.deepStrictEqual(result, { success: true, data: 'foo' });
});

test('query() returns the configured error result', async () => {
    const client = createFakeGraphqlClient({ results: [{ error: { type: 'unknown', message: 'foo' } }] });

    const result = await client.query(simpleQuery);
    assert.deepStrictEqual(result, { success: false, errorDetails: { type: 'unknown', message: 'foo' } });
});

test('queryOrThrow() returns the configured success data', async () => {
    const client = createFakeGraphqlClient({ results: [{ data: 'foo' }] });

    const result = await client.queryOrThrow(simpleQuery);
    assert.strictEqual(result, 'foo');
});

test('mutateOrThrow() returns the configured success data', async () => {
    const client = createFakeGraphqlClient({ results: [{ data: 'foo' }] });

    const result = await client.mutateOrThrow(simpleQuery);
    assert.strictEqual(result, 'foo');
});

test('queryOrThrow() throws the configured error', async () => {
    const client = createFakeGraphqlClient({ results: [{ error: { type: 'unknown', message: 'foo' } }] });

    try {
        await client.queryOrThrow(simpleQuery);
        assert.fail('Expected queryOrThrow() to throw but it did not');
    } catch (error: unknown) {
        assert.strictEqual((error as GraphqlOperationError).message, 'foo');
        assert.deepStrictEqual((error as GraphqlOperationError).details, { type: 'unknown' });
    }
});

test('mutateOrThrow() throws the configured error', async () => {
    const client = createFakeGraphqlClient({ results: [{ error: { type: 'unknown', message: 'foo' } }] });

    try {
        await client.mutateOrThrow(simpleQuery);
        assert.fail('Expected mutateOrThrow() to throw but it did not');
    } catch (error: unknown) {
        assert.strictEqual((error as GraphqlOperationError).message, 'foo');
        assert.deepStrictEqual((error as GraphqlOperationError).details, { type: 'unknown' });
    }
});

test('inspectFirstOperationPayload() returns the query payload of the first query', async () => {
    const client = createFakeGraphqlClient();

    await client.queryOrThrow(simpleQuery, { operationName: 'foo' });
    const payload = client.inspectFirstOperationPayload();

    assert.deepStrictEqual(payload, { operationName: 'foo', query: 'query foo { foo }', variables: {} });
});

test('inspectFirstOperationPayload() returns the mutation payload of the first mutation', async () => {
    const client = createFakeGraphqlClient();

    await client.mutateOrThrow(simpleQuery, { operationName: 'foo' });
    const payload = client.inspectFirstOperationPayload();

    assert.deepStrictEqual(payload, { operationName: 'foo', query: 'mutation foo { foo }', variables: {} });
});

test('inspectFirstOperationOptions() returns the operation options of the first query', async () => {
    const client = createFakeGraphqlClient();

    await client.queryOrThrow(simpleQuery, {
        operationName: 'foo',
        headers: { foo: 'bar' },
        timeout: 42,
        variables: {}
    });
    const options = client.inspectFirstOperationOptions();

    assert.deepStrictEqual(options, {
        operationName: 'foo',
        headers: { foo: 'bar' },
        timeout: 42,
        variables: {}
    });
});

test('inspectFirstOperationOptions() returns the operation options of the first mutation', async () => {
    const client = createFakeGraphqlClient();

    await client.mutateOrThrow(simpleQuery, {
        operationName: 'foo',
        headers: { foo: 'bar' },
        timeout: 42,
        variables: {}
    });
    const options = client.inspectFirstOperationOptions();

    assert.deepStrictEqual(options, {
        operationName: 'foo',
        headers: { foo: 'bar' },
        timeout: 42,
        variables: {}
    });
});

test('findOperation() returns undefined when no operation was recorded', () => {
    const client = createFakeGraphqlClient();

    const found = client.findOperation({ operationName: 'foo' });

    assert.strictEqual(found, undefined);
});

test('findOperation() returns the first operation matching by operationName', async () => {
    const client = createFakeGraphqlClient();

    await client.queryOrThrow(simpleQuery, { operationName: 'first' });
    await client.queryOrThrow(simpleQuery, { operationName: 'second' });

    const found = client.findOperation({ operationName: 'second' });

    assert.strictEqual(found?.options.operationName, 'second');
});

test('findOperation() returns the first operation matching by type', async () => {
    const client = createFakeGraphqlClient();

    await client.queryOrThrow(simpleQuery, { operationName: 'a-query' });
    await client.mutateOrThrow(simpleQuery, { operationName: 'a-mutation' });

    const found = client.findOperation({ type: 'mutation' });

    assert.strictEqual(found?.options.operationName, 'a-mutation');
});

test('findOperation() returns the first operation matching by schema identity', async () => {
    const otherQuery = z.object({ bar: z.string() }).strict();
    const client = createFakeGraphqlClient();

    await client.queryOrThrow(simpleQuery, { operationName: 'a' });
    await client.queryOrThrow(otherQuery, { operationName: 'b' });

    const found = client.findOperation({ schema: otherQuery });

    assert.strictEqual(found?.options.operationName, 'b');
});

test('findOperation() ANDs all fields of the matcher object', async () => {
    const client = createFakeGraphqlClient();

    await client.queryOrThrow(simpleQuery, { operationName: 'foo' });
    await client.mutateOrThrow(simpleQuery, { operationName: 'foo' });

    const found = client.findOperation({ operationName: 'foo', type: 'mutation' });

    assert.strictEqual(found?.type, 'mutation');
});

test('findOperation() returns undefined when no operation matches', async () => {
    const client = createFakeGraphqlClient();

    await client.queryOrThrow(simpleQuery, { operationName: 'foo' });

    const found = client.findOperation({ operationName: 'bar' });

    assert.strictEqual(found, undefined);
});

test('findOperation() accepts a predicate function', async () => {
    const client = createFakeGraphqlClient();

    await client.queryOrThrow(simpleQuery, { operationName: 'foo', headers: { 'x-tenant': 'a' } });
    await client.queryOrThrow(simpleQuery, { operationName: 'bar', headers: { 'x-tenant': 'b' } });

    const found = client.findOperation((recorded) => {
        return recorded.options.headers?.['x-tenant'] === 'b';
    });

    assert.strictEqual(found?.options.operationName, 'bar');
});

test('findAllOperations() returns every operation matching the matcher', async () => {
    const client = createFakeGraphqlClient();

    await client.queryOrThrow(simpleQuery, { operationName: 'a' });
    await client.mutateOrThrow(simpleQuery, { operationName: 'b' });
    await client.queryOrThrow(simpleQuery, { operationName: 'c' });

    const found = client.findAllOperations({ type: 'query' });

    assert.deepStrictEqual(
        found.map((recorded) => {
            return recorded.options.operationName;
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

    await client.queryOrThrow(simpleQuery, { operationName: 'foo' });

    const found = client.findOperationOrThrow({ operationName: 'foo' });

    assert.strictEqual(found.options.operationName, 'foo');
});

test('findOperationOrThrow() throws with a description of the matcher object', async () => {
    const client = createFakeGraphqlClient();

    await client.queryOrThrow(simpleQuery, { operationName: 'foo' });

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
