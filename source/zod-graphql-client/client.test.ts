import assert from 'node:assert';
import { test } from '@sondr3/minitest';
import { TimeoutError } from 'ky';
import { fake, type SinonSpy } from 'sinon';
import { z } from 'zod/v4';
import {
    type ClientOptions,
    type CreateClientDependencies,
    createClientFactory,
    type GraphqlClient
} from './client.ts';
import { GraphqlOperationError } from './operation-error.ts';
import { defineMutation, defineQuery } from './operation-handle.ts';

type KyOverrides = {
    responseStatus?: number;
    responseJsonBody?: unknown;
    error?: unknown;
    jsonParseError?: unknown;
};

function createFakeKyMethod(kyOverrides: KyOverrides = {}): SinonSpy {
    const { error, jsonParseError, responseStatus = 200, responseJsonBody = null } = kyOverrides;
    if (error !== undefined) {
        return fake.rejects(error);
    }
    const response = {
        status: responseStatus,
        json: jsonParseError === undefined ? fake.resolves(responseJsonBody) : fake.rejects(jsonParseError)
    };

    return fake.resolves(response);
}

type ClientFactoryOverrides = {
    post?: SinonSpy;
    options?: ClientOptions;
};

function clientFactory(overrides: ClientFactoryOverrides): GraphqlClient {
    const { post = createFakeKyMethod(), options = { endpoint: '' } } = overrides;
    const createClient = createClientFactory({ ky: { post } } as unknown as CreateClientDependencies);
    return createClient(options);
}

const simpleQuerySchema = z.strictObject({ foo: z.string() });
const simpleQueryHandle = defineQuery({ schema: simpleQuerySchema });
const simpleMutationHandle = defineMutation({ schema: simpleQuerySchema });

test('query() sends the query derived from the given schema to the configured endpoint', async function () {
    const post = createFakeKyMethod();
    const client = clientFactory({ post, options: { endpoint: 'http://example/the-endpoint' } });
    await client.query(simpleQueryHandle);

    assert.strictEqual(post.callCount, 1);
    assert.deepStrictEqual(post.firstCall.args, [ 'http://example/the-endpoint', {
        headers: {},
        json: { operationName: undefined, query: 'query { foo }', variables: {} },
        retry: 0,
        throwHttpErrors: false,
        timeout: 10_000
    } ]);
});

test('mutate() sends the mutation derived from the given schema to the configured endpoint', async function () {
    const post = createFakeKyMethod();
    const client = clientFactory({ post, options: { endpoint: 'http://example/the-endpoint' } });
    await client.mutate(simpleMutationHandle);

    assert.strictEqual(post.callCount, 1);
    assert.deepStrictEqual(post.firstCall.args, [ 'http://example/the-endpoint', {
        headers: {},
        json: { operationName: undefined, query: 'mutation { foo }', variables: {} },
        retry: 0,
        throwHttpErrors: false,
        timeout: 10_000
    } ]);
});

test('query() with a handle that has an operationName sends the named query', async function () {
    const post = createFakeKyMethod();
    const client = clientFactory({ post, options: { endpoint: 'http://example/the-endpoint' } });
    const namedQuery = defineQuery({ schema: simpleQuerySchema, operationName: 'theQuery' });
    await client.query(namedQuery);

    assert.strictEqual(post.callCount, 1);
    assert.deepStrictEqual(post.firstCall.args, [ 'http://example/the-endpoint', {
        headers: {},
        json: { operationName: 'theQuery', query: 'query theQuery { foo }', variables: {} },
        retry: 0,
        throwHttpErrors: false,
        timeout: 10_000
    } ]);
});

test('query() sets the given timeout from the client options', async function () {
    const post = createFakeKyMethod();
    const client = clientFactory({ post, options: { endpoint: 'http://example/the-endpoint', timeout: 1 } });
    await client.query(simpleQueryHandle);

    assert.strictEqual(post.callCount, 1);
    assert.deepStrictEqual(post.firstCall.args, [ 'http://example/the-endpoint', {
        headers: {},
        json: { operationName: undefined, query: 'query { foo }', variables: {} },
        retry: 0,
        throwHttpErrors: false,
        timeout: 1
    } ]);
});

test('query() sets the given timeout from the query options', async function () {
    const post = createFakeKyMethod();
    const client = clientFactory({ post, options: { endpoint: 'http://example/the-endpoint' } });
    await client.query(simpleQueryHandle, { timeout: 2 });

    assert.strictEqual(post.callCount, 1);
    assert.deepStrictEqual(post.firstCall.args, [ 'http://example/the-endpoint', {
        headers: {},
        json: { operationName: undefined, query: 'query { foo }', variables: {} },
        retry: 0,
        throwHttpErrors: false,
        timeout: 2
    } ]);
});

test('query() uses the timeout from query options when it is also configured per client options', async function () {
    const post = createFakeKyMethod();
    const client = clientFactory({ post, options: { endpoint: 'http://example/the-endpoint', timeout: 1 } });
    await client.query(simpleQueryHandle, { timeout: 2 });

    assert.strictEqual(post.callCount, 1);
    assert.deepStrictEqual(post.firstCall.args, [ 'http://example/the-endpoint', {
        headers: {},
        json: { operationName: undefined, query: 'query { foo }', variables: {} },
        retry: 0,
        throwHttpErrors: false,
        timeout: 2
    } ]);
});

