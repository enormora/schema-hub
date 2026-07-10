import * as babel from '@babel/types';
import type { Node as BabelNode } from '@babel/types';
import {
    cloneExpression,
    isExpressionNode,
    memberCall,
    removeObjectProperty,
    replaceObjectProperty,
    type MutationPath,
    type ObjectExpression,
    type SchemaExpression
} from './ast.ts';
import { callNode, createDefinition, type MutationDefinition } from './mutation-definition.ts';
import {
    buildZodCall,
    expressionStyle,
    getZodCallName,
    isObjectLikeFactory,
    isZodSchemaExpression,
    replaceZodCallee,
    type ZodApiStyle,
    type ZodBindings
} from './zod-bindings.ts';
import { removeMethodOrWrapper } from './schema-call-mutations.ts';

function mutateObjectFactory(path: MutationPath, bindings: ZodBindings): readonly BabelNode[] {
    const call = callNode(path);
    const callName = call === null ? null : getZodCallName(bindings, call);

    if (call === null || callName === null || !isObjectLikeFactory(callName)) {
        return [];
    }

    return [ 'object', 'strictObject', 'looseObject' ]
        .filter(function (replacement) {
            return replacement !== callName;
        })
        .flatMap(function (replacement) {
            return replaceZodCallee(bindings, call, replacement) ?? [];
        });
}

function mutateObjectFields(
    path: MutationPath,
    bindings: ZodBindings,
    fieldMutation: (objectExpression: ObjectExpression, index: number) => ObjectExpression | null
): readonly BabelNode[] {
    const call = callNode(path);

    if (call === null || !isObjectLikeFactory(getZodCallName(bindings, call) ?? '')) {
        return [];
    }

    const shape = call.arguments[0];

    if (!babel.isObjectExpression(shape)) {
        return [];
    }

    return shape.properties.flatMap(function (property, index) {
        if (!babel.isObjectProperty(property)) {
            return [];
        }

        const mutatedShape = fieldMutation(shape, index);

        if (mutatedShape === null) {
            return [];
        }

        const clone = babel.cloneNode<babel.CallExpression>(call, true);
        clone.arguments[0] = mutatedShape;
        return [ clone ];
    });
}

function buildFieldWrapper(
    bindings: ZodBindings,
    value: SchemaExpression,
    style: ZodApiStyle,
    wrapperName: string
): babel.CallExpression | null {
    return style === 'classic'
        ? memberCall(cloneExpression(value), wrapperName, [])
        : buildZodCall(bindings, style, wrapperName, [ cloneExpression(value) ]);
}

function objectFieldValue(objectExpression: ObjectExpression, index: number): SchemaExpression | null {
    const property = objectExpression.properties[index];

    return babel.isObjectProperty(property) && isExpressionNode(property.value)
        ? property.value
        : null;
}

function wrapObjectField(
    bindings: ZodBindings,
    objectExpression: ObjectExpression,
    index: number,
    wrapperName: string
): ObjectExpression | null {
    const value = objectFieldValue(objectExpression, index);
    const style = value === null ? null : expressionStyle(bindings, value);

    if (value === null || style === null || !isZodSchemaExpression(bindings, value)) {
        return null;
    }

    const wrapper = buildFieldWrapper(bindings, value, style, wrapperName);

    return wrapper === null ? null : replaceObjectProperty(objectExpression, index, wrapper);
}

function addObjectPolicy(path: MutationPath, bindings: ZodBindings): readonly BabelNode[] {
    const expression = isExpressionNode(path.node) ? path.node : null;

    if (
        expression === null ||
        expressionStyle(bindings, expression) !== 'classic' ||
        !isZodSchemaExpression(bindings, expression)
    ) {
        return [];
    }

    return [ 'strict', 'passthrough', 'strip' ].map(function (name) {
        return memberCall(cloneExpression(expression), name, []);
    });
}

export const objectMutationDefinitions: readonly MutationDefinition[] = [
    createDefinition('ZodObjectPolicyAdd', addObjectPolicy),
    createDefinition('ZodObjectPolicyRemove', function (path, bindings) {
        return removeMethodOrWrapper(path, bindings, new Set([ 'strict', 'passthrough', 'strip' ]));
    }),
    createDefinition('ZodObjectFactorySwap', mutateObjectFactory),
    createDefinition('ZodObjectCatchallRemove', function (path, bindings) {
        return removeMethodOrWrapper(path, bindings, new Set([ 'catchall' ]));
    }),
    createDefinition('ZodObjectFieldRemove', function (path, bindings) {
        return mutateObjectFields(path, bindings, removeObjectProperty);
    }),
    createDefinition('ZodObjectFieldOptionalAdd', function (path, bindings) {
        return mutateObjectFields(path, bindings, function (objectExpression, index) {
            return wrapObjectField(bindings, objectExpression, index, 'optional');
        });
    }),
    createDefinition('ZodObjectFieldNullableAdd', function (path, bindings) {
        return mutateObjectFields(path, bindings, function (objectExpression, index) {
            return wrapObjectField(bindings, objectExpression, index, 'nullable');
        });
    })
];
