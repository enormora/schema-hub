import { test } from '@sondr3/minitest';
import { TimeoutError } from 'ky';
import assert from 'node:assert';
import { fake, type SinonSpy, stub } from 'sinon';
import { z } from 'zod/v4';
import { graphqlFieldOptions, variablePlaceholder } from '../zod-graphql-query-builder/entry-point.js';
import {
    type ClientOptions,
    type CreateClientDependencies,
    createClientFactory,
    type GraphqlClient
} from './client.js';
import { GraphqlOperationError } from './operation-error.js';
import { computePersistedQueryHash } from './persisted-query.js';

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

type Overrides = {
    post?: SinonSpy;
    options?: ClientOptions;
};

function clientFactory(overrides: Overrides): GraphqlClient {
    const { post = createFakeKyMethod(), options = { endpoint: '' } } = overrides;
    const createClient = createClientFactory({ ky: { post } } as unknown as CreateClientDependencies);
    return createClient(options);
}

function createKyMethodReturningResponses(responseBodies: readonly unknown[]): SinonSpy {
    const sequence = stub();
    responseBodies.forEach((body, index) => {
        sequence.onCall(index).resolves({ status: 200, json: fake.resolves(body) });
    });
    return sequence as unknown as SinonSpy;
}

const simpleQuerySchema = z.strictObject({ foo: z.string() });
const queryWithVariablesSchema = z
    .strictObject({ foo: graphqlFieldOptions(z.string(), { parameters: { bar: variablePlaceholder('$bar') } }) });

test('query() sends the query derived from the given schema to the configured endpoint', async () => {
    const post = createFakeKyMethod();
    const client = clientFactory({ post, options: { endpoint: 'http://example/the-endpoint' } });
    await client.query(simpleQuerySchema);

    assert.strictEqual(post.callCount, 1);
    assert.deepStrictEqual(post.firstCall.args, ['http://example/the-endpoint', {
        headers: {},
        json: { operationName: undefined, query: 'query { foo }', variables: {} },
        retry: 0,
        throwHttpErrors: false,
        timeout: 10_000
    }]);
});

test('mutate() sends the mutation derived from the given schema to the configured endpoint', async () => {
    const post = createFakeKyMethod();
    const client = clientFactory({ post, options: { endpoint: 'http://example/the-endpoint' } });
    await client.mutate(simpleQuerySchema);

    assert.strictEqual(post.callCount, 1);
    assert.deepStrictEqual(post.firstCall.args, ['http://example/the-endpoint', {
        headers: {},
        json: { operationName: undefined, query: 'mutation { foo }', variables: {} },
        retry: 0,
        throwHttpErrors: false,
        timeout: 10_000
    }]);
});

test('query() sets the given operationName', async () => {
    const post = createFakeKyMethod();
    const client = clientFactory({ post, options: { endpoint: 'http://example/the-endpoint' } });
    await client.query(simpleQuerySchema, { operationName: 'theQuery' });

    assert.strictEqual(post.callCount, 1);
    assert.deepStrictEqual(post.firstCall.args, ['http://example/the-endpoint', {
        headers: {},
        json: { operationName: 'theQuery', query: 'query theQuery { foo }', variables: {} },
        retry: 0,
        throwHttpErrors: false,
        timeout: 10_000
    }]);
});

test('query() sets the given timeout from the client options', async () => {
    const post = createFakeKyMethod();
    const client = clientFactory({ post, options: { endpoint: 'http://example/the-endpoint', timeout: 1 } });
    await client.query(simpleQuerySchema);

    assert.strictEqual(post.callCount, 1);
    assert.deepStrictEqual(post.firstCall.args, ['http://example/the-endpoint', {
        headers: {},
        json: { operationName: undefined, query: 'query { foo }', variables: {} },
        retry: 0,
        throwHttpErrors: false,
        timeout: 1
    }]);
});

test('query() sets the given timeout from the query options', async () => {
    const post = createFakeKyMethod();
    const client = clientFactory({ post, options: { endpoint: 'http://example/the-endpoint' } });
    await client.query(simpleQuerySchema, { timeout: 2 });

    assert.strictEqual(post.callCount, 1);
    assert.deepStrictEqual(post.firstCall.args, ['http://example/the-endpoint', {
        headers: {},
        json: { operationName: undefined, query: 'query { foo }', variables: {} },
        retry: 0,
        throwHttpErrors: false,
        timeout: 2
    }]);
});

