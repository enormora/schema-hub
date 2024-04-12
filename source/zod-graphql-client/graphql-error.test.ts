import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { safeParse } from '../zod-error-formatter/formatter.js';
import { formatAllErrors, graphqlErrorSchema } from './graphql-error.js';

test('graphqlErrorSchema: validation fails when a non-object is given', () => {
    const result = safeParse(graphqlErrorSchema, '');
    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, ['expected object, but got string']);
});

test('graphqlErrorSchema: validation fails when an empty object is given', () => {
    const result = safeParse(graphqlErrorSchema, {});
    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, ['at message: missing property']);
});

test('graphqlErrorSchema: validation fails when message is not a string', () => {
    const result = safeParse(graphqlErrorSchema, { message: 1 });
    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, ['at message: expected string, but got number']);
});

test('graphqlErrorSchema: validation fails when path is not an array', () => {
    const result = safeParse(graphqlErrorSchema, { message: '', path: true });
    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, ['at path: expected array, but got boolean']);
});

test('graphqlErrorSchema: validation fails when a path item is not a string or number', () => {
    const result = safeParse(graphqlErrorSchema, { message: '', path: [true] });
    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'at path[0]: invalid value: expected one of string or number, but got boolean'
    ]);
});

test('graphqlErrorSchema: validation fails when locations is not an array', () => {
    const result = safeParse(graphqlErrorSchema, { message: '', locations: 'foo' });
    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, ['at locations: expected array, but got string']);
});

test('graphqlErrorSchema: validation fails when a locations item is not an object', () => {
    const result = safeParse(graphqlErrorSchema, { message: '', locations: ['foo'] });
    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, ['at locations[0]: expected object, but got string']);
});

test('graphqlErrorSchema: validation fails when a locations item is an empty object', () => {
    const result = safeParse(graphqlErrorSchema, { message: '', locations: [{}] });
    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, [
        'at locations[0].line: missing property',
        'at locations[0].column: missing property'
    ]);
});

test('graphqlErrorSchema: validation fails when a locations item has an invalid column', () => {
    const result = safeParse(graphqlErrorSchema, { message: '', locations: [{ line: 1, column: 'two' }] });
    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, ['at locations[0].column: expected number, but got string']);
});

test('graphqlErrorSchema: validation fails when a locations item has a negative column', () => {
    const result = safeParse(graphqlErrorSchema, { message: '', locations: [{ line: 1, column: -1 }] });
    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, ['at locations[0].column: number must be greater than 0']);
});

test('graphqlErrorSchema: validation fails when a locations item has zero as column', () => {
    const result = safeParse(graphqlErrorSchema, { message: '', locations: [{ line: 1, column: 0 }] });
    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, ['at locations[0].column: number must be greater than 0']);
});

test('graphqlErrorSchema: validation fails when a locations item has a floating point number as column', () => {
    const result = safeParse(graphqlErrorSchema, { message: '', locations: [{ line: 1, column: 1.4 }] });
    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, ['at locations[0].column: expected integer, but got float']);
});

test('graphqlErrorSchema: validation fails when a locations item has an invalid line', () => {
    const result = safeParse(graphqlErrorSchema, { message: '', locations: [{ line: 'one', column: 1 }] });
    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, ['at locations[0].line: expected number, but got string']);
});

test('graphqlErrorSchema: validation fails when a locations item has a negative line', () => {
    const result = safeParse(graphqlErrorSchema, { message: '', locations: [{ line: -1, column: 1 }] });
    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, ['at locations[0].line: number must be greater than 0']);
});

test('graphqlErrorSchema: validation fails when a locations item has zero as line', () => {
    const result = safeParse(graphqlErrorSchema, { message: '', locations: [{ line: 0, column: 1 }] });
    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, ['at locations[0].line: number must be greater than 0']);
});

test('graphqlErrorSchema: validation fails when a locations item has a floating point number as column', () => {
    const result = safeParse(graphqlErrorSchema, { message: '', locations: [{ line: 1.4, column: 1 }] });
    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, ['at locations[0].line: expected integer, but got float']);
});

test('graphqlErrorSchema: validation fails when a locations item has additional properties', () => {
    const result = safeParse(graphqlErrorSchema, { message: '', locations: [{ line: 1, column: 1, foo: 'bar' }] });
    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.error.issues, ['at locations[0]: unexpected additional property: "foo"']);
});

test('graphqlErrorSchema: validation succeeds when locations is an empty array', () => {
    const result = safeParse(graphqlErrorSchema, { message: '', locations: [] });
    assert.strictEqual(result.success, true);
});

test('graphqlErrorSchema: validation succeeds when locations is missing', () => {
    const result = safeParse(graphqlErrorSchema, { message: '', path: [] });
    assert.strictEqual(result.success, true);
});

test('graphqlErrorSchema: validation succeeds when path is missing', () => {
    const result = safeParse(graphqlErrorSchema, { message: '', locations: [] });
    assert.strictEqual(result.success, true);
});

test('graphqlErrorSchema: validation succeeds when path contains numbers', () => {
    const result = safeParse(graphqlErrorSchema, { message: '', path: [1] });
    assert.strictEqual(result.success, true);
});

test('graphqlErrorSchema: validation succeeds when path contains strings', () => {
    const result = safeParse(graphqlErrorSchema, { message: '', path: ['a'] });
    assert.strictEqual(result.success, true);
});

test('graphqlErrorSchema: validation succeeds when additional properties are given', () => {
    const result = safeParse(graphqlErrorSchema, { message: '', foo: 'bar' });
    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.data, { message: '' });
});

test('graphqlErrorSchema: validation succeeds when a full error is given', () => {
    const result = safeParse(graphqlErrorSchema, {
        message: 'the-message',
        foo: 'bar',
        path: ['a', 'b', 1],
        locations: [{ column: 1, line: 2 }, { line: 3, column: 4 }]
    });
    assert.strictEqual(result.success, true);
});

test('formatAllErrors(): formats errors without path and locations', () => {
    const formattedErrors = formatAllErrors([{ message: 'Foo' }]);
    assert.deepStrictEqual(formattedErrors, ['Foo']);
});

test('formatAllErrors(): formats errors without path and locations is empty', () => {
    const formattedErrors = formatAllErrors([{ message: 'Foo', locations: [] }]);
    assert.deepStrictEqual(formattedErrors, ['Foo']);
});

test('formatAllErrors(): formats errors with path but without locations', () => {
    const formattedErrors = formatAllErrors([{ message: 'Foo', path: ['bar'] }]);
    assert.deepStrictEqual(formattedErrors, ['Error at bar - Foo']);
});

test('formatAllErrors(): formats errors with locations but without path', () => {
    const formattedErrors = formatAllErrors([{ message: 'Foo', locations: [{ line: 1, column: 2 }] }]);
    assert.deepStrictEqual(formattedErrors, ['Error at 1:2 - Foo']);
});

test('formatAllErrors(): formats errors with path and locations', () => {
    const formattedErrors = formatAllErrors([{
        message: 'Foo',
        path: ['bar', 'baz'],
        locations: [{ line: 1, column: 2 }]
    }]);
    assert.deepStrictEqual(formattedErrors, ['Error at bar.baz:1:2 - Foo']);
});
