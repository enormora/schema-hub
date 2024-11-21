import { z, type ZodLazy, type ZodTypeAny } from 'zod';

const customScalarSymbol: unique symbol = Symbol('custom-scalar');

export type CustomScalarSchema<Schema extends ZodTypeAny> = ZodLazy<Schema> & {
    [customScalarSymbol]: true;
};

export function isCustomScalarSchema(schema: ZodTypeAny): schema is CustomScalarSchema<ZodTypeAny> {
    return Object.hasOwn(schema, customScalarSymbol);
}

export function createCustomScalarSchema<Schema extends ZodTypeAny>(
    schema: Schema
): CustomScalarSchema<Schema> {
    const wrappedSchema = z.lazy(() => {
        return schema;
    }) as CustomScalarSchema<Schema>;

    wrappedSchema[customScalarSymbol] = true;

    return wrappedSchema;
}
