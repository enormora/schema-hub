import { buildGraphqlMutation, buildGraphqlQuery, type QuerySchema } from '../zod-graphql-query-builder/entry-point.js';
import { extractVariableDefinitions, extractVariableValues, type Variables } from './variables.js';

export type OperationType = 'mutation' | 'query';

export type OperationOptions = {
    operationName?: string;
    timeout?: number;
    headers?: Record<string, string | undefined>;
    variables?: Variables;
};

export type GraphqlOverHttpOperationRequestPayload = {
    query: string;
    variables: Record<string, unknown>;
    operationName?: string | undefined;
};

export function buildOperationPayload(
    schema: QuerySchema,
    operationType: OperationType,
    options: OperationOptions
): GraphqlOverHttpOperationRequestPayload {
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
