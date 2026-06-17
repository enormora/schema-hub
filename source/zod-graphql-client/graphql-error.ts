import { z } from 'zod/v4-mini';

const locationSchema = z
    .strictObject({
        line: z.number().check(z.int(), z.positive()),
        column: z.number().check(z.int(), z.positive())
    });

const pathSegmentSchema = z.union([ z.string(), z.number() ]);

export const graphqlErrorSchema = z
    .object({
        message: z.string(),
        locations: z.optional(z.array(locationSchema)),
        path: z.optional(z.array(pathSegmentSchema)),
        extensions: z.optional(z.record(z.string(), z.unknown()))
    });

export type GraphqlError = Readonly<z.infer<typeof graphqlErrorSchema>>;
