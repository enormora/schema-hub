import type { NonEmptyArray } from '../tuple/non-empty-array.js';

type BaseError = {
    message: string;
};

type GraphqlResponseError = BaseError & {
    type: 'graphql';
    errors: NonEmptyArray<string>;
};

type ServerError = BaseError & {
    type: 'server';
    statusCode: number;
};

type ValidationError = BaseError & {
    type: 'validation';
    issues: NonEmptyArray<string>;
};

type NetworkError = BaseError & {
    type: 'network';
};

type UnknownError = BaseError & {
    type: 'unknown';
};

export type OperationErrorDetails = GraphqlResponseError | NetworkError | ServerError | UnknownError | ValidationError;

export class GraphqlOperationError extends Error {
    // eslint-disable-next-line @typescript-eslint/no-restricted-types -- no type-fest installed
    public readonly details: Omit<OperationErrorDetails, 'message'>;

    constructor(details: OperationErrorDetails) {
        const { message, ...remainingDetails } = details;
        super(message);
        // eslint-disable-next-line functional/no-this-expressions -- sub-classing errors is ok
        this.details = remainingDetails;
    }
}
