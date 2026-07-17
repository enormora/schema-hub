import { behaviorMutationDefinitions } from './behavior-mutations.ts';
import { checkMutationDefinitions } from './check-mutations.ts';
import { collectionMutationDefinitions } from './collection-mutations.ts';
import {
    createZodMutator,
    type MutationDefinition,
    type ZodMutator
} from './mutation-definition.ts';
import { objectMutationDefinitions } from './object-mutations.ts';
import type { ZodMutationOperator } from './operator.ts';
import { presenceMutationDefinitions } from './presence-mutations.ts';
import { primitiveMutationDefinitions } from './primitive-mutations.ts';
import type { ResolverEnv } from './binding-resolution.ts';
import { filesystemResolverEnv } from './filesystem-module-loader.ts';

const mutationDefinitions: readonly MutationDefinition[] = [
    ...primitiveMutationDefinitions,
    ...presenceMutationDefinitions,
    ...objectMutationDefinitions,
    ...checkMutationDefinitions,
    ...collectionMutationDefinitions,
    ...behaviorMutationDefinitions
];

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
