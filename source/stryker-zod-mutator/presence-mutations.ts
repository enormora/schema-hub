import * as babel from '@babel/types';
import type { Node as BabelNode } from '@babel/types';
import {
    addWrapperOrMethod,
    removeMethodOrWrapper,
    replaceNullish
} from './schema-call-mutations.ts';
import { getMemberName, isExpressionNode, type CallExpression, type MutationPath } from './ast.ts';
import { createDefinition, type MutationDefinition } from './mutation-definition.ts';
import { getZodCallName, isSchemaValueChainRoot, type ZodBindings } from './zod-bindings.ts';
import {
    addingWrapperHasNoEffect,
    chainAppliesReadonly,
    producesFreezableValue
} from './binding-resolution.ts';

function addReadonlyToFreezableSchema(path: MutationPath, bindings: ZodBindings): readonly BabelNode[] {
    if (!isExpressionNode(path.node) || !isSchemaValueChainRoot(path, bindings)) {
        return [];
    }

    if (!producesFreezableValue(bindings, path.node) || chainAppliesReadonly(bindings, path.node)) {
        return [];
    }

    return addWrapperOrMethod(path, bindings, 'readonly');
}

function removeRedundantPresenceWrapper(
    path: MutationPath,
    bindings: ZodBindings,
    wrapperName: string
): readonly BabelNode[] {
    return removeMethodOrWrapper(path, bindings, new Set([ wrapperName ])).filter(function (inner) {
        return !(isExpressionNode(inner) && addingWrapperHasNoEffect(bindings, inner, wrapperName));
    });
}

type OutputRelation = 'none' | 'pipe' | 'readonly';

function lastArgument(call: CallExpression): BabelNode | null {
    return call.arguments.at(-1) ?? null;
}

function enclosingOutputRelation(child: BabelNode, parent: BabelNode, bindings: ZodBindings): OutputRelation {
    if (!babel.isCallExpression(parent) || lastArgument(parent) !== child) {
        return 'none';
    }

    const name = getZodCallName(bindings, parent) ?? getMemberName(parent.callee);

    if (name === 'readonly') {
        return 'readonly';
    }

    return name === 'pipe' ? 'pipe' : 'none';
}

function refrozenByEnclosingReadonly(path: MutationPath, bindings: ZodBindings): boolean {
    let current = path;

    for (;;) {
        const parent = current.parentPath;

        if (parent === null) {
            return false;
        }

        const relation = enclosingOutputRelation(current.node, parent.node, bindings);

        if (relation !== 'pipe') {
            return relation === 'readonly';
        }

        current = parent;
    }
}

function removeObservableReadonly(path: MutationPath, bindings: ZodBindings): readonly BabelNode[] {
    if (refrozenByEnclosingReadonly(path, bindings)) {
        return [];
    }

    return removeMethodOrWrapper(path, bindings, new Set([ 'readonly' ])).filter(function (inner) {
        return isExpressionNode(inner) && producesFreezableValue(bindings, inner);
    });
}

export const presenceMutationDefinitions: readonly MutationDefinition[] = [
    createDefinition('ZodOptionalAdd', function (path, bindings) {
        return addWrapperOrMethod(path, bindings, 'optional');
    }),
    createDefinition('ZodOptionalRemove', function (path, bindings) {
        return removeRedundantPresenceWrapper(path, bindings, 'optional');
    }),
    createDefinition('ZodNullableAdd', function (path, bindings) {
        return addWrapperOrMethod(path, bindings, 'nullable');
    }),
    createDefinition('ZodNullableRemove', function (path, bindings) {
        return removeRedundantPresenceWrapper(path, bindings, 'nullable');
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
    createDefinition('ZodReadonlyRemove', removeObservableReadonly)
];