test('query() sets the given headers from the client options', async function () {
    const post = createFakeKyMethod();
    const client = clientFactory({
        post,
        options: { endpoint: 'http://example/the-endpoint', headers: { foo: 'bar' } }
    });
    await client.query(simpleQueryHandle);

    assert.strictEqual(post.callCount, 1);
    assert.deepStrictEqual(post.firstCall.args, [ 'http://example/the-endpoint', {
        headers: { foo: 'bar' },
        json: { operationName: undefined, query: 'query { foo }', variables: {} },
        retry: 0,
        throwHttpErrors: false,
        timeout: 10_000
    } ]);
});

test('query() sets the given headers from the query options', async function () {
    const post = createFakeKyMethod();
    const client = clientFactory({ post, options: { endpoint: 'http://example/the-endpoint' } });
    await client.query(simpleQueryHandle, { headers: { foo: 'bar' } });

    assert.strictEqual(post.callCount, 1);
    assert.deepStrictEqual(post.firstCall.args, [ 'http://example/the-endpoint', {
        headers: { foo: 'bar' },
        json: { operationName: undefined, query: 'query { foo }', variables: {} },
        retry: 0,
        throwHttpErrors: false,
        timeout: 10_000
    } ]);
});

test('query() merges the headers from the query options into the headers from the client options', async function () {
    const post = createFakeKyMethod();
    const client = clientFactory({
        post,
        options: { endpoint: 'http://example/the-endpoint', headers: { foo: 'bar', bar: 'baz' } }
    });
    await client.query(simpleQueryHandle, { headers: { bar: 'qux', qux: 'quux' } });

    assert.strictEqual(post.callCount, 1);
    assert.deepStrictEqual(post.firstCall.args, [ 'http://example/the-endpoint', {
        headers: { foo: 'bar', bar: 'qux', qux: 'quux' },
        json: { operationName: undefined, query: 'query { foo }', variables: {} },
        retry: 0,
        throwHttpErrors: false,
        timeout: 10_000
    } ]);
});

test('query() returns a network failure result when the request times out', async function () {
    const timeoutError = new TimeoutError({} as unknown as Request);
    const post = createFakeKyMethod({ error: timeoutError });
    const client = clientFactory({ post });
    const result = await client.query(simpleQueryHandle);

    assert.deepStrictEqual(result, {
        success: false,
        errorDetails: { message: 'Request timed out after 10000ms', type: 'network', cause: timeoutError }
    });
});

test('query() returns a network failure result when the request errors', async function () {
    const networkError = new Error('foo');
    const post = createFakeKyMethod({ error: networkError });
    const client = clientFactory({ post });
    const result = await client.query(simpleQueryHandle);

    assert.deepStrictEqual(result, {
        success: false,
        errorDetails: { message: 'foo', type: 'network', cause: networkError }
    });
});

test('query() returns a unknown failure result when the request rejects with a non-error', async function () {
    const post = fake(function () {
        // eslint-disable-next-line @typescript-eslint/only-throw-error, no-throw-literal -- we need to test this scenario
        throw 'not-an-error';
    });
    const client = clientFactory({ post });
    const result = await client.query(simpleQueryHandle);

    assert.deepStrictEqual(result, {
        success: false,
        errorDetails: { message: 'Unknown error occurred', type: 'unknown', cause: 'not-an-error' }
    });
});

test('query() returns a server failure result when the response status code is not 200', async function () {
    const post = createFakeKyMethod({ responseStatus: 418 });
    const client = clientFactory({ post });
    const result = await client.query(simpleQueryHandle);

    assert.deepStrictEqual(result, {
        success: false,
        errorDetails: {
            message: 'Received response with unexpected status 418 code from GraphQL server',
            type: 'server',
            statusCode: 418
        }
    });
});

test('query() returns a server failure result when response fails to be parsed as json', async function () {
    const jsonParseError = new Error('foo');
    const post = createFakeKyMethod({ jsonParseError, responseStatus: 200 });
    const client = clientFactory({ post });
    const result = await client.query(simpleQueryHandle);

    assert.deepStrictEqual(result, {
        success: false,
        errorDetails: {
            message: 'Failed to parse response body: foo',
            type: 'server',
            statusCode: 200,
            cause: jsonParseError
        }
    });
});

test('query() returns a server failure when json parsing fails but a non-error was thrown', async function () {
    const post = fake.resolves({
        status: 200,
        json: fake(function () {
            // eslint-disable-next-line @typescript-eslint/only-throw-error, no-throw-literal -- we need to test this scenario
            throw 'not-an-error';
        })
    });
    const client = clientFactory({ post });
    const result = await client.query(simpleQueryHandle);

    assert.deepStrictEqual(result, {
        success: false,
        errorDetails: {
            message: 'Failed to parse response body',
            type: 'server',
            statusCode: 200,
            cause: 'not-an-error'
        }
    });
});

