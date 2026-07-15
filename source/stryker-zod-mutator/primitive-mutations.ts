import type { Node as BabelNode } from '@babel/types';
import { callNode, createDefinition, type MutationDefinition } from './mutation-definition.ts';
import {
    getZodCallName,
    isCoerceCall,
    isRecordKeyPosition,
    primitiveFactoryNames,
    replaceZodCallee,
    type ZodBindings
} from './zod-bindings.ts';
import type { MutationPath } from './ast.ts';

const primitiveFactoryNameSet = new Set<string>(primitiveFactoryNames);

const runtimeEquivalentFactories = new Map<string, ReadonlySet<string>>([
    [ 'any', new Set([ 'unknown' ]) ],
    [ 'unknown', new Set([ 'any' ]) ],
    [ 'void', new Set([ 'undefined' ]) ],
    [ 'undefined', new Set([ 'void' ]) ]
]);

function isPrimitiveFactoryCall(callName: string | null): callName is string {
    return callName !== null && primitiveFactoryNameSet.has(callName);
}

function isRuntimeEquivalentSwap(sourceName: string, targetName: string): boolean {
    return runtimeEquivalentFactories.get(sourceName)?.has(targetName) ?? false;
}

const acceptsAnyKeyFactoryNames = new Set([ 'any', 'unknown' ]);

function isStringRecordKey(path: MutationPath, bindings: ZodBindings, callName: string): boolean {
    return callName === 'string' && isRecordKeyPosition(path, bindings);
}

function mutatePrimitiveFactory(path: MutationPath, bindings: ZodBindings): readonly BabelNode[] {
    const call = callNode(path);
    const callName = call === null ? null : getZodCallName(bindings, call);

    if (
        call === null ||
        call.arguments.length > 0 ||
        isCoerceCall(bindings, call) ||
        !isPrimitiveFactoryCall(callName)
    ) {
        return [];
    }

    const skipAcceptsAnyKey = isStringRecordKey(path, bindings, callName);

    return primitiveFactoryNames
        .filter(function (target) {
            const wouldNotChangeStringKey = skipAcceptsAnyKey && acceptsAnyKeyFactoryNames.has(target);

            return target !== callName && !isRuntimeEquivalentSwap(callName, target) && !wouldNotChangeStringKey;
        })
        .flatMap(function (target) {
            return replaceZodCallee(bindings, call, target) ?? [];
        });
}

export const primitiveMutationDefinitions: readonly MutationDefinition[] = [
    createDefinition('ZodPrimitiveFactorySwap', mutatePrimitiveFactory)
];
