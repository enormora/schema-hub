import { type KyInstance, type Options as KyRequestOptions, TimeoutError } from 'ky';
import type { TypeOf } from 'zod';
import { safeParse } from '../zod-error-formatter/formatter.js';
import { buildGraphqlMutation, buildGraphqlQuery, type QuerySchema } from '../zod-graphql-query-builder/entry-point.js';
import { parseGraphqlResponse } from './graphql-response.js';
import { GraphqlOperationError } from './operation-error.js';
import type { OperationFailureResult, OperationResult, OperationResultForType } from './operation-result.js';
import { extractVariableDefinitions, extractVariableValues, type Variables } from './variables.js';

type OperationType = 'mutation' | 'query';

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
    readonly mutate: <Schema extends QuerySchema>(
        schema: Schema,
        options?: OperationOptions
    ) => Promise<OperationResult<Schema>>;
    readonly mutateOrThrow: <Schema extends QuerySchema>(
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

export type GraphqlOverHttpOperationRequestPayload = {
    query: string;
    variables: Record<string, unknown>;
    operationName?: string | undefined;
};

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

        function prepareRequestPayload(
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

        async function performOperation<Schema extends QuerySchema>(
            schema: Schema,
            operationType: 'mutation' | 'query',
            options: OperationOptions = {}
        ): Promise<OperationResult<Schema>> {
            const payload = prepareRequestPayload(schema, operationType, options);

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

        async function query<Schema extends QuerySchema>(
            schema: Schema,
            options: OperationOptions = {}
        ): Promise<OperationResult<Schema>> {
            return performOperation(schema, 'query', options);
        }

        async function mutate<Schema extends QuerySchema>(
            schema: Schema,
            options: OperationOptions = {}
        ): Promise<OperationResult<Schema>> {
            return performOperation(schema, 'mutation', options);
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
            }
        };
    };
}
