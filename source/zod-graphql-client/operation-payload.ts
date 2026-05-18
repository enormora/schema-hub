import { buildGraphqlMutation, buildGraphqlQuery, type QuerySchema } from '../zod-graphql-query-builder/entry-point.js';
import { buildPersistedQueryExtensions, type PersistedQueryExtensions } from './persisted-query.js';
import { extractVariableDefinitions, extractVariableValues, type Variables } from './variables.js';

export type OperationType = 'mutation' | 'query';

export type OperationOptions = {
    operationName?: string;
    timeout?: number;
    headers?: Record<string, string | undefined>;
    variables?: Variables;
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

export function buildOperationPayload(
    schema: QuerySchema,
    operationType: OperationType,
    options: OperationOptions
): BuiltOperationPayload {
    const { variables = {} } = options;
    const variableDefinitions = extractVariableDefinitions(variables);
    const variableValues = extractVariableValues(variables);

    const serializedQuery = operationType === 'query' ?
        buildGraphqlQuery(schema, {
            operationName: options.operationName,
            variableDefinitions
        }) :
        buildGraphqlMutation(schema, {
            operationName: options.operationName,
            variableDefinitions
        });

    return {
        query: serializedQuery,
        variables: variableValues,
        operationName: options.operationName
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
