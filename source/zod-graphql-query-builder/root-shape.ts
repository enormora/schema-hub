/* eslint-disable no-underscore-dangle -- we need to access _zod */
import type { FieldShape, QuerySchema } from './query-schema.ts';

export function extractRootShape(schema: QuerySchema): FieldShape {
    if (schema._zod.def.type === 'readonly') {
        return schema._zod.def.innerType._zod.def.shape;
    }
    return schema._zod.def.shape;
}
