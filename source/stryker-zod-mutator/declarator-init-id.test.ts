import assert from 'node:assert';
import { test } from '@sondr3/minitest';
import { identifier, objectPattern, stringLiteral, variableDeclarator, type Node as BabelNode } from '@babel/types';
import { declaratorInitId } from './declarator-init-id.ts';
import type { MutationPath } from './ast.ts';

function pathFor(node: BabelNode): MutationPath {
    return { node, parentPath: null };
}

test('returns null when there is no declarator path', function () {
    assert.strictEqual(declaratorInitId(null, identifier('schema')), null);
});

test('returns null when the path node is not a variable declarator', function () {
    assert.strictEqual(declaratorInitId(pathFor(identifier('schema')), identifier('schema')), null);
});

test('returns null when the declarator has no expression initializer', function () {
    const id = identifier('schema');
    const declarator = variableDeclarator(id, null);

    assert.strictEqual(declaratorInitId(pathFor(declarator), id), null);
});

test('returns null when the given node is not the declarator initializer', function () {
    const initializer = stringLiteral('value');
    const declarator = variableDeclarator(identifier('schema'), initializer);

    assert.strictEqual(declaratorInitId(pathFor(declarator), stringLiteral('other')), null);
});

test('returns null when the binding is not a plain identifier', function () {
    const initializer = stringLiteral('value');
    const declarator = variableDeclarator(objectPattern([]), initializer);

    assert.strictEqual(declaratorInitId(pathFor(declarator), initializer), null);
});

test('returns the binding identifier when the node is the declarator initializer', function () {
    const id = identifier('schema');
    const initializer = stringLiteral('value');
    const declarator = variableDeclarator(id, initializer);

    assert.strictEqual(declaratorInitId(pathFor(declarator), initializer), id);
});
