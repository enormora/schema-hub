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

export type QueryErrorDetails = GraphqlResponseError | NetworkError | ServerError | UnknownError | ValidationError;
export type QueryErrorType = QueryErrorDetails['type'];

export class GraphqlQueryError extends Error {
    // eslint-disable-next-line @typescript-eslint/ban-types -- no type-fest installed
    public readonly details: Omit<QueryErrorDetails, 'message'>;

    constructor(details: QueryErrorDetails) {
        const { message, ...remainingDetails } = details;
        super(message);
        // eslint-disable-next-line functional/no-this-expressions -- sub-classing errors is ok
        this.details = remainingDetails;
    }
}
