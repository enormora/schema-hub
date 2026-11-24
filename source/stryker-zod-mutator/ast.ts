import {
    arrayExpression as buildArrayExpression,
    callExpression as buildCallExpression,
    cloneNode,
    identifier,
    isExpression,
    isIdentifier,
    isMemberExpression,
    isNumericLiteral,
    isObjectProperty,
    isProgram,
    isV8IntrinsicIdentifier,
    memberExpression,
    objectExpression as buildObjectExpression,
    valueToNode,
    type ArrayExpression as BabelArrayExpression,
    type CallExpression as BabelCallExpression,
    type Expression as BabelExpression,
    type Node as BabelNode,
    type ObjectExpression as BabelObjectExpression,
    type Program,
    type V8IntrinsicIdentifier
} from '@babel/types';

export type SchemaExpression = Exclude<BabelExpression, V8IntrinsicIdentifier>;
export type ArrayExpression = Readonly<BabelArrayExpression>;
export type CallExpression = Readonly<BabelCallExpression>;
export type ObjectExpression = Readonly<BabelObjectExpression>;
export type PropertyValueExpression = Readonly<BabelExpression>;

export type MutationPath = {
    readonly node: BabelNode;
    readonly parentPath: MutationPath | null;
};

export function isExpressionNode(node: BabelNode | null | undefined): node is SchemaExpression {
    return node !== null && node !== undefined && isExpression(node) && !isV8IntrinsicIdentifier(node);
}

export function cloneExpression<Expression extends SchemaExpression>(expression: Expression): Expression {
    return cloneNode(expression, true);
}

export function findProgram(path: MutationPath): Program | null {
    let current: MutationPath | null = path;

    while (current !== null) {
        if (isProgram(current.node)) {
            return current.node;
        }
        current = current.parentPath;
    }

    return null;
}

function readProperty(value: unknown, key: string): unknown {
    if (typeof value !== 'object' || value === null) {
        return undefined;
    }

    return Reflect.get(value, key) as unknown;
}

function hubFileName(path: MutationPath): string | null {
    const filename = readProperty(readProperty(readProperty(readProperty(path, 'hub'), 'file'), 'opts'), 'filename');

    return typeof filename === 'string' ? filename : null;
}

export function fileNameOf(path: MutationPath): string | null {
    const locationFileName = findProgram(path)?.loc?.filename;

    return hubFileName(path) ?? (typeof locationFileName === 'string' ? locationFileName : null);
}

export function callExpression(callee: SchemaExpression, args: readonly SchemaExpression[]): BabelCallExpression {
    return buildCallExpression(callee, Array.from(args));
}

export function memberCall(
    object: SchemaExpression,
    methodName: string,
    args: readonly SchemaExpression[]
): BabelCallExpression {
    return callExpression(memberExpression(object, identifier(methodName)), args);
}

export function replaceArrayItem(
    arrayExpression: ArrayExpression,
    indexToRemove: number
): BabelArrayExpression {
    return buildArrayExpression(arrayExpression.elements.filter(function (_element, index) {
        return index !== indexToRemove;
    }));
}

export function replaceObjectProperty(
    objectExpression: ObjectExpression,
    indexToReplace: number,
    value: PropertyValueExpression
): BabelObjectExpression {
    return buildObjectExpression(objectExpression.properties.map(function (property, index) {
        if (index !== indexToReplace || !isObjectProperty(property)) {
            return cloneNode(property, true);
        }

        const clone = cloneNode(property, true);
        clone.value = value;
        return clone;
    }));
}

export function removeObjectProperty(
    objectExpression: ObjectExpression,
    indexToRemove: number
): BabelObjectExpression {
    return buildObjectExpression(
        objectExpression
            .properties
            .filter(function (_property, index) {
                return index !== indexToRemove;
            })
            .map(function (property) {
                return cloneNode(property, true);
            })
    );
}

export function getMemberName(expression: BabelNode): string | null {
    if (!isMemberExpression(expression) || expression.computed || !isIdentifier(expression.property)) {
        return null;
    }

    return expression.property.name;
}

export function getCallName(callee: BabelNode): string | null {
    if (isIdentifier(callee)) {
        return callee.name;
    }

    return getMemberName(callee);
}

export function numericArgumentMutations(
    call: CallExpression,
    argumentIndex: number
): readonly BabelCallExpression[] {
    const argument = call.arguments[argumentIndex];

    if (!isNumericLiteral(argument)) {
        return [];
    }

    return [ -1, 1 ].map(function (offset) {
        const clone = cloneNode<BabelCallExpression>(call, true);
        clone.arguments[argumentIndex] = valueToNode(argument.value + offset);
        return clone;
    });
}
