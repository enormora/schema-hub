import { z } from 'zod/v4-mini';
import type { $ZodLazy, $ZodType } from 'zod/v4/core';

const customScalarSymbol: unique symbol = Symbol('custom-scalar');

export type CustomScalarSchema<Schema extends $ZodType> = $ZodLazy<Schema> & {
    [customScalarSymbol]: true;
};

export function isCustomScalarSchema(schema: $ZodType): schema is CustomScalarSchema<$ZodType> {
    return Object.hasOwn(schema, customScalarSymbol);
}

export function createCustomScalarSchema<Schema extends $ZodType>(
    schema: Schema
): CustomScalarSchema<Schema> {
    const wrappedSchema = z.lazy(() => {
        return schema;
    }) as unknown as CustomScalarSchema<Schema>;

    wrappedSchema[customScalarSymbol] = true;

    return wrappedSchema;
}
