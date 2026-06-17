import assert from 'node:assert';
import { test } from '@sondr3/minitest';
import { parseGraphqlResponse } from './graphql-response.ts';

test('returns a failure result when the given response body is not an object', function () {
    const result = parseGraphqlResponse('foo');
    assert.deepStrictEqual(result, {
        success: false,
        errorDetails: {
            type: 'unknown',
            message: 'GraphQL server responded with an incorrect data structure'
        }
    });
});

test('returns a failure result when the errors property is not an array', function () {
    const result = parseGraphqlResponse({ errors: 'foo' });
    assert.deepStrictEqual(result, {
        success: false,
        errorDetails: {
            type: 'unknown',
            message: 'GraphQL server responded with an incorrect data structure'
        }
    });
});

test('returns a failure result when an errors item is invalid', function () {
    const result = parseGraphqlResponse({ errors: [ 'foo' ] });
    assert.deepStrictEqual(result, {
        success: false,
        errorDetails: {
            type: 'unknown',
            message: 'GraphQL server responded with an incorrect data structure'
        }
    });
});

test('returns a failure result with the structured errors when there is at least one error', function () {
    const result = parseGraphqlResponse({ errors: [ { message: 'foo', path: [ 'bar' ] } ] });
    assert.deepStrictEqual(result, {
        success: false,
        errorDetails: {
            type: 'graphql',
            message: 'GraphQL response contains errors',
            errors: [ { message: 'foo', path: [ 'bar' ] } ]
        }
    });
});

test('returns a failure result preserving extensions on each error', function () {
    const result = parseGraphqlResponse({
        errors: [ { message: 'forbidden', extensions: { code: 'FORBIDDEN', traceId: 'abc' } } ]
    });
    assert.deepStrictEqual(result, {
        success: false,
        errorDetails: {
            type: 'graphql',
            message: 'GraphQL response contains errors',
            errors: [ { message: 'forbidden', extensions: { code: 'FORBIDDEN', traceId: 'abc' } } ]
        }
    });
});

test('returns the data when there is an errors property but it is an empty array', function () {
    const result = parseGraphqlResponse({ errors: [], data: 'foo' });
    assert.deepStrictEqual(result, {
        success: true,
        data: 'foo'
    });
});

test('returns the data when there is no errors property', function () {
    const result = parseGraphqlResponse({ data: 'foo' });
    assert.deepStrictEqual(result, {
        success: true,
        data: 'foo'
    });
});

test('returns the data when there is no errors property but additional properties are given', function () {
    const result = parseGraphqlResponse({ data: 'foo', unknownExtra: 'property' });
    assert.deepStrictEqual(result, {
        success: true,
        data: 'foo'
    });
});
