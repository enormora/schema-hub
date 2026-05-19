import { type KyInstance, type Options as KyRequestOptions, TimeoutError } from 'ky';
import type { output as TypeOf } from 'zod/v4/core';
import { safeParse } from '../zod-error-formatter/formatter.js';
import type { QuerySchema } from '../zod-graphql-query-builder/entry-point.js';
import type { AnyVariableMapHandle, ValuesOfVariableMapHandle } from './define-variables.js';
import { parseGraphqlResponse } from './graphql-response.js';
import { GraphqlOperationError } from './operation-error.js';
import {
    buildOperationPayload,
    type BuildOperationPayloadInput,
    type BuiltOperationPayload,
    type GraphqlOverHttpOperationRequestPayload,
    type OperationHandle,
    type OperationOptions,
    type OperationTarget,
    type OperationType,
    type ResolvedOperationInputs,
    resolveOperationInputs,
    toPersistedQueryPayload
} from './operation-payload.js';
import type { OperationFailureResult, OperationResult, OperationResultForType } from './operation-result.js';
import { detectPersistedQueryRetryReason } from './persisted-query.js';

export type { OperationOptions } from './operation-payload.js';

export type ClientOptions = {
    endpoint: string;
    headers?: Record<string, string | undefined>;
    timeout?: number;
    persistedQueries?: boolean;
};

export type GraphqlClient = {
    readonly query: {
        <Schema extends QuerySchema>(
            target: OperationHandle<Schema, undefined> | Schema,
            options?: OperationOptions
        ): Promise<OperationResult<Schema>>;
        <Schema extends QuerySchema, Variables extends AnyVariableMapHandle>(
            handle: OperationHandle<Schema, Variables>,
            values: ValuesOfVariableMapHandle<Variables>,
            options?: OperationOptions
        ): Promise<OperationResult<Schema>>;
    };
    readonly queryOrThrow: {
        <Schema extends QuerySchema>(
            target: OperationHandle<Schema, undefined> | Schema,
            options?: OperationOptions
        ): Promise<TypeOf<Schema>>;
        <Schema extends QuerySchema, Variables extends AnyVariableMapHandle>(
            handle: OperationHandle<Schema, Variables>,
            values: ValuesOfVariableMapHandle<Variables>,
            options?: OperationOptions
        ): Promise<TypeOf<Schema>>;
    };
    readonly mutate: {
        <Schema extends QuerySchema>(
            target: OperationHandle<Schema, undefined> | Schema,
            options?: OperationOptions
        ): Promise<OperationResult<Schema>>;
        <Schema extends QuerySchema, Variables extends AnyVariableMapHandle>(
            handle: OperationHandle<Schema, Variables>,
            values: ValuesOfVariableMapHandle<Variables>,
            options?: OperationOptions
        ): Promise<OperationResult<Schema>>;
    };
    readonly mutateOrThrow: {
        <Schema extends QuerySchema>(
            target: OperationHandle<Schema, undefined> | Schema,
            options?: OperationOptions
        ): Promise<TypeOf<Schema>>;
        <Schema extends QuerySchema, Variables extends AnyVariableMapHandle>(
            handle: OperationHandle<Schema, Variables>,
            values: ValuesOfVariableMapHandle<Variables>,
            options?: OperationOptions
        ): Promise<TypeOf<Schema>>;
    };
};

type CreateClientFn = (clientOptions: ClientOptions) => GraphqlClient;

export type CreateClientDependencies = {
    ky: KyInstance;
};

const defaultRequestTimeout = 10_000;
const successResponseStatusCode = 200;