test('query() uses the timeout from query options when it is also configured per client options', async () => {
    const post = createFakeKyMethod();
    const client = clientFactory({ post, options: { endpoint: 'http://example/the-endpoint', timeout: 1 } });
    await client.query(simpleQuerySchema, { timeout: 2 });

    assert.strictEqual(post.callCount, 1);
    assert.deepStrictEqual(post.firstCall.args, ['http://example/the-endpoint', {
        headers: {},
        json: { operationName: undefined, query: 'query { foo }', variables: {} },
        retry: 0,
        throwHttpErrors: false,
        timeout: 2
    }]);
});

test('query() sets the given headers from the client options', async () => {
    const post = createFakeKyMethod();
    const client = clientFactory({
        post,
        options: { endpoint: 'http://example/the-endpoint', headers: { foo: 'bar' } }
    });
    await client.query(simpleQuerySchema);

    assert.strictEqual(post.callCount, 1);
    assert.deepStrictEqual(post.firstCall.args, ['http://example/the-endpoint', {
        headers: { foo: 'bar' },
        json: { operationName: undefined, query: 'query { foo }', variables: {} },
        retry: 0,
        throwHttpErrors: false,
        timeout: 10_000
    }]);
});

test('query() sets the given headers from the query options', async () => {
    const post = createFakeKyMethod();
    const client = clientFactory({ post, options: { endpoint: 'http://example/the-endpoint' } });
    await client.query(simpleQuerySchema, { headers: { foo: 'bar' } });

    assert.strictEqual(post.callCount, 1);
    assert.deepStrictEqual(post.firstCall.args, ['http://example/the-endpoint', {
        headers: { foo: 'bar' },
        json: { operationName: undefined, query: 'query { foo }', variables: {} },
        retry: 0,
        throwHttpErrors: false,
        timeout: 10_000
    }]);
});

test('query() merges the headers from the query options into the headers from the client options', async () => {
    const post = createFakeKyMethod();
    const client = clientFactory({
        post,
        options: { endpoint: 'http://example/the-endpoint', headers: { foo: 'bar', bar: 'baz' } }
    });
    await client.query(simpleQuerySchema, { headers: { bar: 'qux', qux: 'quux' } });

    assert.strictEqual(post.callCount, 1);
    assert.deepStrictEqual(post.firstCall.args, ['http://example/the-endpoint', {
        headers: { foo: 'bar', bar: 'qux', qux: 'quux' },
        json: { operationName: undefined, query: 'query { foo }', variables: {} },
        retry: 0,
        throwHttpErrors: false,
        timeout: 10_000
    }]);
});

test('query() sends the query variables when given', async () => {
    const post = createFakeKyMethod();
    const client = clientFactory({ post, options: { endpoint: 'http://example/the-endpoint' } });
    await client.query(queryWithVariablesSchema, { variables: { bar: { type: 'Foo!', value: 'foo' } } });

    assert.strictEqual(post.callCount, 1);
    assert.deepStrictEqual(post.firstCall.args, ['http://example/the-endpoint', {
        headers: {},
        json: { operationName: undefined, query: 'query ($bar: Foo!) { foo(bar: $bar) }', variables: { bar: 'foo' } },
        retry: 0,
        throwHttpErrors: false,
        timeout: 10_000
    }]);
});

test('query() returns a network failure result when the request times out', async () => {
    const post = createFakeKyMethod({ error: new TimeoutError({} as unknown as Request) });
    const client = clientFactory({ post });
    // @ts-expect-error -- https://github.com/colinhacks/zod/issues/4611
    const result = await client.query(simpleQuerySchema);

    assert.deepStrictEqual(result, {
        success: false,
        errorDetails: { message: 'Request timed out after 10000ms', type: 'network' }
    });
});

test('query() returns a network failure result when the request errors', async () => {
    const post = createFakeKyMethod({ error: new Error('foo') });
    const client = clientFactory({ post });
    const result = await client.query(simpleQuerySchema);

    assert.deepStrictEqual(result, {
        success: false,
        errorDetails: { message: 'foo', type: 'network' }
    });
});

