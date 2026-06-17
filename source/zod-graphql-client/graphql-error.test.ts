import assert from 'node:assert';
import { test } from '@sondr3/minitest';
import { safeParse } from '../zod-error-formatter/formatter.ts';
import { graphqlErrorSchema } from './graphql-error.ts';

test('graphqlErrorSchema: validation fails when a non-object is given', function () {
    const result = safeParse(graphqlErrorSchema, '');
    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [ 'expected object, but got string' ]);
});

test('graphqlErrorSchema: validation fails when an empty object is given', function () {
    const result = safeParse(graphqlErrorSchema, {});
    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [ 'at message: missing property; expected string' ]);
});

test('graphqlErrorSchema: validation fails when message is not a string', function () {
    const result = safeParse(graphqlErrorSchema, { message: 1 });
    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [ 'at message: expected string, but got number' ]);
});

test('graphqlErrorSchema: validation fails when path is not an array', function () {
    const result = safeParse(graphqlErrorSchema, { message: '', path: true });
    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [ 'at path: expected array, but got boolean' ]);
});

test('graphqlErrorSchema: validation fails when a path item is not a string or number', function () {
    const result = safeParse(graphqlErrorSchema, { message: '', path: [ true ] });
    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'at path[0]: invalid value: expected one of string or number, but got boolean'
    ]);
});

test('graphqlErrorSchema: validation fails when locations is not an array', function () {
    const result = safeParse(graphqlErrorSchema, { message: '', locations: 'foo' });
    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [ 'at locations: expected array, but got string' ]);
});

test('graphqlErrorSchema: validation fails when a locations item is not an object', function () {
    const result = safeParse(graphqlErrorSchema, { message: '', locations: [ 'foo' ] });
    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [ 'at locations[0]: expected object, but got string' ]);
});

test('graphqlErrorSchema: validation fails when a locations item is an empty object', function () {
    const result = safeParse(graphqlErrorSchema, { message: '', locations: [ {} ] });
    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'at locations[0].line: missing property; expected number',
        'at locations[0].column: missing property; expected number'
    ]);
});

test('graphqlErrorSchema: validation fails when a locations item has an invalid column', function () {
    const result = safeParse(graphqlErrorSchema, { message: '', locations: [ { line: 1, column: 'two' } ] });
    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [ 'at locations[0].column: expected number, but got string' ]);
});

test('graphqlErrorSchema: validation fails when a locations item has a negative column', function () {
    const result = safeParse(graphqlErrorSchema, { message: '', locations: [ { line: 1, column: -1 } ] });
    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [ 'at locations[0].column: number must be greater than 0' ]);
});

test('graphqlErrorSchema: validation fails when a locations item has zero as column', function () {
    const result = safeParse(graphqlErrorSchema, { message: '', locations: [ { line: 1, column: 0 } ] });
    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [ 'at locations[0].column: number must be greater than 0' ]);
});

test('graphqlErrorSchema: validation fails when a locations item has a floating point number as column', function () {
    const result = safeParse(graphqlErrorSchema, { message: '', locations: [ { line: 1, column: 1.4 } ] });
    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [ 'at locations[0].column: expected int, but got number' ]);
});

test('graphqlErrorSchema: validation fails when a locations item has an invalid line', function () {
    const result = safeParse(graphqlErrorSchema, { message: '', locations: [ { line: 'one', column: 1 } ] });
    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [ 'at locations[0].line: expected number, but got string' ]);
});

test('graphqlErrorSchema: validation fails when a locations item has a negative line', function () {
    const result = safeParse(graphqlErrorSchema, { message: '', locations: [ { line: -1, column: 1 } ] });
    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [ 'at locations[0].line: number must be greater than 0' ]);
});

test('graphqlErrorSchema: validation fails when a locations item has zero as line', function () {
    const result = safeParse(graphqlErrorSchema, { message: '', locations: [ { line: 0, column: 1 } ] });
    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [ 'at locations[0].line: number must be greater than 0' ]);
});

test('graphqlErrorSchema: validation fails when a locations item has a floating point number as line', function () {
    const result = safeParse(graphqlErrorSchema, { message: '', locations: [ { line: 1.4, column: 1 } ] });
    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [ 'at locations[0].line: expected int, but got number' ]);
});

test('graphqlErrorSchema: validation fails when a locations item has additional properties', function () {
    const result = safeParse(graphqlErrorSchema, { message: '', locations: [ { line: 1, column: 1, foo: 'bar' } ] });
    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [ 'at locations[0]: unexpected additional property: "foo"' ]);
});

test('graphqlErrorSchema: validation fails when extensions is not an object', function () {
    const result = safeParse(graphqlErrorSchema, { message: '', extensions: 'foo' });
    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [ 'at extensions: expected record, but got string' ]);
});

test('graphqlErrorSchema: validation succeeds when locations is an empty array', function () {
    const result = safeParse(graphqlErrorSchema, { message: '', locations: [] });
    assert.strictEqual(result.success, true);
});

test('graphqlErrorSchema: validation succeeds when locations is missing', function () {
    const result = safeParse(graphqlErrorSchema, { message: '', path: [] });
    assert.strictEqual(result.success, true);
});

test('graphqlErrorSchema: validation succeeds when path is missing', function () {
    const result = safeParse(graphqlErrorSchema, { message: '', locations: [] });
    assert.strictEqual(result.success, true);
});

test('graphqlErrorSchema: validation succeeds when path contains numbers', function () {
    const result = safeParse(graphqlErrorSchema, { message: '', path: [ 1 ] });
    assert.strictEqual(result.success, true);
});

test('graphqlErrorSchema: validation succeeds when path contains strings', function () {
    const result = safeParse(graphqlErrorSchema, { message: '', path: [ 'a' ] });
    assert.strictEqual(result.success, true);
});

test('graphqlErrorSchema: validation succeeds when additional properties are given', function () {
    const result = safeParse(graphqlErrorSchema, { message: '', foo: 'bar' });
    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.data, { message: '' });
});

test('graphqlErrorSchema: validation succeeds when extensions is an empty object', function () {
    const result = safeParse(graphqlErrorSchema, { message: '', extensions: {} });
    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.data, { message: '', extensions: {} });
});

test('graphqlErrorSchema: validation succeeds and preserves arbitrary extension values', function () {
    const result = safeParse(graphqlErrorSchema, {
        message: '',
        extensions: { code: 'BAD_USER_INPUT', details: { field: 'email' }, count: 3 }
    });
    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.data, {
        message: '',
        extensions: { code: 'BAD_USER_INPUT', details: { field: 'email' }, count: 3 }
    });
});

test('graphqlErrorSchema: validation succeeds when a full error is given', function () {
    const result = safeParse(graphqlErrorSchema, {
        message: 'the-message',
        foo: 'bar',
        path: [ 'a', 'b', 1 ],
        locations: [ { column: 1, line: 2 }, { line: 3, column: 4 } ],
        extensions: { code: 'INTERNAL_ERROR' }
    });
    assert.strictEqual(result.success, true);
});
