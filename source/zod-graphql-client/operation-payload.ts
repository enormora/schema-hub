import { buildGraphqlMutation, buildGraphqlQuery, type QuerySchema } from '../zod-graphql-query-builder/entry-point.ts';
import {
    type AnyVariableMapHandle,
    getVariableMapMetadata,
    type MaybeVariables,
    type ValuesOfVariableMapHandle
} from './define-variables.ts';
import type { OperationHandle } from './operation-handle.ts';
import type { OperationFailureResult } from './operation-result.ts';
import { buildPersistedQueryExtensions, type PersistedQueryExtensions } from './persisted-query.ts';

export type OperationType = 'mutation' | 'query';

export type OperationOptions = {
    readonly timeout?: number;
    readonly headers?: Readonly<Record<string, string | undefined>>;
};

export type GraphqlOverHttpOperationRequestPayload = {
    readonly query?: string;
    readonly variables: Readonly<Record<string, unknown>>;
    readonly operationName?: string | undefined;
    readonly extensions?: PersistedQueryExtensions;
};

export type BuiltOperationPayload = {
    readonly query: string;
    readonly variables: Readonly<Record<string, unknown>>;
    readonly operationName?: string | undefined;
};

export type BuildOperationPayloadInput = {
    readonly schema: QuerySchema;
    readonly operationType: OperationType;
    readonly operationName?: string | undefined;
    readonly variableDefinitions: Readonly<Record<string, string>>;
    readonly variableValues: Readonly<Record<string, unknown>>;
};

export function buildOperationPayload(input: BuildOperationPayloadInput): BuiltOperationPayload {
    const builderOptions = {
        operationName: input.operationName,
        variableDefinitions: input.variableDefinitions
    };
    const build = input.operationType === 'query' ? buildGraphqlQuery : buildGraphqlMutation;
    const serializedQuery = build(input.schema, builderOptions);

    return {
        query: serializedQuery,
        variables: input.variableValues,
        operationName: input.operationName
    };
}

export type OperationTarget = OperationHandle<QuerySchema, MaybeVariables>;

type WithVariables<Variables extends AnyVariableMapHandle> = readonly [
    values: ValuesOfVariableMapHandle<Variables>,
    options?: OperationOptions
];
type WithoutVariables = readonly [options?: OperationOptions];

export type OperationCallArgs<V extends MaybeVariables> = V extends AnyVariableMapHandle ? WithVariables<V>
    : WithoutVariables;

export type ResolvedOperationInputs = {
    readonly schema: QuerySchema;
    readonly operationName: string | undefined;
    readonly variableDefinitions: Readonly<Record<string, string>>;
    readonly variableValues: Readonly<Record<string, unknown>>;
    readonly options: OperationOptions;
};

export type ResolveOperationInputsResult =
    | OperationFailureResult
    | { readonly success: true; readonly data: ResolvedOperationInputs; };

export function resolveOperationInputs(
    handle: OperationTarget,
    valuesOrOptions: unknown,
    maybeOptions: OperationOptions | undefined
): ResolveOperationInputsResult {
    if (handle.variables === undefined) {
        return {
            success: true,
            data: {
                schema: handle.schema,
                operationName: handle.operationName,
                variableDefinitions: {},
                variableValues: {},
                // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- for variable-less operations the first call argument is the options object
                options: (valuesOrOptions as OperationOptions | undefined) ?? {}
            }
        };
    }

    const metadata = getVariableMapMetadata(handle.variables);
    const parsed = metadata.parse(valuesOrOptions);
    if (!parsed.success) {
        return {
            success: false,
            errorDetails: {
                type: 'validation',
                message: 'GraphQL variable values don’t match the expected schema',
                issues: parsed.error.issues
            }
        };
    }

    return {
        success: true,
        data: {
            schema: handle.schema,
            operationName: handle.operationName,
            variableDefinitions: { ...metadata.definitions },
            variableValues: parsed.data,
            options: maybeOptions ?? {}
        }
    };
}

export type PersistedQueryPayloadMode = 'hash-and-query' | 'hash-only';

export function toPersistedQueryPayload(
    payload: BuiltOperationPayload,
    mode: PersistedQueryPayloadMode
): GraphqlOverHttpOperationRequestPayload {
    const extensions = buildPersistedQueryExtensions(payload.query);
    if (mode === 'hash-only') {
        return {
            variables: payload.variables,
            operationName: payload.operationName,
            extensions
        };
    }
    return {
        query: payload.query,
        variables: payload.variables,
        operationName: payload.operationName,
        extensions
    };
}
