import type { PartialStrykerOptions } from '@stryker-mutator/api/core';
import { createInstrumenter } from '@stryker-mutator/instrumenter';
import {
    zodMutationCategories,
    zodMutationOperators,
    type ZodMutationCategory,
    type ZodMutationOperator
} from './operator.ts';
import { installZodMutators } from './registry.ts';

export type ZodMutatorSettings = {
    readonly includedCategories: readonly ZodMutationCategory[] | undefined;
    readonly includedOperators: readonly ZodMutationOperator[] | undefined;
};

export const defaultZodMutatorSettings: ZodMutatorSettings = {
    includedCategories: zodMutationCategories,
    includedOperators: zodMutationOperators
};

export async function withZodMutators<Config extends PartialStrykerOptions>(
    strykerConfig: Config,
    settings: ZodMutatorSettings
): Promise<Config> {
    if (typeof createInstrumenter !== 'function') {
        throw new TypeError('Expected @stryker-mutator/instrumenter to expose createInstrumenter.');
    }

    await installZodMutators(settings);
    return strykerConfig;
}

export async function withDefaultZodMutators<Config extends PartialStrykerOptions>(
    strykerConfig: Config
): Promise<Config> {
    return withZodMutators(strykerConfig, defaultZodMutatorSettings);
}

export {
    zodMutationCategories,
    zodMutationOperatorCategories,
    zodMutationOperators,
    type ZodMutationCategory,
    type ZodMutationOperator
} from './operator.ts';