export function extractDataOrThrow<Data>(result: OperationResultForType<Data>): Data {
    if (result.success) {
        return result.data;
    }
    throw new GraphqlOperationError(result.errorDetails);
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
                message: `Failed to parse response body${causedByMessage}`,
                cause: error
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

function parseAndValidate<Schema extends QuerySchema>(
    schema: Schema,
    rawResponse: unknown
): OperationResult<Schema> {
    const graphqlResponseParseResult = parseGraphqlResponse(rawResponse);

    if (graphqlResponseParseResult.success) {
        return parseResponseData(schema, graphqlResponseParseResult.data);
    }
    return graphqlResponseParseResult;
}

function mapUnknownNetworkErrorToFailureResult(error: unknown, timeout: number): OperationFailureResult {
    if (error instanceof TimeoutError) {
        return {
            success: false,
            errorDetails: {
                type: 'network',
                message: `Request timed out after ${timeout}ms`,
                cause: error
            }
        };
    }
    if (error instanceof Error) {
        return {
            success: false,
            errorDetails: {
                type: 'network',
                message: error.message,
                cause: error
            }
        };
    }
    return {
        success: false,
        errorDetails: {
            type: 'unknown',
            message: 'Unknown error occurred',
            cause: error
        }
    };
}

function toBuildPayloadInput(
    operationType: OperationType,
    inputs: ResolvedOperationInputs
): BuildOperationPayloadInput {
    return {
        schema: inputs.schema,
        operationType,
        operationName: inputs.operationName,
        variableDefinitions: inputs.variableDefinitions,
        variableValues: inputs.variableValues
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

        async function fetchAndParse<Schema extends QuerySchema>(
            schema: Schema,
            options: OperationOptions,
            payload: GraphqlOverHttpOperationRequestPayload
        ): Promise<OperationResult<Schema>> {
            const serverResponseParseResult = await fetchGraphqlEndpoint(options, payload);
            if (!serverResponseParseResult.success) {
                return serverResponseParseResult;
            }
            return parseAndValidate(schema, serverResponseParseResult.data);
        }

        async function performPersistedQueryOperation<Schema extends QuerySchema>(
            schema: Schema,
            options: OperationOptions,
            basePayload: BuiltOperationPayload
        ): Promise<OperationResult<Schema>> {
            const hashOnlyPayload = toPersistedQueryPayload(basePayload, 'hash-only');
            const firstAttempt = await fetchGraphqlEndpoint(options, hashOnlyPayload);

            if (!firstAttempt.success) {
                return firstAttempt;
            }

            const retryReason = detectPersistedQueryRetryReason(firstAttempt.data);
            if (retryReason === undefined) {
                return parseAndValidate(schema, firstAttempt.data);
            }

            const retryPayload = retryReason === 'not-supported' ?
                basePayload :
                toPersistedQueryPayload(basePayload, 'hash-and-query');
            return fetchAndParse(schema, options, retryPayload);
        }

        async function performOperation<Schema extends QuerySchema>(
            operationType: OperationType,
            target: OperationTarget,
            valuesOrOptions: unknown,
            maybeOptions: OperationOptions | undefined
        ): Promise<OperationResult<Schema>> {
            const resolution = resolveOperationInputs(target, valuesOrOptions, maybeOptions);
            if (!resolution.success) {
                return resolution;
            }

            const inputs = resolution.data;
            const payload = buildOperationPayload(toBuildPayloadInput(operationType, inputs));

            if (clientOptions.persistedQueries === true) {
                return performPersistedQueryOperation(inputs.schema as Schema, inputs.options, payload);
            }

            return fetchAndParse(inputs.schema as Schema, inputs.options, payload);
        }

        async function queryImpl(
            target: OperationTarget,
            valuesOrOptions?: unknown,
            maybeOptions?: OperationOptions
        ): Promise<OperationResult<QuerySchema>> {
            return performOperation('query', target, valuesOrOptions, maybeOptions);
        }

        async function mutateImpl(
            target: OperationTarget,
            valuesOrOptions?: unknown,
            maybeOptions?: OperationOptions
        ): Promise<OperationResult<QuerySchema>> {
            return performOperation('mutation', target, valuesOrOptions, maybeOptions);
        }

        async function queryOrThrowImpl(
            target: OperationTarget,
            valuesOrOptions?: unknown,
            maybeOptions?: OperationOptions
        ): Promise<unknown> {
            return extractDataOrThrow(await queryImpl(target, valuesOrOptions, maybeOptions));
        }

        async function mutateOrThrowImpl(
            target: OperationTarget,
            valuesOrOptions?: unknown,
            maybeOptions?: OperationOptions
        ): Promise<unknown> {
            return extractDataOrThrow(await mutateImpl(target, valuesOrOptions, maybeOptions));
        }

        return {
            query: queryImpl as GraphqlClient['query'],
            queryOrThrow: queryOrThrowImpl as GraphqlClient['queryOrThrow'],
            mutate: mutateImpl as GraphqlClient['mutate'],
            mutateOrThrow: mutateOrThrowImpl as GraphqlClient['mutateOrThrow']
        };
    };
}
