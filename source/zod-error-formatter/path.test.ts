import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { formatPath, isNonEmptyPath } from './path.js';

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
