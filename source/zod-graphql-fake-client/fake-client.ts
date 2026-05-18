import type { output as TypeOf } from 'zod/v4/core';
import { extractDataOrThrow } from '../zod-graphql-client/client.js';
import type {
    GraphqlClient,
    OperationErrorDetails,
    OperationResult,
    QuerySchema
} from '../zod-graphql-client/entry-point.js';
import {
    buildOperationPayload,
    type GraphqlOverHttpOperationRequestPayload,
    type OperationOptions,
    type OperationType
} from '../zod-graphql-client/operation-payload.js';

export type RecordedOperation = {
    readonly type: OperationType;
    readonly schema: QuerySchema;
    readonly payload: GraphqlOverHttpOperationRequestPayload;
    readonly options: OperationOptions;
};

export type OperationMatcherObject = {
    readonly operationName?: string;
    readonly type?: OperationType;
    readonly schema?: QuerySchema;
};

export type OperationMatcher = OperationMatcherObject | ((recorded: RecordedOperation) => boolean);

export type FakeGraphqlClient = GraphqlClient & {
    readonly inspectOperationPayload: (index: number) => GraphqlOverHttpOperationRequestPayload;
    readonly inspectFirstOperationPayload: () => GraphqlOverHttpOperationRequestPayload;
    readonly inspectOperationOptions: (index: number) => OperationOptions;
    readonly inspectFirstOperationOptions: () => OperationOptions;
    readonly findOperation: (matcher: OperationMatcher) => RecordedOperation | undefined;
    readonly findOperationOrThrow: (matcher: OperationMatcher) => RecordedOperation;
    readonly findAllOperations: (matcher: OperationMatcher) => readonly RecordedOperation[];
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

function operationMatchesObject(matcher: OperationMatcherObject, recorded: RecordedOperation): boolean {
    const nameMatches = matcher.operationName === undefined ||
        recorded.options.operationName === matcher.operationName;
    const typeMatches = matcher.type === undefined || recorded.type === matcher.type;
    const schemaMatches = matcher.schema === undefined || recorded.schema === matcher.schema;
    return nameMatches && typeMatches && schemaMatches;
}

function operationMatches(matcher: OperationMatcher, recorded: RecordedOperation): boolean {
    if (typeof matcher === 'function') {
        return matcher(recorded);
    }
    return operationMatchesObject(matcher, recorded);
}

function describeMatcherObject(matcher: OperationMatcherObject): string {
    const parts: string[] = [];
    if (matcher.operationName !== undefined) {
        parts.push(`operationName=${matcher.operationName}`);
    }
    if (matcher.type !== undefined) {
        parts.push(`type=${matcher.type}`);
    }
    if (matcher.schema !== undefined) {
        parts.push('schema=<schema>');
    }
    return parts.length === 0 ? '{}' : `{ ${parts.join(', ')} }`;
}

function describeMatcher(matcher: OperationMatcher): string {
    if (typeof matcher === 'function') {
        return 'predicate function';
    }
    return describeMatcherObject(matcher);
}

type OperationFinders = {
    readonly findOperation: (matcher: OperationMatcher) => RecordedOperation | undefined;
    readonly findAllOperations: (matcher: OperationMatcher) => readonly RecordedOperation[];
    readonly findOperationOrThrow: (matcher: OperationMatcher) => RecordedOperation;
};

function buildOperationFinders(recordedOperations: readonly RecordedOperation[]): OperationFinders {
    function findOperation(matcher: OperationMatcher): RecordedOperation | undefined {
        return recordedOperations.find((recorded) => {
            return operationMatches(matcher, recorded);
        });
    }
    function findAllOperations(matcher: OperationMatcher): readonly RecordedOperation[] {
        return recordedOperations.filter((recorded) => {
            return operationMatches(matcher, recorded);
        });
    }
    function findOperationOrThrow(matcher: OperationMatcher): RecordedOperation {
        const recorded = findOperation(matcher);
        if (recorded === undefined) {
            throw new Error(`No operation recorded matching ${describeMatcher(matcher)}`);
        }
        return recorded;
    }
    return { findOperation, findAllOperations, findOperationOrThrow };
}

export function createFakeGraphqlClient(clientOptions: FakeClientOptions = {}): FakeGraphqlClient {
    const { results = [] } = clientOptions;
    const recordedOperations: RecordedOperation[] = [];
    const defaultResult: FakeResult = { data: {} };

    async function collectOperation<Schema extends QuerySchema>(
        schema: Schema,
        type: OperationType,
        options: OperationOptions = {}
    ): Promise<OperationResult<Schema>> {
        const payload = buildOperationPayload(schema, type, options);
        const result = results[recordedOperations.length] ?? defaultResult;

        recordedOperations.push({ type, schema, payload, options });

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
        const recorded = recordedOperations[index];
        if (recorded === undefined) {
            throw new Error(`No query payload at index ${index} recorded`);
        }

        return recorded.payload;
    }

    function inspectOperationOptions(index: number): OperationOptions {
        const recorded = recordedOperations[index];
        if (recorded === undefined) {
            throw new Error(`No operationOption at index ${index} recorded`);
        }

        return recorded.options;
    }

    const { findOperation, findAllOperations, findOperationOrThrow } = buildOperationFinders(recordedOperations);

    return {
        query,

        async queryOrThrow(schema, options) {
            return extractDataOrThrow(await query(schema, options));
        },

        mutate,

        async mutateOrThrow(schema, options) {
            return extractDataOrThrow(await mutate(schema, options));
        },

        inspectOperationPayload,

        inspectFirstOperationPayload() {
            return inspectOperationPayload(0);
        },
        inspectOperationOptions,
        inspectFirstOperationOptions() {
            return inspectOperationOptions(0);
        },
        findOperation,
        findOperationOrThrow,
        findAllOperations
    };
}
