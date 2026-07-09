import assert from 'node:assert';
import {
    callExpression,
    identifier,
    memberExpression,
    stringLiteral
} from '@babel/types';
import { test } from '@sondr3/minitest';
import { readMutatorRegistryModule } from './registry.ts';
import {
    buildZodCall,
    expressionStyle,
    getZodCallName,
    getZodCallStyle,
    isZodSchemaExpression,
    replaceZodCallee,
    type ZodBindings
} from './zod-bindings.ts';

const emptyBindings: ZodBindings = { namespaces: [], directBindings: [] };
const classicBindings: ZodBindings = {
    namespaces: [ { name: 'z', style: 'classic' } ],
    directBindings: [ { localName: 'text', importedName: 'string', style: 'mini' } ]
};

test('exposes Zod binding fallbacks without mutating unknown calls', function () {
    const call = callExpression(identifier('schema'), []);
    const memberCall = callExpression(memberExpression(identifier('schema'), identifier('parse')), []);

    assert.strictEqual(getZodCallName(emptyBindings, call), null);
    assert.strictEqual(getZodCallStyle(emptyBindings, call), null);
    assert.strictEqual(isZodSchemaExpression(emptyBindings, call), false);
    assert.strictEqual(expressionStyle(emptyBindings, call), null);
    assert.strictEqual(expressionStyle(emptyBindings, identifier('schema')), null);
    assert.strictEqual(expressionStyle(emptyBindings, memberCall), null);
    assert.strictEqual(buildZodCall(emptyBindings, 'classic', 'string', []), null);
    assert.strictEqual(replaceZodCallee(emptyBindings, call, 'string'), null);
});

test('recognizes namespace, direct, computed, and coercion call styles', function () {
    const namespaceCall = callExpression(memberExpression(identifier('z'), identifier('string')), []);
    const directCall = callExpression(identifier('text'), []);
    const computedCall = callExpression(memberExpression(identifier('z'), stringLiteral('string'), true), []);
    const coerceCall = callExpression(
        memberExpression(memberExpression(identifier('z'), identifier('coerce')), identifier('number')),
        []
    );

    assert.strictEqual(getZodCallName(classicBindings, namespaceCall), 'string');
    assert.strictEqual(getZodCallStyle(classicBindings, namespaceCall), 'classic');
    assert.strictEqual(getZodCallName(classicBindings, directCall), 'string');
    assert.strictEqual(getZodCallStyle(classicBindings, directCall), 'mini');
    assert.strictEqual(getZodCallName(classicBindings, computedCall), null);
    assert.strictEqual(getZodCallName(classicBindings, coerceCall), 'number');
    assert.strictEqual(getZodCallStyle(classicBindings, coerceCall), 'classic');
    assert.strictEqual(isZodSchemaExpression(classicBindings, namespaceCall), true);
    assert.strictEqual(expressionStyle(classicBindings, namespaceCall), 'classic');
    assert.notStrictEqual(buildZodCall(classicBindings, 'classic', 'number', []), null);
    assert.notStrictEqual(replaceZodCallee(classicBindings, namespaceCall, 'number'), null);
});

test('rejects incompatible Stryker mutator registries', function () {
    assert.throws(function () {
        readMutatorRegistryModule(null);
    }, /could not find Stryker's mutable allMutators registry/u);
    assert.throws(function () {
        readMutatorRegistryModule({});
    }, /could not find Stryker's mutable allMutators registry/u);
    assert.throws(function () {
        readMutatorRegistryModule({ allMutators: {} });
    }, /could not find Stryker's mutable allMutators registry/u);
    assert.deepStrictEqual(Array.from(readMutatorRegistryModule({ allMutators: [] }).allMutators), []);
});