test('query() returns a unknown failure result when the request rejects with a non-error', async () => {
    const post = fake(() => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error, no-throw-literal -- we need to test this scenario
        throw 'not-an-error';
    });
    const client = clientFactory({ post });
    const result = await client.query(simpleQuerySchema);

    assert.deepStrictEqual(result, {
        success: false,
        errorDetails: { message: 'Unknown error occurred', type: 'unknown' }
    });
});

test('query() returns a server failure result when the response status code is not 200', async () => {
    const post = createFakeKyMethod({ responseStatus: 418 });
    const client = clientFactory({ post });
    const result = await client.query(simpleQuerySchema);

    assert.deepStrictEqual(result, {
        success: false,
        errorDetails: {
            message: 'Received response with unexpected status 418 code from GraphQL server',
            type: 'server',
            statusCode: 418
        }
    });
});

test('query() returns a server failure result when response fails to be parsed as json', async () => {
    const post = createFakeKyMethod({ jsonParseError: new Error('foo'), responseStatus: 200 });
    const client = clientFactory({ post });
    const result = await client.query(simpleQuerySchema);

    assert.deepStrictEqual(result, {
        success: false,
        errorDetails: {
            message: 'Failed to parse response body: foo',
            type: 'server',
            statusCode: 200
        }
    });
});

test('query() returns a server failure when json parsing fails but a non-error was thrown', async () => {
    const post = fake.resolves({
        status: 200,
        json: fake(() => {
            // eslint-disable-next-line @typescript-eslint/only-throw-error, no-throw-literal -- we need to test this scenario
            throw 'not-an-error';
        })
    });
    const client = clientFactory({ post });
    const result = await client.query(simpleQuerySchema);

    assert.deepStrictEqual(result, {
        success: false,
        errorDetails: {
            message: 'Failed to parse response body',
            type: 'server',
            statusCode: 200
        }
    });
});

test('query() returns a server failure when json parsing fails but a non-error was thrown', async () => {
    const post = fake.resolves({
        status: 200,
        json: fake(() => {
            // eslint-disable-next-line @typescript-eslint/only-throw-error, no-throw-literal -- we need to test this scenario
            throw 'not-an-error';
        })
    });
    const client = clientFactory({ post });
    const result = await client.query(simpleQuerySchema);

    assert.deepStrictEqual(result, {
        success: false,
        errorDetails: {
            message: 'Failed to parse response body',
            type: 'server',
            statusCode: 200
        }
    });
});

test('query() returns a unknown failure when response is not a valid graphql data structure', async () => {
    const post = createFakeKyMethod({ responseJsonBody: [] });
    const client = clientFactory({ post });
    const result = await client.query(simpleQuerySchema);

    assert.deepStrictEqual(result, {
        success: false,
        errorDetails: {
            message: 'GraphQL server responded with an incorrect data structure',
            type: 'unknown'
        }
    });
});

test('query() returns a graphql failure when response contains errors', async () => {
    const post = createFakeKyMethod({ responseJsonBody: { errors: [{ message: 'foo' }] } });
    const client = clientFactory({ post });
    const result = await client.query(simpleQuerySchema);

    assert.deepStrictEqual(result, {
        success: false,
        errorDetails: {
            message: 'GraphQL response contains errors',
            type: 'graphql',
            errors: ['foo']
        }
    });
});

test('query() returns a validation failure when response data doesn’t match the given schema', async () => {
    const post = createFakeKyMethod({ responseJsonBody: { data: 'foo' } });
    const client = clientFactory({ post });
    const result = await client.query(simpleQuerySchema);

    assert.deepStrictEqual(result, {
        success: false,
        errorDetails: {
            message: 'GraphQL response data doesn’t match the expected schema',
            type: 'validation',
            issues: ['expected object, but got string']
        }
    });
});

test('query() returns a success result with the data when it matches the given schema', async () => {
    const post = createFakeKyMethod({ responseJsonBody: { data: { foo: 'bar' } } });
    const client = clientFactory({ post });
    const result = await client.query(simpleQuerySchema);

    assert.deepStrictEqual(result, {
        success: true,
        data: { foo: 'bar' }
    });
});

