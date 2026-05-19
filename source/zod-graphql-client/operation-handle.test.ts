import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { z } from 'zod/v4';
import { defineVariables } from './define-variables.js';
import { defineMutation, defineQuery, isOperationHandle } from './operation-handle.js';

const simpleSchema = z.strictObject({ foo: z.string() });

test('defineQuery() returns a recognizable operation handle of kind "query"', () => {
    const handle = defineQuery({ schema: simpleSchema });

    assert.strictEqual(isOperationHandle(handle), true);
    assert.strictEqual(handle.kind, 'query');
});

test('defineMutation() returns a recognizable operation handle of kind "mutation"', () => {
    const handle = defineMutation({ schema: simpleSchema });

    assert.strictEqual(isOperationHandle(handle), true);
    assert.strictEqual(handle.kind, 'mutation');
});

test('defineQuery() passes through operationName', () => {
    const handle = defineQuery({ schema: simpleSchema, operationName: 'GetFoo' });

    assert.strictEqual(handle.operationName, 'GetFoo');
});

test('defineQuery() accepts a variable map handle and stores it on the operation handle', () => {
    const vars = defineVariables({ bar: z.string() });
    const handle = defineQuery({ schema: simpleSchema, variables: vars });

    assert.strictEqual(handle.variables, vars);
});

test('defineQuery() works without variables and operationName', () => {
    const handle = defineQuery({ schema: simpleSchema });

    assert.strictEqual(handle.variables, undefined);
    assert.strictEqual(handle.operationName, undefined);
});

test('isOperationHandle() returns false for plain objects', () => {
    assert.strictEqual(isOperationHandle({ kind: 'query', schema: simpleSchema }), false);
});

test('isOperationHandle() returns false for null and primitives', () => {
    assert.strictEqual(isOperationHandle(null), false);
    assert.strictEqual(isOperationHandle('foo'), false);
    assert.strictEqual(isOperationHandle(undefined), false);
});
