import type { QuerySchema } from '../zod-graphql-query-builder/entry-point.ts';
import type { AnyVariableMapHandle, ValuesOfVariableMapHandle } from './define-variables.ts';

export type OperationKind = 'mutation' | 'query';

const operationHandleTag = Symbol('operation-handle');

export type OperationHandle<
    Schema extends QuerySchema,
    Variables extends AnyVariableMapHandle | undefined
> = {
    readonly [operationHandleTag]: true;
    readonly kind: OperationKind;
    readonly schema: Schema;
    readonly variables?: Variables;
    readonly operationName?: string;
};

type ResolveOperationHandleValues<Variables> = Variables extends AnyVariableMapHandle
    ? ValuesOfVariableMapHandle<Variables>
    : never;

export type ValuesOfOperationHandle<Handle> = Handle extends OperationHandle<QuerySchema, infer Variables>
    ? ResolveOperationHandleValues<Variables>
    : never;

type OperationHandleConfig<Schema extends QuerySchema, Variables extends AnyVariableMapHandle | undefined> = {
    readonly schema: Schema;
    readonly variables?: Variables;
    readonly operationName?: string;
};

function createOperationHandle<
    Schema extends QuerySchema,
    Variables extends AnyVariableMapHandle | undefined
>(kind: OperationKind, config: OperationHandleConfig<Schema, Variables>): OperationHandle<Schema, Variables> {
    const base: OperationHandle<Schema, Variables> = {
        // eslint-disable-next-line unicorn/no-unsafe-property-key -- operationHandleTag is a unique symbol, which is a safe property key
        [operationHandleTag]: true,
        kind,
        schema: config.schema
    };
    const withVariables = config.variables === undefined ? base : { ...base, variables: config.variables };
    return config.operationName === undefined
        ? withVariables
        : { ...withVariables, operationName: config.operationName };
}

export function defineQuery<
    Schema extends QuerySchema,
    Variables extends AnyVariableMapHandle | undefined = undefined
>(config: OperationHandleConfig<Schema, Variables>): OperationHandle<Schema, Variables> {
    return createOperationHandle('query', config);
}

export function defineMutation<
    Schema extends QuerySchema,
    Variables extends AnyVariableMapHandle | undefined = undefined
>(config: OperationHandleConfig<Schema, Variables>): OperationHandle<Schema, Variables> {
    return createOperationHandle('mutation', config);
}

export function isOperationHandle(
    value: unknown
): value is OperationHandle<QuerySchema, AnyVariableMapHandle | undefined> {
    return typeof value === 'object' &&
        value !== null &&
        // eslint-disable-next-line unicorn/no-unsafe-property-key -- operationHandleTag is a unique symbol, which is a safe property key
        (value as { readonly [operationHandleTag]?: unknown; })[operationHandleTag] === true;
}