test('queryOrThrow() returns the data when it matches the given schema', async () => {
    const post = createFakeKyMethod({ responseJsonBody: { data: { foo: 'bar' } } });
    const client = clientFactory({ post });
    const result = await client.queryOrThrow(simpleQuerySchema);

    assert.deepStrictEqual(result, {
        foo: 'bar'
    });
});

test('mutateOrThrow() returns the data when it matches the given schema', async () => {
    const post = createFakeKyMethod({ responseJsonBody: { data: { foo: 'bar' } } });
    const client = clientFactory({ post });
    const result = await client.mutateOrThrow(simpleQuerySchema);

    assert.deepStrictEqual(result, {
        foo: 'bar'
    });
});

test('queryOrThrow() rejects an error when there is a failure', async () => {
    const post = createFakeKyMethod({ responseJsonBody: { data: {} } });
    const client = clientFactory({ post });

    try {
        await client.queryOrThrow(simpleQuerySchema);
        assert.fail('Expected queryOrThrow() to fail but it did not');
    } catch (error: unknown) {
        assert.strictEqual(error instanceof GraphqlOperationError, true);
        assert.strictEqual(
            (error as GraphqlOperationError).message,
            'GraphQL response data doesn’t match the expected schema'
        );
        assert.deepStrictEqual((error as GraphqlOperationError).details, {
            type: 'validation',
            issues: ['at foo: missing property; expected string']
        });
    }
});

test('mutateOrThrow() rejects an error when there is a failure', async () => {
    const post = createFakeKyMethod({ responseJsonBody: { data: {} } });
    const client = clientFactory({ post });

    try {
        await client.mutateOrThrow(simpleQuerySchema);
        assert.fail('Expected mutateOrThrow() to fail but it did not');
    } catch (error: unknown) {
        assert.strictEqual(error instanceof GraphqlOperationError, true);
        assert.strictEqual(
            (error as GraphqlOperationError).message,
            'GraphQL response data doesn’t match the expected schema'
        );
        assert.deepStrictEqual((error as GraphqlOperationError).details, {
            type: 'validation',
            issues: ['at foo: missing property; expected string']
        });
    }
});

const simpleQueryHash = computePersistedQueryHash('query { foo }');
const mutationHash = computePersistedQueryHash('mutation { foo }');
const persistedQueryEndpoint = 'http://example/endpoint';
const persistedQueryOptions: ClientOptions = { endpoint: persistedQueryEndpoint, persistedQueries: true };

function buildExpectedRequestArgs(json: unknown): [string, unknown] {
    return [persistedQueryEndpoint, {
        headers: {},
        json,
        retry: 0,
        throwHttpErrors: false,
        timeout: 10_000
    }];
}

test('query() with persistedQueries sends only the hash on the first attempt', async () => {
    const post = createKyMethodReturningResponses([{ data: { foo: 'bar' } }]);
    const client = clientFactory({ post, options: persistedQueryOptions });

    const result = await client.query(simpleQuerySchema);

    assert.deepStrictEqual(
        post.firstCall.args,
        buildExpectedRequestArgs({
            operationName: undefined,
            variables: {},
            extensions: { persistedQuery: { version: 1, sha256Hash: simpleQueryHash } }
        })
    );
    assert.strictEqual(post.secondCall, null);
    assert.deepStrictEqual(result, { success: true, data: { foo: 'bar' } });
});

test('query() with persistedQueries retries with the full query on PersistedQueryNotFound', async () => {
    const post = createKyMethodReturningResponses([
        { errors: [{ message: 'PersistedQueryNotFound' }] },
        { data: { foo: 'bar' } }
    ]);
    const client = clientFactory({ post, options: persistedQueryOptions });

    const result = await client.query(simpleQuerySchema);

    assert.deepStrictEqual(
        post.firstCall.args,
        buildExpectedRequestArgs({
            operationName: undefined,
            variables: {},
            extensions: { persistedQuery: { version: 1, sha256Hash: simpleQueryHash } }
        })
    );
    assert.deepStrictEqual(
        post.secondCall.args,
        buildExpectedRequestArgs({
            operationName: undefined,
            query: 'query { foo }',
            variables: {},
            extensions: { persistedQuery: { version: 1, sha256Hash: simpleQueryHash } }
        })
    );
    assert.strictEqual(post.thirdCall, null);
    assert.deepStrictEqual(result, { success: true, data: { foo: 'bar' } });
});

