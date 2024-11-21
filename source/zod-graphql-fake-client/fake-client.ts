import type { TypeOf } from 'zod';
import type { GraphqlOverHttpOperationRequestPayload, OperationOptions } from '../zod-graphql-client/client.js';
import {
    type GraphqlClient,
    GraphqlOperationError,
    type OperationErrorDetails,
    type OperationResult,
    type QuerySchema
} from '../zod-graphql-client/entry-point.js';
import { extractVariableDefinitions, extractVariableValues } from '../zod-graphql-client/variables.js';
import { buildGraphqlMutation, buildGraphqlQuery } from '../zod-graphql-query-builder/entry-point.js';

export type FakeGraphqlClient = GraphqlClient & {
    readonly inspectOperationPayload: (index: number) => GraphqlOverHttpOperationRequestPayload;
    readonly inspectFirstOperationPayload: () => GraphqlOverHttpOperationRequestPayload;
    readonly inspectOperationOptions: (index: number) => OperationOptions;
    readonly inspectFirstOperationOptions: () => OperationOptions;
};

type FakeSuccessData = {
    error?: undefined;
    data: unknown;
};

type FakeFailureResult = {
    data?: undefined;
    error: OperationErrorDetails;
};

export type FakeResult = FakeFailureResult | FakeSuccessData;

type FakeClientOptions = {
    readonly results?: FakeResult[];
};
export function createFakeGraphqlClient(clientOptions: FakeClientOptions = {}): FakeGraphqlClient {
    const { results = [] } = clientOptions;
    const operationPayloads: GraphqlOverHttpOperationRequestPayload[] = [];
    const operationOptions: OperationOptions[] = [];
    const defaultResult: FakeResult = { data: {} };

    async function collectOperation<Schema extends QuerySchema>(
        schema: Schema,
        type: 'mutation' | 'query',
        options: OperationOptions = {}
    ): Promise<OperationResult<Schema>> {
        const { variables = {} } = options;
        const variableDefinitions = extractVariableDefinitions(variables);
        const variableValues = extractVariableValues(variables);

        const serializedQuery = type === 'query'
            ? buildGraphqlQuery(schema, {
                operationName: options.operationName,
                variableDefinitions
            })
            : buildGraphqlMutation(schema, {
                operationName: options.operationName,
                variableDefinitions
            });

        const result = results[operationPayloads.length] ?? defaultResult;

        operationPayloads.push({
            operationName: options.operationName,
            query: serializedQuery,
            variables: variableValues
        });
        operationOptions.push(options);

        if (result.error !== undefined) {
            return { success: false, errorDetails: result.error };
        }
        return { success: true, data: result.data as TypeOf<Schema> };
    }

    async function query<Schema extends QuerySchema>(
        schema: Schema,
        options: OperationOptions = {}
    ): Promise<OperationResult<Schema>> {
        return collectOperation(schema, 'query', options);
    }

    async function mutate<Schema extends QuerySchema>(
        schema: Schema,
        options: OperationOptions = {}
    ): Promise<OperationResult<Schema>> {
        return collectOperation(schema, 'mutation', options);
    }

    function inspectOperationPayload(index: number): GraphqlOverHttpOperationRequestPayload {
        const payload = operationPayloads[index];
        if (payload === undefined) {
            throw new Error(`No query payload at index ${index} recorded`);
        }

        return payload;
    }

    function inspectOperationOptions(index: number): OperationOptions {
        const operationOption = operationOptions[index];
        if (operationOption === undefined) {
            throw new Error(`No operationOption at index ${index} recorded`);
        }

        return operationOption;
    }

    return {
        query,

        async queryOrThrow(schema, options) {
            const result = await query(schema, options);
            if (result.success) {
                return result.data;
            }

            throw new GraphqlOperationError(result.errorDetails);
        },

        mutate,

        async mutateOrThrow(schema, options) {
            const result = await mutate(schema, options);
            if (result.success) {
                return result.data;
            }

            throw new GraphqlOperationError(result.errorDetails);
        },

        inspectOperationPayload,

        inspectFirstOperationPayload() {
            return inspectOperationPayload(0);
        },
        inspectOperationOptions,
        inspectFirstOperationOptions() {
            return inspectOperationOptions(0);
        }
    };
}
