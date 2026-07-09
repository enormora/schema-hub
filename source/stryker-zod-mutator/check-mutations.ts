import * as babel from '@babel/types';
import type { Node as BabelNode } from '@babel/types';
import {
    getMemberName,
    numericArgumentMutations,
    type CallExpression,
    type MutationPath
} from './ast.ts';
import { callNode, createDefinition, type MutationDefinition } from './mutation-definition.ts';
import { removeMethod } from './schema-call-mutations.ts';
import {
    buildZodCall,
    expressionStyle,
    getZodCallName,
    type ZodBindings
} from './zod-bindings.ts';

const stringCheckNames = new Set([ 'min', 'max', 'length', 'nonempty', 'regex', 'includes', 'startsWith', 'endsWith' ]);
const stringMiniCheckNames = new Set([
    'minLength',
    'maxLength',
    'length',
    'regex',
    'includes',
    'startsWith',
    'endsWith'
]);
const numberCheckNames = new Set([
    'min',
    'max',
    'gt',
    'gte',
    'lt',
    'lte',
    'positive',
    'nonnegative',
    'negative',
    'nonpositive',
    'multipleOf',
    'int'
]);
const numberMiniCheckNames = new Set([ 'minimum', 'maximum', 'gt', 'gte', 'lt', 'lte', 'multipleOf' ]);
const collectionCheckNames = new Set([ 'min', 'max', 'length', 'nonempty', 'size' ]);
const collectionMiniCheckNames = new Set([ 'minSize', 'maxSize', 'size', 'minLength', 'maxLength', 'length' ]);
const stringFormatFactoryNames = new Set([
    'email',
    'url',
    'uuid',
    'ulid',
    'cuid',
    'cuid2',
    'nanoid',
    'emoji',
    'ipv4',
    'ipv6'
]);
const strictnessSwaps = new Map([
    [ 'gt', 'gte' ],
    [ 'gte', 'gt' ],
    [ 'lt', 'lte' ],
    [ 'lte', 'lt' ],
    [ 'positive', 'nonnegative' ],
    [ 'nonnegative', 'positive' ],
    [ 'negative', 'nonpositive' ],
    [ 'nonpositive', 'negative' ]
]);

function removeChecksFromCheckCall(
    call: CallExpression,
    bindings: ZodBindings,
    names: ReadonlySet<string>
): readonly BabelNode[] {
    if (!babel.isMemberExpression(call.callee) || getMemberName(call.callee) !== 'check') {
        return [];
    }

    return call.arguments.flatMap(function (argument, index) {
        if (!babel.isCallExpression(argument) || !names.has(getZodCallName(bindings, argument) ?? '')) {
            return [];
        }

        const clone = babel.cloneNode<babel.CallExpression>(call, true);
        clone.arguments = clone.arguments.filter(function (_check, checkIndex) {
            return checkIndex !== index;
        });
        return [ clone ];
    });
}

function mutateCheckCallBoundaries(
    call: CallExpression,
    bindings: ZodBindings,
    names: ReadonlySet<string>
): readonly BabelNode[] {
    if (!babel.isMemberExpression(call.callee) || getMemberName(call.callee) !== 'check') {
        return [];
    }

    return call.arguments.flatMap(function (argument, index) {
        if (!babel.isCallExpression(argument) || !names.has(getZodCallName(bindings, argument) ?? '')) {
            return [];
        }

        return numericArgumentMutations(argument, 0).map(function (mutatedCheck) {
            const clone = babel.cloneNode<babel.CallExpression>(call, true);
            clone.arguments[index] = mutatedCheck;
            return clone;
        });
    });
}

function removeSchemaMethodChecks(
    path: MutationPath,
    bindings: ZodBindings,
    methodNames: ReadonlySet<string>,
    miniNames: ReadonlySet<string>
): readonly BabelNode[] {
    const call = callNode(path);

    if (call === null) {
        return [];
    }

    return [
        ...removeMethod(call, bindings, methodNames),
        ...removeChecksFromCheckCall(call, bindings, miniNames)
    ];
}

function mutateSchemaBoundaries(
    path: MutationPath,
    bindings: ZodBindings,
    methodNames: ReadonlySet<string>,
    miniNames: ReadonlySet<string>
): readonly BabelNode[] {
    const call = callNode(path);

    if (call === null) {
        return [];
    }

    if (babel.isMemberExpression(call.callee) && methodNames.has(getMemberName(call.callee) ?? '')) {
        return numericArgumentMutations(call, 0);
    }

    return mutateCheckCallBoundaries(call, bindings, miniNames);
}

function memberCallName(call: CallExpression | null): string | null {
    return call !== null && babel.isMemberExpression(call.callee)
        ? getMemberName(call.callee)
        : null;
}

function swapStrictness(path: MutationPath): readonly BabelNode[] {
    const call = callNode(path);
    const methodName = memberCallName(call);
    const replacement = strictnessSwaps.get(methodName ?? '');

    if (call === null || replacement === undefined || !babel.isMemberExpression(call.callee)) {
        return [];
    }

    const clone = babel.cloneNode<babel.CallExpression>(call, true);
    clone.callee = babel.memberExpression(call.callee.object, babel.identifier(replacement));
    return [ clone ];
}

function stringFormatReplacementStyle(path: MutationPath, bindings: ZodBindings): 'classic' | 'mini' | null {
    const call = callNode(path);
    const callName = call === null ? null : getZodCallName(bindings, call);

    if (call === null || callName === null || !stringFormatFactoryNames.has(callName)) {
        return null;
    }

    return expressionStyle(bindings, call);
}

function replaceStringFormat(path: MutationPath, bindings: ZodBindings): readonly BabelNode[] {
    const style = stringFormatReplacementStyle(path, bindings);

    if (style === null) {
        return [];
    }

    const replacement = buildZodCall(bindings, style, 'string', []);

    return replacement === null ? [] : [ replacement ];
}

export const checkMutationDefinitions: readonly MutationDefinition[] = [
    createDefinition('ZodStringCheckRemove', function (path, bindings) {
        return removeSchemaMethodChecks(path, bindings, stringCheckNames, stringMiniCheckNames);
    }),
    createDefinition('ZodStringBoundaryChange', function (path, bindings) {
        return mutateSchemaBoundaries(path, bindings, stringCheckNames, stringMiniCheckNames);
    }),
    createDefinition('ZodStringFormatToString', replaceStringFormat),
    createDefinition('ZodNumberCheckRemove', function (path, bindings) {
        return removeSchemaMethodChecks(path, bindings, numberCheckNames, numberMiniCheckNames);
    }),
    createDefinition('ZodNumberBoundaryChange', function (path, bindings) {
        return mutateSchemaBoundaries(path, bindings, numberCheckNames, numberMiniCheckNames);
    }),
    createDefinition('ZodNumberStrictnessSwap', swapStrictness),
    createDefinition('ZodCollectionCheckRemove', function (path, bindings) {
        return removeSchemaMethodChecks(path, bindings, collectionCheckNames, collectionMiniCheckNames);
    }),
    createDefinition('ZodCollectionBoundaryChange', function (path, bindings) {
        return mutateSchemaBoundaries(path, bindings, collectionCheckNames, collectionMiniCheckNames);
    })
];
