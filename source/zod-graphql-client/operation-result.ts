import type { output as TypeOf } from 'zod/v4/core';
import type { QuerySchema } from '../zod-graphql-query-builder/entry-point.ts';
import type { OperationErrorDetails } from './operation-error.ts';

export type OperationFailureResult = {
    readonly data?: undefined;
    readonly success: false;
    readonly errorDetails: OperationErrorDetails;
};

type OperationSuccessResult<Data> = {
    readonly errorDetails?: undefined;
    readonly success: true;
    readonly data: Data;
};

export type OperationResultForType<Data> = OperationFailureResult | OperationSuccessResult<Data>;

export type OperationResult<Schema extends QuerySchema> = OperationResultForType<TypeOf<Schema>>;
