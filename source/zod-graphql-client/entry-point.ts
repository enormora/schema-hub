import baseKy, { type Options as KyOptions } from 'ky';
import { type ClientOptions, createClientFactory, type GraphqlClient } from './client.ts';

export type GraphqlClientOptions = ClientOptions & {
    readonly fetch?: KyOptions['fetch'];
};

export function createGraphqlClient(clientOptions: GraphqlClientOptions): GraphqlClient {
    const { fetch: fetchFn, ...remainingOptions } = clientOptions;
    const ky = fetchFn === undefined ? baseKy : baseKy.create({ fetch: fetchFn });

    const createClient = createClientFactory({ ky });
    return createClient(remainingOptions);
}

export type { QuerySchema } from '../zod-graphql-query-builder/entry-point.ts';
export { customScalar, enumValue, graphqlFieldOptions } from '../zod-graphql-query-builder/entry-point.ts';
export type { GraphqlClient } from './client.ts';
export type {
    AnyVariableMapHandle,
    ValuesOfVariableMapHandle,
    VariableMapHandle,
    VariableValues
} from './define-variables.ts';
export { defineVariables } from './define-variables.ts';
export type { GraphqlTypeInferenceError } from './infer-graphql-type.ts';
export type { GraphqlError } from './graphql-error.ts';
export type { OperationErrorDetails } from './operation-error.ts';
export { GraphqlOperationError } from './operation-error.ts';
export type { OperationHandle, OperationKind, ValuesOfOperationHandle } from './operation-handle.ts';
export { defineMutation, defineQuery } from './operation-handle.ts';
export type { GraphqlOverHttpOperationRequestPayload } from './operation-payload.ts';
export type { OperationResult } from './operation-result.ts';
export type { ExplicitVariableEntry, VariableEntry } from './variable-entry.ts';
export { variable } from './variable-entry.ts';
