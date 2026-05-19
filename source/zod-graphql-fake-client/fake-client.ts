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
    type OperationTarget,
    type OperationType,
    resolveOperationInputs
} from '../zod-graphql-client/operation-payload.js';

export type RecordedOperation = {
    readonly type: OperationType;
    readonly schema: QuerySchema;
    readonly payload: GraphqlOverHttpOperationRequestPayload;
    readonly operationName: string | undefined;
    readonly values: Record<string, unknown>;
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
    readonly inspectOperation: (index: number) => RecordedOperation;
    readonly inspectFirstOperation: () => RecordedOperation;
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
        recorded.operationName === matcher.operationName;
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

type FakeClientState = {
    readonly results: readonly FakeResult[];
    readonly recordedOperations: RecordedOperation[];
};

const defaultResult: FakeResult = { data: {} };

type OperationInvocation = {
    readonly type: OperationType;
    readonly target: OperationTarget;
    readonly valuesOrOptions: unknown;
    readonly maybeOptions: OperationOptions | undefined;
};

function recordAndRespond<Schema extends QuerySchema>(
    state: FakeClientState,
    invocation: OperationInvocation
): OperationResult<Schema> {
    const resolution = resolveOperationInputs(invocation.target, invocation.valuesOrOptions, invocation.maybeOptions);
    if (!resolution.success) {
        return resolution;
    }

    const inputs = resolution.data;
    const payload = buildOperationPayload({
        schema: inputs.schema,
        operationType: invocation.type,
        operationName: inputs.operationName,
        variableDefinitions: inputs.variableDefinitions,
        variableValues: inputs.variableValues
    });
    const result = state.results[state.recordedOperations.length] ?? defaultResult;

    state.recordedOperations.push({
        type: invocation.type,
        schema: inputs.schema,
        payload,
        operationName: inputs.operationName,
        values: inputs.variableValues,
        options: inputs.options
    });

    if (result.error !== undefined) {
        return { success: false, errorDetails: result.error };
    }
    return { success: true, data: result.data as TypeOf<Schema> };
}

function buildClientMethods(state: FakeClientState): GraphqlClient {
    async function queryImpl(
        target: OperationTarget,
        valuesOrOptions?: unknown,
        maybeOptions?: OperationOptions
    ): Promise<OperationResult<QuerySchema>> {
        return recordAndRespond(state, { type: 'query', target, valuesOrOptions, maybeOptions });
    }
    async function mutateImpl(
        target: OperationTarget,
        valuesOrOptions?: unknown,
        maybeOptions?: OperationOptions
    ): Promise<OperationResult<QuerySchema>> {
        return recordAndRespond(state, { type: 'mutation', target, valuesOrOptions, maybeOptions });
    }
    return {
        query: queryImpl as GraphqlClient['query'],
        queryOrThrow: (async (target, valuesOrOptions, maybeOptions) => {
            return extractDataOrThrow(await queryImpl(target, valuesOrOptions, maybeOptions));
        }) as GraphqlClient['queryOrThrow'],
        mutate: mutateImpl as GraphqlClient['mutate'],
        mutateOrThrow: (async (target, valuesOrOptions, maybeOptions) => {
            return extractDataOrThrow(await mutateImpl(target, valuesOrOptions, maybeOptions));
        }) as GraphqlClient['mutateOrThrow']
    };
}

function buildInspectors(recordedOperations: readonly RecordedOperation[]): {
    readonly inspectOperationPayload: (index: number) => GraphqlOverHttpOperationRequestPayload;
    readonly inspectFirstOperationPayload: () => GraphqlOverHttpOperationRequestPayload;
    readonly inspectOperation: (index: number) => RecordedOperation;
    readonly inspectFirstOperation: () => RecordedOperation;
} {
    function inspectOperationPayload(index: number): GraphqlOverHttpOperationRequestPayload {
        const recorded = recordedOperations[index];
        if (recorded === undefined) {
            throw new Error(`No query payload at index ${index} recorded`);
        }
        return recorded.payload;
    }
    function inspectOperation(index: number): RecordedOperation {
        const recorded = recordedOperations[index];
        if (recorded === undefined) {
            throw new Error(`No operation at index ${index} recorded`);
        }
        return recorded;
    }
    return {
        inspectOperationPayload,
        inspectFirstOperationPayload: () => {
            return inspectOperationPayload(0);
        },
        inspectOperation,
        inspectFirstOperation: () => {
            return inspectOperation(0);
        }
    };
}

export function createFakeGraphqlClient(clientOptions: FakeClientOptions = {}): FakeGraphqlClient {
    const { results = [] } = clientOptions;
    const recordedOperations: RecordedOperation[] = [];
    const state: FakeClientState = { results, recordedOperations };
    const clientMethods = buildClientMethods(state);
    const inspectors = buildInspectors(recordedOperations);
    const finders = buildOperationFinders(recordedOperations);

    return {
        ...clientMethods,
        ...inspectors,
        ...finders
    };
}
