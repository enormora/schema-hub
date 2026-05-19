/* eslint-disable no-underscore-dangle -- we need to access _zod */
import { $ZodReadonly } from 'zod/v4/core';
import type { FieldShape, QuerySchema, StrictObjectSchema } from './query-schema.js';

export function extractRootShape(schema: QuerySchema): FieldShape {
    if (schema instanceof $ZodReadonly) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- without the assertion accessing .shape triggers TS2589 (excessively deep)
        return (schema._zod.def.innerType as StrictObjectSchema<FieldShape>)._zod.def.shape;
    }
    return schema._zod.def.shape;
}
