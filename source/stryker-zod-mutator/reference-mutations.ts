import {
    isArrayExpression,
    isCallExpression,
    isIdentifier,
    isObjectProperty,
    type Identifier,
    type Node as BabelNode
} from '@babel/types';
import type { MutationPath, SchemaExpression } from './ast.ts';
import { createDefinition, type MutationDefinition } from './mutation-definition.ts';
import {
    buildZodCall,
    getZodCallName,
    isObjectLikeFactory,
    moduleStyle,
    type ZodBindings
} from './zod-bindings.ts';
import { resolvesToAcceptAnything, resolvesToZodSchema } from './binding-resolution.ts';

const ancestorDepth = { property: 1, optionsCall: 2, objectFactory: 3 };

function ancestorNode(path: MutationPath, depth: number): BabelNode | null {
    let current: MutationPath | null = path;
    let remaining = depth;

    while (current !== null && remaining > 0) {
        current = current.parentPath;
        remaining -= 1;
    }

    return current?.node ?? null;
}

function isZodObjectFactory(node: Readonly<BabelNode> | null, bindings: ZodBindings): boolean {
    return isCallExpression(node) && isObjectLikeFactory(getZodCallName(bindings, node) ?? '');
}

function isZodCall(node: Readonly<BabelNode> | null, bindings: ZodBindings): boolean {
    return isCallExpression(node) && getZodCallName(bindings, node) !== null;
}

function isZodObjectFieldValue(
    reference: Readonly<Identifier>,
    path: MutationPath,
    bindings: ZodBindings
): boolean {
    const property = ancestorNode(path, ancestorDepth.property);
    const holdsReference = isObjectProperty(property) && !property.computed && property.value === reference;

    return holdsReference && isZodObjectFactory(ancestorNode(path, ancestorDepth.objectFactory), bindings);
}

function isZodCallArgument(reference: Readonly<Identifier>, path: MutationPath, bindings: ZodBindings): boolean {
    const call = ancestorNode(path, ancestorDepth.property);

    return isCallExpression(call) && call.arguments.includes(reference) && isZodCall(call, bindings);
}

function isZodOptionsElement(
    reference: Readonly<Identifier>,
    path: MutationPath,
    bindings: ZodBindings
): boolean {
    const options = ancestorNode(path, ancestorDepth.property);
    const isElement = isArrayExpression(options) && options.elements.includes(reference);
    const call = ancestorNode(path, ancestorDepth.optionsCall);

    return isElement && isArrayExpression(options) && isZodCall(call, bindings) &&
        isCallExpression(call) && call.arguments.includes(options);
}

function isSchemaReferenceSlot(
    reference: Readonly<Identifier>,
    path: MutationPath,
    bindings: ZodBindings
): boolean {
    return isZodObjectFieldValue(reference, path, bindings) ||
        isZodCallArgument(reference, path, bindings) ||
        isZodOptionsElement(reference, path, bindings);
}

function widensToDistinguishableSchema(reference: SchemaExpression, bindings: ZodBindings): boolean {
    return resolvesToZodSchema(bindings, reference) && !resolvesToAcceptAnything(bindings, reference);
}

function widenReferencedSchema(path: MutationPath, bindings: ZodBindings): readonly BabelNode[] {
    const reference = path.node;

    if (
        !isIdentifier(reference) || !isSchemaReferenceSlot(reference, path, bindings) ||
        !widensToDistinguishableSchema(reference, bindings)
    ) {
        return [];
    }

    const widened = buildZodCall(bindings, moduleStyle(bindings), 'unknown', []);

    return widened === null ? [] : [ widened ];
}

export const referenceMutationDefinitions: readonly MutationDefinition[] = [
    createDefinition('ZodReferencedSchemaWiden', widenReferencedSchema)
];
