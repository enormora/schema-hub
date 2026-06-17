import type { NonEmptyArray } from '../tuple/non-empty-array.ts';
import type { GraphqlError } from './graphql-error.ts';

type BaseError = {
    readonly message: string;
};

type GraphqlResponseError = BaseError & {
    readonly type: 'graphql';
    readonly errors: NonEmptyArray<GraphqlError>;
};

type ServerError = BaseError & {
    readonly type: 'server';
    readonly statusCode: number;
    readonly cause?: unknown;
};

type ValidationError = BaseError & {
    readonly type: 'validation';
    readonly issues: NonEmptyArray<string>;
};

type NetworkError = BaseError & {
    readonly type: 'network';
    readonly cause?: unknown;
};

type UnknownError = BaseError & {
    readonly type: 'unknown';
    readonly cause?: unknown;
};

export type OperationErrorDetails = GraphqlResponseError | NetworkError | ServerError | UnknownError | ValidationError;

function causeOf(details: OperationErrorDetails): unknown {
    // eslint-disable-next-line unicorn/prefer-includes-over-repeated-comparisons -- literal comparisons narrow the discriminated union so `cause` is accessible
    if (details.type === 'network' || details.type === 'server' || details.type === 'unknown') {
        return details.cause;
    }
    return undefined;
}

export class GraphqlOperationError extends Error {
    // eslint-disable-next-line @typescript-eslint/no-restricted-types, restricted-syntax-typescript/no-public-class-property -- no type-fest installed; details is part of the error's public API
    public readonly details: Omit<OperationErrorDetails, 'message'>;

    // eslint-disable-next-line unicorn/custom-error-definition -- constructor takes a domain details object rather than message + options
    public constructor(details: OperationErrorDetails) {
        const cause = causeOf(details);
        const { message, ...remainingDetails } = details;
        super(message, cause === undefined ? undefined : { cause });

        this.name = 'GraphqlOperationError';
        this.details = remainingDetails;
    }
}
