import assert from 'node:assert';
import { test } from '@sondr3/minitest';
import { type SinonSpy, fake, stub } from 'sinon';
import { z } from 'zod/v4';
import {
    type ClientOptions,
    type CreateClientDependencies,
    createClientFactory,
    type GraphqlClient
} from './client.ts';
import { defineMutation, defineQuery } from './operation-handle.ts';

function createFakeKyMethod(error: unknown): SinonSpy {
    if (error !== undefined) {
        return fake.rejects(error);
    }
    return fake.resolves({ status: 200, json: fake.resolves({ data: { foo: 'bar' } }) });
}

function createKyMethodReturningResponses(responseBodies: readonly unknown[]): SinonSpy {
    const sequence = stub();
    responseBodies.forEach(function (body, index) {
        sequence.onCall(index).resolves({ status: 200, json: fake.resolves(body) });
    });
    return sequence;
}

function clientFactory(post: SinonSpy, options: ClientOptions): GraphqlClient {
    const createClient = createClientFactory({ ky: { post } } as unknown as CreateClientDependencies);
    return createClient(options);
}

const simpleSchema = z.strictObject({ foo: z.string() });
const simpleQueryHandle = defineQuery({ schema: simpleSchema });
const simpleMutationHandle = defineMutation({ schema: simpleSchema });

const simpleQueryHash = '6aa12cae7e116b726dae8e1ea59ab89ea8b16b7d596c834341d10ca36e12efd6';
const mutationHash = 'd496cfbea26d8368249ab9267663edc4f267837c993cdd75ef6edc15c91b2b92';
const persistedQueryEndpoint = 'http://example/endpoint';
const persistedQueryOptions: ClientOptions = { endpoint: persistedQueryEndpoint, persistedQueries: true };

function buildExpectedRequestArgs(json: unknown): [string, unknown] {
    return [ persistedQueryEndpoint, {
        headers: {},
        json,
        retry: 0,
        throwHttpErrors: false,
        timeout: 10_000
    } ];
}

test('query() with persistedQueries sends only the hash on the first attempt', async function () {
    const post = createKyMethodReturningResponses([ { data: { foo: 'bar' } } ]);
    const client = clientFactory(post, persistedQueryOptions);

    const result = await client.query(simpleQueryHandle);

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

test('query() with persistedQueries retries with the full query on PersistedQueryNotFound', async function () {
    const post = createKyMethodReturningResponses([
        { errors: [ { message: 'PersistedQueryNotFound' } ] },
        { data: { foo: 'bar' } }
    ]);
    const client = clientFactory(post, persistedQueryOptions);

    const result = await client.query(simpleQueryHandle);

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

test('query() with persistedQueries retries with the plain query on PersistedQueryNotSupported', async function () {
    const post = createKyMethodReturningResponses([
        { errors: [ { message: 'PersistedQueryNotSupported' } ] },
        { data: { foo: 'bar' } }
    ]);
    const client = clientFactory(post, persistedQueryOptions);

    const result = await client.query(simpleQueryHandle);

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

test('query() with persistedQueries surfaces unrelated GraphQL errors without retrying', async function () {
    const post = createKyMethodReturningResponses([ { errors: [ { message: 'real failure' } ] } ]);
    const client = clientFactory(post, persistedQueryOptions);

    const result = await client.query(simpleQueryHandle);

    assert.strictEqual(post.callCount, 1);
    assert.deepStrictEqual(result, {
        success: false,
        errorDetails: {
            type: 'graphql',
            message: 'GraphQL response contains errors',
            errors: [ { message: 'real failure' } ]
        }
    });
});

test('mutate() with persistedQueries follows the same retry-on-not-found behavior as queries', async function () {
    const post = createKyMethodReturningResponses([
        { errors: [ { message: 'PersistedQueryNotFound' } ] },
        { data: { foo: 'bar' } }
    ]);
    const client = clientFactory(post, persistedQueryOptions);

    const result = await client.mutate(simpleMutationHandle);

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

test('query() with persistedQueries does not retry past one attempt on persistent PersistedQueryNotFound', async function () {
    const post = createKyMethodReturningResponses([
        { errors: [ { message: 'PersistedQueryNotFound' } ] },
        { errors: [ { message: 'PersistedQueryNotFound' } ] }
    ]);
    const client = clientFactory(post, persistedQueryOptions);

    const result = await client.query(simpleQueryHandle);

    assert.strictEqual(post.thirdCall, null);
    assert.deepStrictEqual(result, {
        success: false,
        errorDetails: {
            type: 'graphql',
            message: 'GraphQL response contains errors',
            errors: [ { message: 'PersistedQueryNotFound' } ]
        }
    });
});

test('query() with persistedQueries returns the network failure when the first attempt errors', async function () {
    const networkError = new Error('network down');
    const post = createFakeKyMethod(networkError);
    const client = clientFactory(post, persistedQueryOptions);

    const result = await client.query(simpleQueryHandle);

    assert.strictEqual(post.secondCall, null);
    assert.deepStrictEqual(result, {
        success: false,
        errorDetails: { type: 'network', message: 'network down', cause: networkError }
    });
});

test('query() without persistedQueries never includes the extensions field', async function () {
    const post = createFakeKyMethod(undefined);
    const client = clientFactory(post, { endpoint: persistedQueryEndpoint });

    await client.query(simpleQueryHandle);

    assert.deepStrictEqual(
        post.firstCall.args,
        buildExpectedRequestArgs({
            operationName: undefined,
            query: 'query { foo }',
            variables: {}
        })
    );
});
