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
