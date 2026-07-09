import type { Node as BabelNode } from '@babel/types';
import { createZodMutators } from './mutations.ts';
import {
    zodMutationOperatorCategories,
    zodMutationOperators,
    type ZodMutationOperator
} from './operator.ts';
import type { ZodMutatorSettings } from './entry-point.ts';

type MutatorRegistryModule = {
    readonly allMutators: MutableMutatorList;
};

type MutableMutatorList = {
    readonly [Symbol.iterator]: () => Iterator<NodeMutator>;
    readonly push: (...mutators: readonly NodeMutator[]) => number;
};

type NodePath = {
    readonly node: BabelNode;
    readonly parentPath: NodePath | null;
};

type NodeMutator = {
    readonly name: string;
    mutate: (path: NodePath) => Iterable<BabelNode>;
};

function selectOperators(settings: ZodMutatorSettings): readonly ZodMutationOperator[] {
    const categoryFilter = settings.includedCategories === undefined
        ? new Set(Object.values(zodMutationOperatorCategories))
        : new Set(settings.includedCategories);
    const operatorFilter = settings.includedOperators === undefined
        ? new Set(zodMutationOperators)
        : new Set(settings.includedOperators);

    return zodMutationOperators.filter(function (operator) {
        return categoryFilter.has(zodMutationOperatorCategories[operator]) && operatorFilter.has(operator);
    });
}

function isMutatorRegistryModule(value: unknown): value is MutatorRegistryModule {
    const descriptor = typeof value === 'object' && value !== null
        ? Object.getOwnPropertyDescriptor(value, 'allMutators')
        : undefined;
    const allMutators: unknown = descriptor?.value;

    return typeof value === 'object'
        && value !== null
        && Array.isArray(allMutators);
}

export function readMutatorRegistryModule(registry: unknown): MutatorRegistryModule {
    if (!isMutatorRegistryModule(registry)) {
        const message = [
            "@schema-hub/stryker-zod-mutator could not find Stryker's mutable allMutators registry.",
            'Use @stryker-mutator/instrumenter >=9.6.0 <10.'
        ]
            .join(' ');

        throw new TypeError(
            message
        );
    }

    return registry;
}

async function loadMutatorRegistry(): Promise<MutatorRegistryModule> {
    const manifestUrl = import.meta.resolve('@stryker-mutator/instrumenter/package.json');
    const mutatorIndexUrl = new URL('dist/src/mutators/index.js', manifestUrl);
    const registry = await import(mutatorIndexUrl.href) as unknown;

    return readMutatorRegistryModule(registry);
}

export async function installZodMutators(settings: ZodMutatorSettings): Promise<void> {
    const registry = await loadMutatorRegistry();
    const selectedOperators = selectOperators(settings);
    const existingNames = new Set(Array.from(registry.allMutators, function (mutator) {
        return mutator.name;
    }));
    const mutators = createZodMutators(selectedOperators);

    registry.allMutators.push(...mutators.filter(function (mutator) {
        return !existingNames.has(mutator.name);
    }));
}
