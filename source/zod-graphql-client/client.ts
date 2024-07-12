import { type KyInstance, type Options as KyRequestOptions, TimeoutError } from 'ky';
import type { TypeOf } from 'zod';
import { safeParse } from '../zod-error-formatter/formatter.js';
import { buildGraphqlQuery, type QuerySchema } from '../zod-graphql-query-builder/entry-point.js';
import { parseGraphqlResponse } from './graphql-response.js';
import type { OperationFailureResult, OperationResult, OperationResultForType } from './operation-result.js';
import { GraphqlQueryError } from './query-error.js';
import { extractVariableDefinitions, extractVariableValues, type Variables } from './variables.js';

export type OperationOptions = {
    operationName?: string;
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
        options?: OperationOptions
    ) => Promise<OperationResult<Schema>>;
    readonly queryOrThrow: <Schema extends QuerySchema>(
        schema: Schema,
        options?: OperationOptions
    ) => Promise<TypeOf<Schema>>;
};

type CreateClientFn = (clientOptions: ClientOptions) => GraphqlClient;

export type CreateClientDependencies = {
    ky: KyInstance;
};

const defaultRequestTimeout = 10_000;
const successResponseStatusCode = 200;

function mapUnknownNetworkErrorToFailureResult(error: unknown, timeout: number): OperationFailureResult {
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
        function buildBaseRequestOptions(operationOptions: OperationOptions): KyRequestOptions & { timeout: number; } {
            const timeout = operationOptions.timeout ?? clientOptions.timeout ?? defaultRequestTimeout;
            return {
                headers: {
                    ...clientOptions.headers,
                    ...operationOptions.headers
                },
                timeout,
                throwHttpErrors: false,
                retry: 0
            };
        }

        function prepareRequestPayload<Schema extends QuerySchema>(schema: Schema, options: OperationOptions): unknown {
            const { variables = {} } = options;
            const variableDefinitions = extractVariableDefinitions(variables);
            const variableValues = extractVariableValues(variables);

            const serializedQuery = buildGraphqlQuery(schema, {
                operationName: options.operationName,
                variableDefinitions
            });

            return {
                query: serializedQuery,
                variables: variableValues,
                operationName: options.operationName
            };
        }

        async function parseServerResponse(response: Response): Promise<OperationResultForType<unknown>> {
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

        function parseResponseData<Schema extends QuerySchema>(schema: Schema, data: unknown): OperationResult<Schema> {
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
            options: OperationOptions,
            payload: unknown
        ): Promise<OperationResultForType<unknown>> {
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
            options: OperationOptions = {}
        ): Promise<OperationResult<Schema>> {
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
