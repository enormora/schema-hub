import { type KyInstance, type Options as KyRequestOptions, TimeoutError } from 'ky';
import type { TypeOf } from 'zod';
import { safeParse } from '../zod-error-formatter/formatter.js';
import { buildGraphqlQuery, type QuerySchema } from '../zod-graphql-query-builder/entry-point.js';
import { parseGraphqlResponse } from './graphql-response.js';
import { GraphqlQueryError } from './query-error.js';
import type { FailureQueryResult, QueryResult, QueryResultForType } from './query-result.js';
import { extractVariableDefinitions, extractVariableValues, type Variables } from './variables.js';

export type QueryOptions = {
    queryName?: string;
    timeout?: number;
    headers?: Record<string, string | undefined>;
    variables?: Variables;
};

export type ClientOptions = {
    endpoint: string;
    headers?: Record<string, string | undefined>;
    timeout?: number;
};

export type GraphqlClient = {
    readonly query: <Schema extends QuerySchema>(
        schema: Schema,
        options?: QueryOptions
    ) => Promise<QueryResult<Schema>>;
    readonly queryOrThrow: <Schema extends QuerySchema>(
        schema: Schema,
        options?: QueryOptions
    ) => Promise<TypeOf<Schema>>;
};

type CreateClientFn = (clientOptions: ClientOptions) => GraphqlClient;

export type CreateClientDependencies = {
    ky: KyInstance;
};

const defaultRequestTimeout = 10_000;
const successResponseStatusCode = 200;

function mapUnknownNetworkErrorToFailureResult(error: unknown, timeout: number): FailureQueryResult {
    if (error instanceof TimeoutError) {
        return {
            success: false,
            errorDetails: {
                type: 'network',
                message: `Request timed out after ${timeout}ms`
            }
        };
    }
    if (error instanceof Error) {
        return {
            success: false,
            errorDetails: {
                type: 'network',
                message: error.message
            }
        };
    }
    return {
        success: false,
        errorDetails: {
            type: 'unknown',
            message: 'Unknown error occurred'
        }
    };
}

export function createClientFactory(dependencies: CreateClientDependencies): CreateClientFn {
    const { ky } = dependencies;

    return function createClient(clientOptions) {
        function buildBaseRequestOptions(queryOptions: QueryOptions): KyRequestOptions & { timeout: number; } {
            const timeout = queryOptions.timeout ?? clientOptions.timeout ?? defaultRequestTimeout;
            return {
                headers: {
                    ...clientOptions.headers,
                    ...queryOptions.headers
                },
                timeout,
                throwHttpErrors: false,
                retry: 0
            };
        }

        function prepareRequestPayload<Schema extends QuerySchema>(schema: Schema, options: QueryOptions): unknown {
            const { variables = {} } = options;
            const variableDefinitions = extractVariableDefinitions(variables);
            const variableValues = extractVariableValues(variables);

            const serializedQuery = buildGraphqlQuery(schema, {
                queryName: options.queryName,
                variableDefinitions
            });

            return {
                query: serializedQuery,
                variables: variableValues,
                operationName: options.queryName
            };
        }

        async function parseServerResponse(response: Response): Promise<QueryResultForType<unknown>> {
            try {
                const responseBody = await response.json() as unknown;
                return {
                    success: true,
                    data: responseBody
                };
            } catch (error: unknown) {
                const causedByMessage = error instanceof Error ? `: ${error.message}` : '';

                return {
                    success: false,
                    errorDetails: {
                        type: 'server',
                        statusCode: response.status,
                        message: `Failed to parse response body${causedByMessage}`
                    }
                };
            }
        }

        function parseResponseData<Schema extends QuerySchema>(schema: Schema, data: unknown): QueryResult<Schema> {
            const dataParseResult = safeParse(schema, data);

            if (dataParseResult.success) {
                return {
                    success: true,
                    data: dataParseResult.data as TypeOf<Schema>
                };
            }

            return {
                success: false,
                errorDetails: {
                    type: 'validation',
                    message: 'GraphQL response data doesn’t match the expected schema',
                    issues: dataParseResult.error.issues
                }
            };
        }

        async function fetchGraphqlEndpoint(
            options: QueryOptions,
            payload: unknown
        ): Promise<QueryResultForType<unknown>> {
            const baseRequestOptions = buildBaseRequestOptions(options);
            try {
                const response = await ky.post(clientOptions.endpoint, {
                    ...baseRequestOptions,
                    json: payload
                });

                if (response.status !== successResponseStatusCode) {
                    return {
                        success: false,
                        errorDetails: {
                            type: 'server',
                            statusCode: response.status,
                            message:
                                `Received response with unexpected status ${response.status} code from GraphQL server`
                        }
                    };
                }
                return parseServerResponse(response);
            } catch (error: unknown) {
                return mapUnknownNetworkErrorToFailureResult(error, baseRequestOptions.timeout);
            }
        }

        async function query<Schema extends QuerySchema>(
            schema: Schema,
            options: QueryOptions = {}
        ): Promise<QueryResult<Schema>> {
            const payload = prepareRequestPayload(schema, options);

            const serverResponseParseResult = await fetchGraphqlEndpoint(options, payload);

            if (serverResponseParseResult.success) {
                const graphqlResponseParseResult = parseGraphqlResponse(serverResponseParseResult.data);

                if (graphqlResponseParseResult.success) {
                    return parseResponseData(schema, graphqlResponseParseResult.data);
                }
                return graphqlResponseParseResult;
            }

            return serverResponseParseResult;
        }

        return {
            query,

            async queryOrThrow(schema, options) {
                const result = await query(schema, options);
                if (result.success) {
                    return result.data;
                }

                throw new GraphqlQueryError(result.errorDetails);
            }
        };
    };
}
