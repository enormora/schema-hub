import { buildGraphqlMutation, buildGraphqlQuery, type QuerySchema } from '../zod-graphql-query-builder/entry-point.js';
import {
    type AnyVariableMapHandle,
    getVariableMapMetadata,
    type MaybeVariables,
    type ValuesOfVariableMapHandle
} from './define-variables.js';
import type { OperationHandle } from './operation-handle.js';
import type { OperationFailureResult } from './operation-result.js';
import { buildPersistedQueryExtensions, type PersistedQueryExtensions } from './persisted-query.js';

export type { OperationHandle } from './operation-handle.js';

export type OperationType = 'mutation' | 'query';

export type OperationOptions = {
    timeout?: number;
    headers?: Record<string, string | undefined>;
};

export type GraphqlOverHttpOperationRequestPayload = {
    query?: string;
    variables: Record<string, unknown>;
    operationName?: string | undefined;
    extensions?: PersistedQueryExtensions;
};

export type BuiltOperationPayload = {
    query: string;
    variables: Record<string, unknown>;
    operationName?: string | undefined;
};

export type BuildOperationPayloadInput = {
    readonly schema: QuerySchema;
    readonly operationType: OperationType;
    readonly operationName?: string | undefined;
    readonly variableDefinitions: Record<string, string>;
    readonly variableValues: Record<string, unknown>;
};

export function buildOperationPayload(input: BuildOperationPayloadInput): BuiltOperationPayload {
    const builderOptions = {
        operationName: input.operationName,
        variableDefinitions: input.variableDefinitions
    };
    const serializedQuery = input.operationType === 'query' ?
        buildGraphqlQuery(input.schema, builderOptions) :
        buildGraphqlMutation(input.schema, builderOptions);

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

export type OperationCallArgs<V extends MaybeVariables> = V extends AnyVariableMapHandle ? WithVariables<V> :
    WithoutVariables;

export type ResolvedOperationInputs = {
    readonly schema: QuerySchema;
    readonly operationName: string | undefined;
    readonly variableDefinitions: Record<string, string>;
    readonly variableValues: Record<string, unknown>;
    readonly options: OperationOptions;
};

export type ResolveOperationInputsResult =
    | OperationFailureResult
    | { success: true; data: ResolvedOperationInputs; };

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
