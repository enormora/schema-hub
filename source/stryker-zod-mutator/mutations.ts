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

const mutationDefinitions: readonly MutationDefinition[] = [
    ...primitiveMutationDefinitions,
    ...presenceMutationDefinitions,
    ...objectMutationDefinitions,
    ...checkMutationDefinitions,
    ...collectionMutationDefinitions,
    ...behaviorMutationDefinitions
];

export function createZodMutators(operators: readonly ZodMutationOperator[]): readonly ZodMutator[] {
    const selectedOperators = new Set(operators);

    return mutationDefinitions
        .filter(function (definition) {
            return selectedOperators.has(definition.name);
        })
        .map(createZodMutator);
}
