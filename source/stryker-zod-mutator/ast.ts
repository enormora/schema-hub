import * as babel from '@babel/types';
import type { Node as BabelNode } from '@babel/types';

export type SchemaExpression = Exclude<babel.Expression, babel.V8IntrinsicIdentifier>;
export type ArrayExpression = Readonly<babel.ArrayExpression>;
export type CallExpression = Readonly<babel.CallExpression>;
export type ObjectExpression = Readonly<babel.ObjectExpression>;
export type PropertyValueExpression = Readonly<babel.Expression>;

export type MutationPath = {
    readonly node: BabelNode;
    readonly parentPath: MutationPath | null;
};

export function isExpressionNode(node: BabelNode | null | undefined): node is SchemaExpression {
    return node !== null && node !== undefined && babel.isExpression(node) && !babel.isV8IntrinsicIdentifier(node);
}

export function cloneExpression<Expression extends SchemaExpression>(expression: Expression): Expression {
    return babel.cloneNode(expression, true);
}

export function findProgram(path: MutationPath): babel.Program | null {
    let current: MutationPath | null = path;

    while (current !== null) {
        if (babel.isProgram(current.node)) {
            return current.node;
        }
        current = current.parentPath;
    }

    return null;
}

export function namedIdentifier(name: string): babel.Identifier {
    return babel.identifier(name);
}

export function callExpression(callee: SchemaExpression, args: readonly SchemaExpression[]): babel.CallExpression {
    return babel.callExpression(callee, Array.from(args));
}

export function memberCall(
    object: SchemaExpression,
    methodName: string,
    args: readonly SchemaExpression[]
): babel.CallExpression {
    return callExpression(babel.memberExpression(object, namedIdentifier(methodName)), args);
}

export function replaceArrayItem(
    arrayExpression: ArrayExpression,
    indexToRemove: number
): babel.ArrayExpression {
    return babel.arrayExpression(arrayExpression.elements.filter(function (_element, index) {
        return index !== indexToRemove;
    }));
}

export function replaceObjectProperty(
    objectExpression: ObjectExpression,
    indexToReplace: number,
    value: PropertyValueExpression
): babel.ObjectExpression {
    return babel.objectExpression(objectExpression.properties.map(function (property, index) {
        if (index !== indexToReplace || !babel.isObjectProperty(property)) {
            return babel.cloneNode(property, true);
        }

        const clone = babel.cloneNode(property, true);
        clone.value = value;
        return clone;
    }));
}

export function removeObjectProperty(
    objectExpression: ObjectExpression,
    indexToRemove: number
): babel.ObjectExpression {
    return babel.objectExpression(
        objectExpression
            .properties
            .filter(function (_property, index) {
                return index !== indexToRemove;
            })
            .map(function (property) {
                return babel.cloneNode(property, true);
            })
    );
}

export function getMemberName(expression: BabelNode): string | null {
    if (!babel.isMemberExpression(expression) || expression.computed || !babel.isIdentifier(expression.property)) {
        return null;
    }

    return expression.property.name;
}

export function getCallName(callee: BabelNode): string | null {
    if (babel.isIdentifier(callee)) {
        return callee.name;
    }

    return getMemberName(callee);
}

export function numericArgumentMutations(
    call: CallExpression,
    argumentIndex: number
): readonly babel.CallExpression[] {
    const argument = call.arguments[argumentIndex];

    if (!babel.isNumericLiteral(argument)) {
        return [];
    }

    return [ -1, 1 ].map(function (offset) {
        const clone = babel.cloneNode<babel.CallExpression>(call, true);
        clone.arguments[argumentIndex] = babel.numericLiteral(argument.value + offset);
        return clone;
    });
}
