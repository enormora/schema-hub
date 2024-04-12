import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { parseGraphqlResponse } from './graphql-response.js';

test('returns a failure result when the given response body is not an object', () => {
    const result = parseGraphqlResponse('foo');
    assert.deepStrictEqual(result, {
        success: false,
        errorDetails: {
            type: 'unknown',
            message: 'GraphQL server responded with an incorrect data structure'
        }
    });
});

test('returns a failure result when the errors property is not an array', () => {
    const result = parseGraphqlResponse({ errors: 'foo' });
    assert.deepStrictEqual(result, {
        success: false,
        errorDetails: {
            type: 'unknown',
            message: 'GraphQL server responded with an incorrect data structure'
        }
    });
});

test('returns a failure result when an errors item is invalid', () => {
    const result = parseGraphqlResponse({ errors: ['foo'] });
    assert.deepStrictEqual(result, {
        success: false,
        errorDetails: {
            type: 'unknown',
            message: 'GraphQL server responded with an incorrect data structure'
        }
    });
});

test('returns a failure result with the formatted errors when there is at least one error', () => {
    const result = parseGraphqlResponse({ errors: [{ message: 'foo', path: ['bar'] }] });
    assert.deepStrictEqual(result, {
        success: false,
        errorDetails: {
            type: 'graphql',
            message: 'GraphQL response contains errors',
            errors: ['Error at bar - foo']
        }
    });
});

test('returns the data when there is an errors property but it is an empty array', () => {
    const result = parseGraphqlResponse({ errors: [], data: 'foo' });
    assert.deepStrictEqual(result, {
        success: true,
        data: 'foo'
    });
});

test('returns the data when there is no errors property', () => {
    const result = parseGraphqlResponse({ data: 'foo' });
    assert.deepStrictEqual(result, {
        success: true,
        data: 'foo'
    });
});

test('returns the data when there is no errors property but additional properties are given', () => {
    const result = parseGraphqlResponse({ data: 'foo', unknownExtra: 'property' });
    assert.deepStrictEqual(result, {
        success: true,
        data: 'foo'
    });
});
