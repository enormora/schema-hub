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
const stringLengthLowerBoundNames = new Set([ 'min', 'minLength' ]);
const collectionLengthLowerBoundNames = new Set([ 'min', 'minSize', 'minLength' ]);
const noLengthLowerBoundNames: ReadonlySet<string> = new Set();

type CheckNames = {
    readonly methodNames: ReadonlySet<string>;
    readonly miniNames: ReadonlySet<string>;
    readonly lengthLowerBoundNames: ReadonlySet<string>;
};

const stringCheckConfig: CheckNames = {
    methodNames: stringCheckNames,
    miniNames: stringMiniCheckNames,
    lengthLowerBoundNames: stringLengthLowerBoundNames
};
const numberCheckConfig: CheckNames = {
    methodNames: numberCheckNames,
    miniNames: numberMiniCheckNames,
    lengthLowerBoundNames: noLengthLowerBoundNames
};
const collectionCheckConfig: CheckNames = {
    methodNames: collectionCheckNames,
    miniNames: collectionMiniCheckNames,
    lengthLowerBoundNames: collectionLengthLowerBoundNames
};

function numericArgumentValue(call: CallExpression): number | null {
    const argument = call.arguments[0];

    if (babel.isNumericLiteral(argument)) {
        return argument.value;
    }

    if (babel.isUnaryExpression(argument) && argument.operator === '-' && babel.isNumericLiteral(argument.argument)) {
        return -argument.argument.value;
    }

    return null;
}

function isVacuousLengthBound(
    name: string | null,
    call: CallExpression,
    lengthLowerBoundNames: ReadonlySet<string>
): boolean {
    const value = numericArgumentValue(call);

    return name !== null && value !== null && value <= 0 && lengthLowerBoundNames.has(name);
}

function meaningfulBoundaryMutants(
    mutants: readonly babel.CallExpression[],
    name: string | null,
    call: CallExpression,
    lengthLowerBoundNames: ReadonlySet<string>
): readonly babel.CallExpression[] {
    if (!isVacuousLengthBound(name, call, lengthLowerBoundNames)) {
        return mutants;
    }

    return mutants.filter(function (mutant) {
        return (numericArgumentValue(mutant) ?? 1) > 0;
    });
}

function removeChecksFromCheckCall(
    call: CallExpression,
    bindings: ZodBindings,
    names: ReadonlySet<string>,
    lengthLowerBoundNames: ReadonlySet<string>
): readonly BabelNode[] {
    if (!babel.isMemberExpression(call.callee) || getMemberName(call.callee) !== 'check') {
        return [];
    }

    return call.arguments.flatMap(function (argument, index) {
        if (
            !babel.isCallExpression(argument) ||
            !names.has(getZodCallName(bindings, argument) ?? '') ||
            isVacuousLengthBound(getZodCallName(bindings, argument), argument, lengthLowerBoundNames)
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

function mutateCheckCallBoundaries(
    call: CallExpression,
    bindings: ZodBindings,
    names: ReadonlySet<string>,
    lengthLowerBoundNames: ReadonlySet<string>
): readonly BabelNode[] {
    if (!babel.isMemberExpression(call.callee) || getMemberName(call.callee) !== 'check') {
        return [];
    }

    return call.arguments.flatMap(function (argument, index) {
        if (!babel.isCallExpression(argument) || !names.has(getZodCallName(bindings, argument) ?? '')) {
            return [];
        }

        const mutants = meaningfulBoundaryMutants(
            numericArgumentMutations(argument, 0),
            getZodCallName(bindings, argument),
            argument,
            lengthLowerBoundNames
        );

        return mutants.map(function (mutatedCheck) {
            const clone = babel.cloneNode<babel.CallExpression>(call, true);
            clone.arguments[index] = mutatedCheck;
            return clone;
        });
    });
}

function removeSchemaMethodChecks(path: MutationPath, bindings: ZodBindings, config: CheckNames): readonly BabelNode[] {
    const call = callNode(path);

    if (call === null) {
        return [];
    }

    const methodName = babel.isMemberExpression(call.callee) ? getMemberName(call.callee) : null;
    const methodRemovals = isVacuousLengthBound(methodName, call, config.lengthLowerBoundNames)
        ? []
        : removeMethod(call, bindings, config.methodNames);

    return [
        ...methodRemovals,
        ...removeChecksFromCheckCall(call, bindings, config.miniNames, config.lengthLowerBoundNames)
    ];
}

function mutateSchemaBoundaries(path: MutationPath, bindings: ZodBindings, config: CheckNames): readonly BabelNode[] {
    const call = callNode(path);

    if (call === null) {
        return [];
    }

    if (babel.isMemberExpression(call.callee) && config.methodNames.has(getMemberName(call.callee) ?? '')) {
        return meaningfulBoundaryMutants(
            numericArgumentMutations(call, 0),
            getMemberName(call.callee),
            call,
            config.lengthLowerBoundNames
        );
    }

    return mutateCheckCallBoundaries(call, bindings, config.miniNames, config.lengthLowerBoundNames);
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
        return removeSchemaMethodChecks(path, bindings, stringCheckConfig);
    }),
    createDefinition('ZodStringBoundaryChange', function (path, bindings) {
        return mutateSchemaBoundaries(path, bindings, stringCheckConfig);
    }),
    createDefinition('ZodStringFormatToString', replaceStringFormat),
    createDefinition('ZodNumberCheckRemove', function (path, bindings) {
        return removeSchemaMethodChecks(path, bindings, numberCheckConfig);
    }),
    createDefinition('ZodNumberBoundaryChange', function (path, bindings) {
        return mutateSchemaBoundaries(path, bindings, numberCheckConfig);
    }),
    createDefinition('ZodNumberStrictnessSwap', swapStrictness),
    createDefinition('ZodCollectionCheckRemove', function (path, bindings) {
        return removeSchemaMethodChecks(path, bindings, collectionCheckConfig);
    }),
    createDefinition('ZodCollectionBoundaryChange', function (path, bindings) {
        return mutateSchemaBoundaries(path, bindings, collectionCheckConfig);
    })
];
