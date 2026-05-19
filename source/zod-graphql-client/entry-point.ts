import baseKy, { type Options as KyOptions } from 'ky';
import { type ClientOptions, createClientFactory, type GraphqlClient } from './client.js';

export type GraphqlClientOptions = ClientOptions & {
    readonly fetch?: KyOptions['fetch'];
};

export function createGraphqlClient(clientOptions: GraphqlClientOptions): GraphqlClient {
    const { fetch: fetchFn, ...remainingOptions } = clientOptions;
    const ky = fetchFn === undefined ? baseKy : baseKy.create({ fetch: fetchFn });

    const createClient = createClientFactory({ ky });
    return createClient(remainingOptions);
}

export type { QuerySchema } from '../zod-graphql-query-builder/entry-point.js';
export { customScalar, enumValue, graphqlFieldOptions } from '../zod-graphql-query-builder/entry-point.js';
export type { GraphqlClient } from './client.js';
export type {
    AnyVariableMapHandle,
    ValuesOfVariableMapHandle,
    VariableMapHandle,
    VariableValues
} from './define-variables.js';
export { defineVariables } from './define-variables.js';
export type { GraphqlTypeInferenceError } from './infer-graphql-type.js';
export type { OperationErrorDetails } from './operation-error.js';
export { GraphqlOperationError } from './operation-error.js';
export type { OperationHandle, OperationKind, ValuesOfOperationHandle } from './operation-handle.js';
export { defineMutation, defineQuery } from './operation-handle.js';
export type { GraphqlOverHttpOperationRequestPayload } from './operation-payload.js';
export type { OperationResult } from './operation-result.js';
export type { ExplicitVariableEntry, VariableEntry } from './variable-entry.js';
export { variable } from './variable-entry.js';
