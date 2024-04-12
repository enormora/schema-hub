import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { extractVariableDefinitions, extractVariableValues } from './variables.js';

test('extractVariableValues() returns an empty object when an empty object is given', () => {
    const result = extractVariableValues({});
    assert.deepStrictEqual(result, {});
});

test('extractVariableValues() returns a flat object with the variable values extracted', () => {
    const result = extractVariableValues({ foo: { type: '', value: 'bar' } });
    assert.deepStrictEqual(result, { foo: 'bar' });
});

test('extractVariableDefinitions() returns an empty object when an empty object is given', () => {
    const result = extractVariableDefinitions({});
    assert.deepStrictEqual(result, {});
});

test('extractVariableDefinitions() returns a flat object with the variable types extracted and a prefixed name', () => {
    const result = extractVariableDefinitions({ foo: { type: 'Foo!', value: '' } });
    assert.deepStrictEqual(result, { $foo: 'Foo!' });
});
