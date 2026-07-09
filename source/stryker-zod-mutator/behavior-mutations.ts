import * as babel from '@babel/types';
import type { Node as BabelNode } from '@babel/types';
import { getMemberName, type CallExpression, type MutationPath } from './ast.ts';
import { callNode, createDefinition, type MutationDefinition } from './mutation-definition.ts';
import { removeMethod, removeMethodOrWrapper } from './schema-call-mutations.ts';
import {
    buildZodCall,
    expressionStyle,
    getZodCallName,
    isCoerceCall,
    type ZodBindings
} from './zod-bindings.ts';

const removeFallbackNames = new Set([ 'default', '_default', 'prefault', 'catch' ]);
const removeCustomBehaviorNames = new Set([ 'refine', 'superRefine', 'transform', 'pipe', 'custom' ]);

function removeFallback(path: MutationPath, bindings: ZodBindings): readonly BabelNode[] {
    return removeMethodOrWrapper(path, bindings, removeFallbackNames);
}

function removeChecksFromCheckCall(
    call: CallExpression,
    bindings: ZodBindings,
    names: ReadonlySet<string>
): readonly BabelNode[] {
    if (!babel.isMemberExpression(call.callee) || getMemberName(call.callee) !== 'check') {
        return [];
    }

    return call.arguments.flatMap(function (argument, index) {
        if (
            !babel.isCallExpression(argument) ||
            !names.has(getZodCallName(bindings, argument) ?? '')
        ) {
            return [];
        }

        const clone = babel.cloneNode<babel.CallExpression>(call, true);
        clone.arguments = clone.arguments.filter(function (_check, checkIndex) {
            return checkIndex !== index;
        });
        return [ clone ];
    });
}

function removeCustomBehavior(path: MutationPath, bindings: ZodBindings): readonly BabelNode[] {
    const call = callNode(path);

    if (call === null) {
        return [];
    }

    return [
        ...removeMethod(call, bindings, removeCustomBehaviorNames),
        ...removeChecksFromCheckCall(call, bindings, removeCustomBehaviorNames)
    ];
}

function coerceTargetName(call: CallExpression | null): string | null {
    return call !== null && babel.isMemberExpression(call.callee)
        ? getMemberName(call.callee)
        : null;
}

type CoercionMutationTarget = {
    readonly name: string;
    readonly style: 'classic' | 'mini';
};

function readCoercionMutationTarget(path: MutationPath, bindings: ZodBindings): CoercionMutationTarget | null {
    const call = callNode(path);
    const targetName = coerceTargetName(call);
    const style = call === null ? null : expressionStyle(bindings, call);

    if (call === null || targetName === null || style === null || !isCoerceCall(bindings, call)) {
        return null;
    }

    return { name: targetName, style };
}

function removeCoercion(path: MutationPath, bindings: ZodBindings): readonly BabelNode[] {
    const target = readCoercionMutationTarget(path, bindings);

    if (target === null) {
        return [];
    }

    const replacement = buildZodCall(bindings, target.style, target.name, []);

    return replacement === null ? [] : [ replacement ];
}

export const behaviorMutationDefinitions: readonly MutationDefinition[] = [
    createDefinition('ZodFallbackRemove', removeFallback),
    createDefinition('ZodCustomBehaviorRemove', removeCustomBehavior),
    createDefinition('ZodCoercionRemove', removeCoercion)
];
