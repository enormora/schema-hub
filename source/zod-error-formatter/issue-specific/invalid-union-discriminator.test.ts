import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { formatInvalidUnionDiscriminatorIssueMessage } from './invalid-union-discriminator.js';

test('formats an invalid union discriminator issue correctly with string options', () => {
    const message = formatInvalidUnionDiscriminatorIssueMessage({
        code: 'invalid_union_discriminator',
        path: [],
        message: '',
        options: ['a', 'b', 'c']
    });
    assert.strictEqual(message, 'invalid discriminator value, expected one of "a", "b" or "c"');
});

test('formats an invalid union discriminator issue correctly with empty options', () => {
    const message = formatInvalidUnionDiscriminatorIssueMessage({
        code: 'invalid_union_discriminator',
        path: [],
        message: '',
        options: []
    });
    assert.strictEqual(message, 'invalid discriminator value, expected unknown');
});

test('formats an invalid union discriminator issue correctly with one option', () => {
    const message = formatInvalidUnionDiscriminatorIssueMessage({
        code: 'invalid_union_discriminator',
        path: [],
        message: '',
        options: ['a']
    });
    assert.strictEqual(message, 'invalid discriminator value, expected "a"');
});

test('formats an invalid union discriminator issue correctly with boolean option', () => {
    const message = formatInvalidUnionDiscriminatorIssueMessage({
        code: 'invalid_union_discriminator',
        path: [],
        message: '',
        options: [false]
    });
    assert.strictEqual(message, 'invalid discriminator value, expected false');
});

test('formats an invalid union discriminator issue correctly with number option', () => {
    const message = formatInvalidUnionDiscriminatorIssueMessage({
        code: 'invalid_union_discriminator',
        path: [],
        message: '',
        options: [1]
    });
    assert.strictEqual(message, 'invalid discriminator value, expected 1');
});

test('formats an invalid union discriminator issue correctly with undefined option', () => {
    const message = formatInvalidUnionDiscriminatorIssueMessage({
        code: 'invalid_union_discriminator',
        path: [],
        message: '',
        options: [undefined]
    });
    assert.strictEqual(message, 'invalid discriminator value, expected undefined');
});

test('formats an invalid union discriminator issue correctly with symbol without description option', () => {
    const message = formatInvalidUnionDiscriminatorIssueMessage({
        code: 'invalid_union_discriminator',
        path: [],
        message: '',
        // eslint-disable-next-line symbol-description -- no description because we want to actually test this case
        options: [Symbol()]
    });
    assert.strictEqual(message, 'invalid discriminator value, expected Symbol()');
});

test('formats an invalid union discriminator issue correctly with symbol with description option', () => {
    const message = formatInvalidUnionDiscriminatorIssueMessage({
        code: 'invalid_union_discriminator',
        path: [],
        message: '',
        options: [Symbol('foo')]
    });
    assert.strictEqual(message, 'invalid discriminator value, expected Symbol(foo)');
});
