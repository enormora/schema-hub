import * as babel from '@babel/types';
import type { Node as BabelNode } from '@babel/types';
import {
    cloneExpression,
    isExpressionNode,
    numericArgumentMutations,
    replaceArrayItem,
    type ArrayExpression,
    type CallExpression,
    type MutationPath,
    type SchemaExpression
} from './ast.ts';
import { callNode, createDefinition, type MutationDefinition } from './mutation-definition.ts';
import { removeMethod } from './schema-call-mutations.ts';
import {
    buildZodCall,
    expressionStyle,
    getZodCallName,
    replaceZodCallee,
    type ZodBindings
} from './zod-bindings.ts';

type FactoryReplacement = {
    readonly sourceName: string;
    readonly targetName: string;
    readonly mapArguments: (call: CallExpression) => readonly SchemaExpression[] | null;
};

function replaceFactory(
    path: MutationPath,
    bindings: ZodBindings,
    replacement: FactoryReplacement
): readonly BabelNode[] {
    const call = callNode(path);

    if (call === null || getZodCallName(bindings, call) !== replacement.sourceName) {
        return [];
    }

    const style = expressionStyle(bindings, call);
    const args = replacement.mapArguments(call);

    if (style === null || args === null) {
        return [];
    }

    const replacementCall = buildZodCall(bindings, style, replacement.targetName, args);

    return replacementCall === null ? [] : [ replacementCall ];
}

function tupleArray(call: CallExpression): babel.ArrayExpression | null {
    const argument = call.arguments[0];

    return babel.isArrayExpression(argument) ? argument : null;
}

function removeTupleItems(path: MutationPath, bindings: ZodBindings): readonly BabelNode[] {
    const call = callNode(path);

    if (call === null || getZodCallName(bindings, call) !== 'tuple') {
        return [];
    }

    const items = tupleArray(call);

    if (items === null) {
        return [];
    }

    return items.elements.flatMap(function (element, index) {
        if (!isExpressionNode(element)) {
            return [];
        }

        const clone = babel.cloneNode<babel.CallExpression>(call, true);
        clone.arguments[0] = replaceArrayItem(items, index);
        return [ clone ];
    });
}

function addTupleRest(path: MutationPath, bindings: ZodBindings): readonly BabelNode[] {
    const call = callNode(path);

    if (call === null || getZodCallName(bindings, call) !== 'tuple' || call.arguments.length > 1) {
        return [];
    }

    const items = tupleArray(call);
    const restSchema = items?.elements.find(isExpressionNode);

    if (restSchema === undefined) {
        return [];
    }

    const clone = babel.cloneNode<babel.CallExpression>(call, true);
    clone.arguments.push(cloneExpression(restSchema));
    return [ clone ];
}

function removeTupleRest(path: MutationPath, bindings: ZodBindings): readonly BabelNode[] {
    const call = callNode(path);

    if (call === null) {
        return [];
    }

    if (getZodCallName(bindings, call) !== 'tuple' || call.arguments.length <= 1) {
        return removeMethod(call, bindings, new Set([ 'rest' ]));
    }

    const clone = babel.cloneNode<babel.CallExpression>(call, true);
    clone.arguments = clone.arguments.slice(0, 1);
    return [ clone ];
}

function swapRecordFactory(path: MutationPath, bindings: ZodBindings): readonly BabelNode[] {
    const call = callNode(path);
    const currentName = call === null ? null : getZodCallName(bindings, call);

    if (call === null || currentName === null || ![ 'record', 'partialRecord', 'looseRecord' ].includes(currentName)) {
        return [];
    }

    return [ 'record', 'partialRecord', 'looseRecord' ]
        .filter(function (target) {
            return target !== currentName;
        })
        .flatMap(function (target) {
            return replaceZodCallee(bindings, call, target) ?? [];
        });
}

function removeArrayOptions(
    path: MutationPath,
    bindings: ZodBindings,
    callNames: ReadonlySet<string>,
    argumentIndex: number
): readonly BabelNode[] {
    const call = callNode(path);

    if (call === null || !callNames.has(getZodCallName(bindings, call) ?? '')) {
        return [];
    }

    const options = call.arguments[argumentIndex];

    if (!babel.isArrayExpression(options)) {
        return [];
    }

    return options.elements.flatMap(function (element, index) {
        if (!isExpressionNode(element)) {
            return [];
        }

        const clone = babel.cloneNode<babel.CallExpression>(call, true);
        clone.arguments[argumentIndex] = replaceArrayItem(options, index);
        return [ clone ];
    });
}

function mutateNumericLiteral(path: MutationPath, bindings: ZodBindings): readonly BabelNode[] {
    const call = callNode(path);

    if (call === null || getZodCallName(bindings, call) !== 'literal') {
        return [];
    }

    return numericArgumentMutations(call, 0);
}

function arrayItemArgument(call: CallExpression): readonly SchemaExpression[] | null {
    const item = call.arguments[0];

    return item !== undefined && isExpressionNode(item)
        ? [ babel.arrayExpression([ cloneExpression(item) ]) ]
        : null;
}

function hasSingleTupleItem(call: CallExpression, items: ArrayExpression | null): boolean {
    return items?.elements.length === 1 && call.arguments.length === 1;
}

function singleTupleItem(call: CallExpression): readonly SchemaExpression[] | null {
    const items = tupleArray(call);
    const item = items?.elements[0];

    if (!hasSingleTupleItem(call, items) || item === undefined || !isExpressionNode(item)) {
        return null;
    }

    return [ cloneExpression(item) ];
}

export const collectionMutationDefinitions: readonly MutationDefinition[] = [
    createDefinition('ZodArrayToTuple', function (path, bindings) {
        return replaceFactory(path, bindings, {
            sourceName: 'array',
            targetName: 'tuple',
            mapArguments: arrayItemArgument
        });
    }),
    createDefinition('ZodTupleToArray', function (path, bindings) {
        return replaceFactory(path, bindings, {
            sourceName: 'tuple',
            targetName: 'array',
            mapArguments: singleTupleItem
        });
    }),
    createDefinition('ZodTupleItemRemove', removeTupleItems),
    createDefinition('ZodTupleRestAdd', addTupleRest),
    createDefinition('ZodTupleRestRemove', removeTupleRest),
    createDefinition('ZodRecordFactorySwap', swapRecordFactory),
    createDefinition('ZodUnionOptionRemove', function (path, bindings) {
        return [
            ...removeArrayOptions(path, bindings, new Set([ 'union' ]), 0),
            ...removeArrayOptions(path, bindings, new Set([ 'discriminatedUnion' ]), 1)
        ];
    }),
    createDefinition('ZodEnumValueRemove', function (path, bindings) {
        return removeArrayOptions(path, bindings, new Set([ 'enum' ]), 0);
    }),
    createDefinition('ZodNumericLiteralChange', mutateNumericLiteral)
];
