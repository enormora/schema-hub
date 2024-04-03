import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { ensureValidVariableCorrelations } from './variable-correlations.js';

test('throws when a variable is in the references but not in the definitions', () => {
    try {
        ensureValidVariableCorrelations({}, new Set(['$foo']));
        assert.fail('Expected ensureValidVariableCorrelations() to fail but it did not');
    } catch (error: unknown) {
        assert.strictEqual((error as Error).message, 'Referenced variable "$foo" is missing in variableDefinitions');
    }
});

test('throws only for the first reference that is not defined even when there are multiple', () => {
    try {
        ensureValidVariableCorrelations({}, new Set(['$foo', '$bar']));
        assert.fail('Expected ensureValidVariableCorrelations() to fail but it did not');
    } catch (error: unknown) {
        assert.strictEqual((error as Error).message, 'Referenced variable "$foo" is missing in variableDefinitions');
    }
});

test('throws when a variable is in the definitions but not in the references', () => {
    try {
        ensureValidVariableCorrelations({ $foo: 'bar' }, new Set());
        assert.fail('Expected ensureValidVariableCorrelations() to fail but it did not');
    } catch (error: unknown) {
        assert.strictEqual((error as Error).message, 'Variable definition for "$foo" is never referenced');
    }
});

test('throws only for the first variable definition that not referenced even when there are multiple', () => {
    try {
        ensureValidVariableCorrelations({ $foo: 'bar', $bar: 'baz' }, new Set());
        assert.fail('Expected ensureValidVariableCorrelations() to fail but it did not');
    } catch (error: unknown) {
        assert.strictEqual((error as Error).message, 'Variable definition for "$foo" is never referenced');
    }
});

test('throws only for the first reference that is not defined when there is also an unreferenced definition', () => {
    try {
        ensureValidVariableCorrelations({ $foo: 'bar' }, new Set(['$baz']));
        assert.fail('Expected ensureValidVariableCorrelations() to fail but it did not');
    } catch (error: unknown) {
        assert.strictEqual((error as Error).message, 'Referenced variable "$baz" is missing in variableDefinitions');
    }
});

test('doesn’t throw when all references are defined and no extraneous definitions exist', () => {
    assert.doesNotThrow(() => {
        ensureValidVariableCorrelations({ $foo: 'bar', $baz: 'Int!' }, new Set(['$foo', '$baz']));
    });
});
