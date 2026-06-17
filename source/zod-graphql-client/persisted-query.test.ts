import assert from 'node:assert';
import { test } from '@sondr3/minitest';
import {
    buildPersistedQueryExtensions,
    computePersistedQueryHash,
    detectPersistedQueryRetryReason
} from './persisted-query.ts';

const queryFooHash = '6aa12cae7e116b726dae8e1ea59ab89ea8b16b7d596c834341d10ca36e12efd6';

test('computePersistedQueryHash returns the sha256 hex digest of the given query', function () {
    assert.strictEqual(computePersistedQueryHash('query { foo }'), queryFooHash);
});

test('buildPersistedQueryExtensions wraps the hash with the version 1 envelope', function () {
    assert.deepStrictEqual(buildPersistedQueryExtensions('query { foo }'), {
        persistedQuery: {
            version: 1,
            sha256Hash: queryFooHash
        }
    });
});

test('detectPersistedQueryRetryReason returns undefined when the response is not an object', function () {
    assert.strictEqual(detectPersistedQueryRetryReason('not an object'), undefined);
});

test('detectPersistedQueryRetryReason returns undefined when there is no errors property', function () {
    assert.strictEqual(detectPersistedQueryRetryReason({ data: { foo: 'bar' } }), undefined);
});

test('detectPersistedQueryRetryReason returns undefined when errors do not contain persisted query signals', function () {
    assert.strictEqual(
        detectPersistedQueryRetryReason({ errors: [ { message: 'some other error' } ] }),
        undefined
    );
});

test('detectPersistedQueryRetryReason returns "not-found" on PersistedQueryNotFound message', function () {
    assert.strictEqual(
        detectPersistedQueryRetryReason({ errors: [ { message: 'PersistedQueryNotFound' } ] }),
        'not-found'
    );
});

test('detectPersistedQueryRetryReason returns "not-found" on PERSISTED_QUERY_NOT_FOUND extension code', function () {
    assert.strictEqual(
        detectPersistedQueryRetryReason({
            errors: [ { message: 'whatever', extensions: { code: 'PERSISTED_QUERY_NOT_FOUND' } } ]
        }),
        'not-found'
    );
});

test('detectPersistedQueryRetryReason returns "not-supported" on PersistedQueryNotSupported message', function () {
    assert.strictEqual(
        detectPersistedQueryRetryReason({ errors: [ { message: 'PersistedQueryNotSupported' } ] }),
        'not-supported'
    );
});

test('detectPersistedQueryRetryReason returns "not-supported" on PERSISTED_QUERY_NOT_SUPPORTED extension code', function () {
    assert.strictEqual(
        detectPersistedQueryRetryReason({
            errors: [ { message: 'whatever', extensions: { code: 'PERSISTED_QUERY_NOT_SUPPORTED' } } ]
        }),
        'not-supported'
    );
});

test('detectPersistedQueryRetryReason returns the first matching reason when multiple errors are present', function () {
    assert.strictEqual(
        detectPersistedQueryRetryReason({
            errors: [ { message: 'unrelated' }, { message: 'PersistedQueryNotFound' } ]
        }),
        'not-found'
    );
});

test('detectPersistedQueryRetryReason returns undefined for a malformed response shape', function () {
    assert.strictEqual(detectPersistedQueryRetryReason({ errors: 'not-an-array' }), undefined);
});
