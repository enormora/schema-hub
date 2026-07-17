import * as babel from '@babel/types';
import type { Node as BabelNode } from '@babel/types';
import type { CallExpression, MutationPath } from './ast.ts';
import type { ZodMutationOperator } from './operator.ts';
import { readZodBindings, type ZodBindings } from './zod-bindings.ts';
import type { ResolverEnv } from './binding-resolution.ts';

export type ZodMutator = {
    readonly name: ZodMutationOperator;
    readonly mutate: (path: MutationPath) => Iterable<BabelNode>;
};

export type MutationDefinition = {
    readonly name: ZodMutationOperator;
    readonly mutate: (path: MutationPath, bindings: ZodBindings) => readonly BabelNode[];
};

export function createDefinition(
    name: ZodMutationOperator,
    mutate: (path: MutationPath, bindings: ZodBindings) => readonly BabelNode[]
): MutationDefinition {
    return { name, mutate };
}

export function callNode(path: MutationPath): CallExpression | null {
    return babel.isCallExpression(path.node) ? path.node : null;
}

export function createZodMutator(definition: MutationDefinition, env: ResolverEnv): ZodMutator {
    return {
        name: definition.name,
        mutate(path: MutationPath): Iterable<BabelNode> {
            return definition.mutate(path, readZodBindings(path, env));
        }
    };
}
