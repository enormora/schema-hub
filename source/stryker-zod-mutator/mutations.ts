import { createZodMutator, type ZodMutator } from './mutation-definition.ts';
import { mutationDefinitions } from './mutation-catalog.ts';
import type { ZodMutationOperator } from './operator.ts';
import type { ResolverEnv } from './binding-resolution.ts';
import { filesystemResolverEnv } from './filesystem-module-loader.ts';

export function createZodMutatorsWithResolver(
    operators: readonly ZodMutationOperator[],
    env: ResolverEnv
): readonly ZodMutator[] {
    const selectedOperators = new Set(operators);

    return mutationDefinitions
        .filter(function (definition) {
            return selectedOperators.has(definition.name);
        })
        .map(function (definition) {
            return createZodMutator(definition, env);
        });
}

export function createZodMutators(operators: readonly ZodMutationOperator[]): readonly ZodMutator[] {
    return createZodMutatorsWithResolver(operators, filesystemResolverEnv);
}
