import type { NonEmptyArray } from '../tuple/non-empty-array.js';
import type { GraphqlError } from './graphql-error.js';

export type { GraphqlError } from './graphql-error.js';

type BaseError = {
    message: string;
};

type GraphqlResponseError = BaseError & {
    type: 'graphql';
    errors: NonEmptyArray<GraphqlError>;
};

type ServerError = BaseError & {
    type: 'server';
    statusCode: number;
    cause?: unknown;
};

type ValidationError = BaseError & {
    type: 'validation';
    issues: NonEmptyArray<string>;
};

type NetworkError = BaseError & {
    type: 'network';
    cause?: unknown;
};

type UnknownError = BaseError & {
    type: 'unknown';
    cause?: unknown;
};

export type OperationErrorDetails = GraphqlResponseError | NetworkError | ServerError | UnknownError | ValidationError;

export class GraphqlOperationError extends Error {
    // eslint-disable-next-line @typescript-eslint/no-restricted-types -- no type-fest installed
    public readonly details: Omit<OperationErrorDetails, 'message'>;

    constructor(details: OperationErrorDetails) {
        const { message, ...remainingDetails } = details;
        const cause = 'cause' in remainingDetails ? remainingDetails.cause : undefined;
        super(message, cause === undefined ? undefined : { cause });
        // eslint-disable-next-line functional/no-this-expressions -- sub-classing errors is ok
        this.details = remainingDetails;
    }
}
