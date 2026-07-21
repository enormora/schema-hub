import { behaviorMutationDefinitions } from './behavior-mutations.ts';
import { checkMutationDefinitions } from './check-mutations.ts';
import { collectionMutationDefinitions } from './collection-mutations.ts';
import type { MutationDefinition } from './mutation-definition.ts';
import { objectMutationDefinitions } from './object-mutations.ts';
import { presenceMutationDefinitions } from './presence-mutations.ts';
import { primitiveMutationDefinitions } from './primitive-mutations.ts';
import { referenceMutationDefinitions } from './reference-mutations.ts';

export const mutationDefinitions: readonly MutationDefinition[] = [
    ...primitiveMutationDefinitions,
    ...presenceMutationDefinitions,
    ...objectMutationDefinitions,
    ...checkMutationDefinitions,
    ...collectionMutationDefinitions,
    ...behaviorMutationDefinitions,
    ...referenceMutationDefinitions
];
