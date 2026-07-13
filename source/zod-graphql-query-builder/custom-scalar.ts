import { z } from 'zod/v4-mini';
import type { $ZodLazy, $ZodType } from 'zod/v4/core';

const customScalarSymbol: unique symbol = Symbol('custom-scalar');

// eslint-disable-next-line functional/type-declaration-immutability -- intersects the third-party mutable $ZodLazy type
export type CustomScalarSchema<Schema extends $ZodType> = $ZodLazy<Schema> & {
    readonly [customScalarSymbol]: true;
};

export function isCustomScalarSchema(schema: $ZodType): schema is CustomScalarSchema<$ZodType> {
    return Object.hasOwn(schema, customScalarSymbol);
}

export function createCustomScalarSchema<Schema extends $ZodType>(
    schema: Schema
): CustomScalarSchema<Schema> {
    const wrappedSchema = z.lazy(function () {
        return schema;
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- branding the lazy schema with the custom-scalar marker symbol can't be expressed structurally
    return Object.assign(wrappedSchema, { [customScalarSymbol]: true }) as unknown as CustomScalarSchema<Schema>;
}
