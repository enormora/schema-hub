import type { Node as BabelNode } from '@babel/types';
import {
    addWrapperOrMethod,
    removeMethodOrWrapper,
    replaceNullish
} from './schema-call-mutations.ts';
import { isExpressionNode, type MutationPath } from './ast.ts';
import { createDefinition, type MutationDefinition } from './mutation-definition.ts';
import { producesFreezableValue, type ZodBindings } from './zod-bindings.ts';

function addReadonlyToFreezableSchema(path: MutationPath, bindings: ZodBindings): readonly BabelNode[] {
    if (!isExpressionNode(path.node) || !producesFreezableValue(bindings, path.node)) {
        return [];
    }

    return addWrapperOrMethod(path, bindings, 'readonly');
}

export const presenceMutationDefinitions: readonly MutationDefinition[] = [
    createDefinition('ZodOptionalAdd', function (path, bindings) {
        return addWrapperOrMethod(path, bindings, 'optional');
    }),
    createDefinition('ZodOptionalRemove', function (path, bindings) {
        return removeMethodOrWrapper(path, bindings, new Set([ 'optional' ]));
    }),
    createDefinition('ZodNullableAdd', function (path, bindings) {
        return addWrapperOrMethod(path, bindings, 'nullable');
    }),
    createDefinition('ZodNullableRemove', function (path, bindings) {
        return removeMethodOrWrapper(path, bindings, new Set([ 'nullable' ]));
    }),
    createDefinition('ZodNullishRemove', function (path, bindings) {
        return removeMethodOrWrapper(path, bindings, new Set([ 'nullish' ]));
    }),
    createDefinition('ZodNullishToNullable', function (path, bindings) {
        return replaceNullish(path, bindings, 'nullable');
    }),
    createDefinition('ZodNullishToOptional', function (path, bindings) {
        return replaceNullish(path, bindings, 'optional');
    }),
    createDefinition('ZodNonoptionalRemove', function (path, bindings) {
        return removeMethodOrWrapper(path, bindings, new Set([ 'nonoptional' ]));
    }),
    createDefinition('ZodReadonlyAdd', addReadonlyToFreezableSchema),
    createDefinition('ZodReadonlyRemove', function (path, bindings) {
        return removeMethodOrWrapper(path, bindings, new Set([ 'readonly' ]));
    })
];
