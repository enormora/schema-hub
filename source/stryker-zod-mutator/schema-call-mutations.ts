import * as babel from '@babel/types';
import type { Node as BabelNode } from '@babel/types';
import {
    cloneExpression,
    getCallName,
    getMemberName,
    isExpressionNode,
    memberCall,
    type CallExpression,
    type MutationPath,
    type SchemaExpression
} from './ast.ts';
import { callNode } from './mutation-definition.ts';
import {
    addingWrapperHasNoEffect,
    buildZodCall,
    expressionStyle,
    firstExpressionArgument,
    getZodCallName,
    isSchemaValueChainRoot,
    isZodSchemaExpression,
    type ZodApiStyle,
    type ZodBindings
} from './zod-bindings.ts';

export function removeMethod(
    call: CallExpression,
    bindings: ZodBindings,
    methodNames: ReadonlySet<string>
): readonly BabelNode[] {
    if (!babel.isMemberExpression(call.callee)) {
        return [];
    }

    const methodName = getMemberName(call.callee);
    const { object } = call.callee;

    if (methodName === null || !methodNames.has(methodName) || !isExpressionNode(object)) {
        return [];
    }

    return isZodSchemaExpression(bindings, object) ? [ cloneExpression(object) ] : [];
}

function removeWrapper(
    call: CallExpression,
    bindings: ZodBindings,
    wrapperNames: ReadonlySet<string>
): readonly BabelNode[] {
    const callName = getZodCallName(bindings, call);
    const schema = firstExpressionArgument(call);

    if (callName === null || schema === null || !wrapperNames.has(callName)) {
        return [];
    }

    return isZodSchemaExpression(bindings, schema) ? [ cloneExpression(schema) ] : [];
}

export function removeMethodOrWrapper(
    path: MutationPath,
    bindings: ZodBindings,
    names: ReadonlySet<string>
): readonly BabelNode[] {
    const call = callNode(path);

    if (call === null) {
        return [];
    }

    return [ ...removeMethod(call, bindings, names), ...removeWrapper(call, bindings, names) ];
}

function zodSchemaExpression(path: MutationPath, bindings: ZodBindings): SchemaExpression | null {
    return isExpressionNode(path.node) && isZodSchemaExpression(bindings, path.node)
        ? path.node
        : null;
}

function buildWrapperMutation(
    bindings: ZodBindings,
    expression: SchemaExpression,
    style: ZodApiStyle,
    name: string
): readonly BabelNode[] {
    if (style === 'classic') {
        return [ memberCall(cloneExpression(expression), name, []) ];
    }

    const wrapped = buildZodCall(bindings, style, name, [ cloneExpression(expression) ]);

    return wrapped === null ? [] : [ wrapped ];
}

function wrapperAlreadyApplied(expression: SchemaExpression, name: string): boolean {
    return babel.isCallExpression(expression) && getCallName(expression.callee) === name;
}

function shouldSkipWrapping(
    path: MutationPath,
    bindings: ZodBindings,
    expression: SchemaExpression,
    name: string
): boolean {
    return !isSchemaValueChainRoot(path, bindings) ||
        wrapperAlreadyApplied(expression, name) ||
        addingWrapperHasNoEffect(bindings, expression, name);
}

export function addWrapperOrMethod(
    path: MutationPath,
    bindings: ZodBindings,
    name: string
): readonly BabelNode[] {
    const expression = zodSchemaExpression(path, bindings);
    const style = expression === null ? null : expressionStyle(bindings, expression);

    if (expression === null || style === null) {
        return [];
    }

    if (shouldSkipWrapping(path, bindings, expression, name)) {
        return [];
    }

    return buildWrapperMutation(bindings, expression, style, name);
}

function replaceNullishMethod(
    call: CallExpression,
    bindings: ZodBindings,
    replacementName: string
): readonly BabelNode[] {
    if (!babel.isMemberExpression(call.callee) || getMemberName(call.callee) !== 'nullish') {
        return [];
    }

    const { object } = call.callee;

    return isExpressionNode(object) && isZodSchemaExpression(bindings, object)
        ? [ memberCall(cloneExpression(object), replacementName, []) ]
        : [];
}

function replaceNullishWrapper(
    call: CallExpression,
    bindings: ZodBindings,
    replacementName: string
): readonly BabelNode[] {
    const schema = firstExpressionArgument(call);
    const style = expressionStyle(bindings, call);

    if (getZodCallName(bindings, call) !== 'nullish' || schema === null || style === null) {
        return [];
    }

    const replacement = buildZodCall(bindings, style, replacementName, [ cloneExpression(schema) ]);

    return replacement === null ? [] : [ replacement ];
}

export function replaceNullish(
    path: MutationPath,
    bindings: ZodBindings,
    replacementName: string
): readonly BabelNode[] {
    const call = callNode(path);

    if (call === null) {
        return [];
    }

    const methodMutations = replaceNullishMethod(call, bindings, replacementName);

    return methodMutations.length > 0
        ? methodMutations
        : replaceNullishWrapper(call, bindings, replacementName);
}
