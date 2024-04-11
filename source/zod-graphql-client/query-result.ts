import type { TypeOf } from 'zod';
import type { QuerySchema } from '../zod-graphql-query-builder/entry-point.js';
import type { QueryErrorDetails } from './query-error.js';

export type FailureQueryResult = {
    data?: undefined;
    success: false;
    errorDetails: QueryErrorDetails;
};

type SuccessQueryResult<Data> = {
    errorDetails?: undefined;
    success: true;
    data: Data;
};

export type QueryResultForType<Data> = FailureQueryResult | SuccessQueryResult<Data>;

export type QueryResult<Schema extends QuerySchema> = QueryResultForType<TypeOf<Schema>>;
