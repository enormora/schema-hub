import type { TypeOf } from 'zod';
import type { QuerySchema } from '../zod-graphql-query-builder/entry-point.js';
import type { OperationErrorDetails } from './operation-error.js';

export type OperationFailureResult = {
    data?: undefined;
    success: false;
    errorDetails: OperationErrorDetails;
};

type OperationSuccessResult<Data> = {
    errorDetails?: undefined;
    success: true;
    data: Data;
};

export type OperationResultForType<Data> = OperationFailureResult | OperationSuccessResult<Data>;

export type OperationResult<Schema extends QuerySchema> = OperationResultForType<TypeOf<Schema>>;
