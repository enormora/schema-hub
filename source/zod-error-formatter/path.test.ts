import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { findValueByPath, formatPath, isNonEmptyPath } from './path.js';

test('isNonEmptyPath() returns false for an empty array', () => {
    const result = isNonEmptyPath([]);
    assert.strictEqual(result, false);
});

test('isNonEmptyPath() returns true for an array with one item', () => {
    const result = isNonEmptyPath(['foo']);
    assert.strictEqual(result, true);
});

test('formatPath() returns only the path item when there is only one', () => {
    const formattedPath = formatPath(['foo']);
    assert.strictEqual(formattedPath, 'foo');
});

test('formatPath() combines two string items with a dot', () => {
    const formattedPath = formatPath(['foo', 'bar']);
    assert.strictEqual(formattedPath, 'foo.bar');
});

test('formatPath() combines two number items with bracket notation', () => {
    const formattedPath = formatPath([0, 1]);
    assert.strictEqual(formattedPath, '[0][1]');
});

test('formatPath() combines a string item with a number item correctly', () => {
    const formattedPath = formatPath(['foo', 1]);
    assert.strictEqual(formattedPath, 'foo[1]');
});

test('formatPath() combines a number item with a string item correctly', () => {
    const formattedPath = formatPath([0, 'foo']);
    assert.strictEqual(formattedPath, '[0].foo');
});

test('formatPath() combines long paths with multiple different item types correctly', () => {
    const formattedPath = formatPath(['foo', 1, 'bar', 0, 0, 'baz']);
    assert.strictEqual(formattedPath, 'foo[1].bar[0][0].baz');
});

test('findValueByPath() returns the given value when the path is empty', () => {
    const value = findValueByPath({ foo: 'bar' }, []);
    assert.deepStrictEqual(value, { found: true, value: { foo: 'bar' } });
});

test('findValueByPath() returns a not-found result when a primitive value is given with a non-empty path', () => {
    const value = findValueByPath('foo', ['bar']);
    assert.deepStrictEqual(value, { found: false });
});

test('findValueByPath() returns a not-found result when the path exists only on the prototype chain', () => {
    const value = findValueByPath({ foo: 'bar' }, ['toString']);
    assert.deepStrictEqual(value, { found: false });
});

test('findValueByPath() returns the value when the path exists on the prototype chain and on the object', () => {
    const value = findValueByPath({ foo: 'bar', toString: 'baz' }, ['toString']);
    assert.deepStrictEqual(value, { found: true, value: 'baz' });
});

test('findValueByPath() returns the value of a valid array path', () => {
    const value = findValueByPath(['a', 'b'], [1]);
    assert.deepStrictEqual(value, { found: true, value: 'b' });
});

test('findValueByPath() returns the value of a nested object path', () => {
    const value = findValueByPath({ foo: { bar: 'baz' } }, ['foo', 'bar']);
    assert.deepStrictEqual(value, { found: true, value: 'baz' });
});

test('findValueByPath() returns not-found result when a path couldn’t be resolved', () => {
    const value = findValueByPath({ foo: { notBar: 'baz' } }, ['foo', 'bar']);
    assert.deepStrictEqual(value, { found: false });
});

test('findValueByPath() returns the value when it is explicit undefined for a deep path', () => {
    const value = findValueByPath({ foo: { bar: undefined } }, ['foo', 'bar']);
    assert.deepStrictEqual(value, { found: true, value: undefined });
});

test('findValueByPath() returns the value of a nested mixed object/array path', () => {
    const value = findValueByPath({ foo: { bar: ['a', { baz: ['b'] }, 'c', 'd'] } }, ['foo', 'bar', 1, 'baz', 0]);
    assert.deepStrictEqual(value, { found: true, value: 'b' });
});