test('query() returns a server failure when json parsing fails but a non-error was thrown', async function () {
    const post = fake.resolves({
        status: 200,
        json: fake(function () {
            // eslint-disable-next-line @typescript-eslint/only-throw-error, no-throw-literal -- we need to test this scenario
            throw 'not-an-error';
        })
    });
    const client = clientFactory({ post });
    const result = await client.query(simpleQueryHandle);

    assert.deepStrictEqual(result, {
        success: false,
        errorDetails: {
            message: 'Failed to parse response body',
            type: 'server',
            statusCode: 200,
            cause: 'not-an-error'
        }
    });
});

test('query() returns a unknown failure when response is not a valid graphql data structure', async function () {
    const post = createFakeKyMethod({ responseJsonBody: [] });
    const client = clientFactory({ post });
    const result = await client.query(simpleQueryHandle);

    assert.deepStrictEqual(result, {
        success: false,
        errorDetails: {
            message: 'GraphQL server responded with an incorrect data structure',
            type: 'unknown'
        }
    });
});

test('query() returns a graphql failure when response contains errors', async function () {
    const post = createFakeKyMethod({ responseJsonBody: { errors: [ { message: 'foo' } ] } });
    const client = clientFactory({ post });
    const result = await client.query(simpleQueryHandle);

    assert.deepStrictEqual(result, {
        success: false,
        errorDetails: {
            message: 'GraphQL response contains errors',
            type: 'graphql',
            errors: [ { message: 'foo' } ]
        }
    });
});

test('query() returns a validation failure when response data doesn’t match the given schema', async function () {
    const post = createFakeKyMethod({ responseJsonBody: { data: 'foo' } });
    const client = clientFactory({ post });
    const result = await client.query(simpleQueryHandle);

    assert.deepStrictEqual(result, {
        success: false,
        errorDetails: {
            message: 'GraphQL response data doesn’t match the expected schema',
            type: 'validation',
            issues: [ 'expected object, but got string' ]
        }
    });
});

test('query() returns a success result with the data when it matches the given schema', async function () {
    const post = createFakeKyMethod({ responseJsonBody: { data: { foo: 'bar' } } });
    const client = clientFactory({ post });
    const result = await client.query(simpleQueryHandle);

    assert.deepStrictEqual(result, {
        success: true,
        data: { foo: 'bar' }
    });
});

test('queryOrThrow() returns the data when it matches the given schema', async function () {
    const post = createFakeKyMethod({ responseJsonBody: { data: { foo: 'bar' } } });
    const client = clientFactory({ post });
    const result = await client.queryOrThrow(simpleQueryHandle);

    assert.deepStrictEqual(result, {
        foo: 'bar'
    });
});

test('mutateOrThrow() returns the data when it matches the given schema', async function () {
    const post = createFakeKyMethod({ responseJsonBody: { data: { foo: 'bar' } } });
    const client = clientFactory({ post });
    const result = await client.mutateOrThrow(simpleMutationHandle);

    assert.deepStrictEqual(result, {
        foo: 'bar'
    });
});

test('queryOrThrow() rejects an error when there is a failure', async function () {
    const post = createFakeKyMethod({ responseJsonBody: { data: {} } });
    const client = clientFactory({ post });

    try {
        await client.queryOrThrow(simpleQueryHandle);
        assert.fail('Expected queryOrThrow() to fail but it did not');
    } catch (error: unknown) {
        assert.strictEqual(error instanceof GraphqlOperationError, true);
        assert.strictEqual(
            (error as GraphqlOperationError).message,
            'GraphQL response data doesn’t match the expected schema'
        );
        assert.deepStrictEqual((error as GraphqlOperationError).details, {
            type: 'validation',
            issues: [ 'at foo: missing property; expected string' ]
        });
    }
});

test('mutateOrThrow() rejects an error when there is a failure', async function () {
    const post = createFakeKyMethod({ responseJsonBody: { data: {} } });
    const client = clientFactory({ post });

    try {
        await client.mutateOrThrow(simpleMutationHandle);
        assert.fail('Expected mutateOrThrow() to fail but it did not');
    } catch (error: unknown) {
        assert.strictEqual(error instanceof GraphqlOperationError, true);
        assert.strictEqual(
            (error as GraphqlOperationError).message,
            'GraphQL response data doesn’t match the expected schema'
        );
        assert.deepStrictEqual((error as GraphqlOperationError).details, {
            type: 'validation',
            issues: [ 'at foo: missing property; expected string' ]
        });
    }
});

test('queryOrThrow() forwards the underlying network error as cause', async function () {
    const networkError = new Error('boom');
    const post = createFakeKyMethod({ error: networkError });
    const client = clientFactory({ post });

    try {
        await client.queryOrThrow(simpleQueryHandle);
        assert.fail('Expected queryOrThrow() to fail but it did not');
    } catch (error: unknown) {
        assert.strictEqual(error instanceof GraphqlOperationError, true);
        assert.strictEqual((error as GraphqlOperationError).cause, networkError);
    }
});
