import type { TypeOf } from 'zod';
import type { OperationOptions } from '../zod-graphql-client/client.js';
import {
    type GraphqlClient,
    GraphqlQueryError,
    type OperationResult,
    type QueryErrorDetails,
    type QuerySchema
} from '../zod-graphql-client/entry-point.js';
import { extractVariableDefinitions, extractVariableValues } from '../zod-graphql-client/variables.js';
import { buildGraphqlQuery } from '../zod-graphql-query-builder/entry-point.js';

export type QueryPayload = {
    operationName?: string | undefined;
    variables: Record<string, unknown>;
    query: string;
};

export type FakeGraphqlClient = GraphqlClient & {
    readonly inspectQueryPayload: (index: number) => QueryPayload;
    readonly inspectFirstQueryPayload: () => QueryPayload;
};

type FakeSuccessData = {
    error?: undefined;
    data: unknown;
};

type FakeFailureResult = {
    data?: undefined;
    error: QueryErrorDetails;
};

export type FakeResult = FakeFailureResult | FakeSuccessData;

type FakeClientOptions = {
    readonly results?: FakeResult[];
};
export function createFakeGraphqlClient(clientOptions: FakeClientOptions = {}): FakeGraphqlClient {
    const { results = [] } = clientOptions;
    const queryPayloads: QueryPayload[] = [];
    const defaultResult: FakeResult = { data: {} };

    async function query<Schema extends QuerySchema>(
        schema: Schema,
        options: OperationOptions = {}
    ): Promise<OperationResult<Schema>> {
        const { variables = {} } = options;
        const variableDefinitions = extractVariableDefinitions(variables);
        const variableValues = extractVariableValues(variables);

        const serializedQuery = buildGraphqlQuery(schema, {
            operationName: options.operationName,
            variableDefinitions
        });

        const result = results[queryPayloads.length] ?? defaultResult;

        queryPayloads.push({ operationName: options.operationName, query: serializedQuery, variables: variableValues });

        if (result.error !== undefined) {
            return { success: false, errorDetails: result.error };
        }
        return { success: true, data: result.data as TypeOf<Schema> };
    }

    function inspectQueryPayload(index: number): QueryPayload {
        const payload = queryPayloads[index];
        if (payload === undefined) {
            throw new Error(`No query payload at index ${index} recorded`);
        }

        return payload;
    }

    return {
        query,

        async queryOrThrow(schema, options) {
            const result = await query(schema, options);
            if (result.success) {
                return result.data;
            }

            throw new GraphqlQueryError(result.errorDetails);
        },

        inspectQueryPayload,

        inspectFirstQueryPayload() {
            return inspectQueryPayload(0);
        }
    };
}