test('query() with persistedQueries retries with the plain query on PersistedQueryNotSupported', async () => {
    const post = createKyMethodReturningResponses([
        { errors: [{ message: 'PersistedQueryNotSupported' }] },
        { data: { foo: 'bar' } }
    ]);
    const client = clientFactory({ post, options: persistedQueryOptions });

    const result = await client.query(simpleQuerySchema);

    assert.deepStrictEqual(
        post.secondCall.args,
        buildExpectedRequestArgs({
            operationName: undefined,
            query: 'query { foo }',
            variables: {}
        })
    );
    assert.strictEqual(post.thirdCall, null);
    assert.deepStrictEqual(result, { success: true, data: { foo: 'bar' } });
});

test('query() with persistedQueries surfaces unrelated GraphQL errors without retrying', async () => {
    const post = createKyMethodReturningResponses([{ errors: [{ message: 'real failure' }] }]);
    const client = clientFactory({ post, options: persistedQueryOptions });

    const result = await client.query(simpleQuerySchema);

    assert.strictEqual(post.callCount, 1);
    assert.deepStrictEqual(result, {
        success: false,
        errorDetails: { type: 'graphql', message: 'GraphQL response contains errors', errors: ['real failure'] }
    });
});

test('mutate() with persistedQueries follows the same retry-on-not-found behavior as queries', async () => {
    const post = createKyMethodReturningResponses([
        { errors: [{ message: 'PersistedQueryNotFound' }] },
        { data: { foo: 'bar' } }
    ]);
    const client = clientFactory({ post, options: persistedQueryOptions });

    const result = await client.mutate(simpleQuerySchema);

    assert.deepStrictEqual(
        post.firstCall.args,
        buildExpectedRequestArgs({
            operationName: undefined,
            variables: {},
            extensions: { persistedQuery: { version: 1, sha256Hash: mutationHash } }
        })
    );
    assert.deepStrictEqual(
        post.secondCall.args,
        buildExpectedRequestArgs({
            operationName: undefined,
            query: 'mutation { foo }',
            variables: {},
            extensions: { persistedQuery: { version: 1, sha256Hash: mutationHash } }
        })
    );
    assert.deepStrictEqual(result, { success: true, data: { foo: 'bar' } });
});

test('query() with persistedQueries does not retry past one attempt on persistent PersistedQueryNotFound', async () => {
    const post = createKyMethodReturningResponses([
        { errors: [{ message: 'PersistedQueryNotFound' }] },
        { errors: [{ message: 'PersistedQueryNotFound' }] }
    ]);
    const client = clientFactory({ post, options: persistedQueryOptions });

    const result = await client.query(simpleQuerySchema);

    assert.strictEqual(post.thirdCall, null);
    assert.deepStrictEqual(result, {
        success: false,
        errorDetails: {
            type: 'graphql',
            message: 'GraphQL response contains errors',
            errors: ['PersistedQueryNotFound']
        }
    });
});

test('query() with persistedQueries returns the network failure when the first attempt errors', async () => {
    const post = createFakeKyMethod({ error: new Error('network down') });
    const client = clientFactory({ post, options: persistedQueryOptions });

    const result = await client.query(simpleQuerySchema);

    assert.strictEqual(post.secondCall, null);
    assert.deepStrictEqual(result, {
        success: false,
        errorDetails: { type: 'network', message: 'network down' }
    });
});

test('query() without persistedQueries never includes the extensions field', async () => {
    const post = createFakeKyMethod({ responseJsonBody: { data: { foo: 'bar' } } });
    const client = clientFactory({ post, options: { endpoint: persistedQueryEndpoint } });

    await client.query(simpleQuerySchema);

    assert.deepStrictEqual(
        post.firstCall.args,
        buildExpectedRequestArgs({
            operationName: undefined,
            query: 'query { foo }',
            variables: {}
        })
    );
});
