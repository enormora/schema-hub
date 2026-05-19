import { test } from '@sondr3/minitest';
import { z } from 'zod/v4-mini';
import { checkQuery } from '../test-libraries/check-build-output.js';

(['query', 'mutation'] as const).forEach((operationType) => {
    test(
        `builds a ${operationType} with objects in arrays`,
        checkQuery({
            type: operationType,
            buildSchema() {
                const schema = z
                    .strictObject({
                        foo: z.array(z.strictObject({ bar: z.string() }))
                    });
                return schema;
            },
            expectedQuery: `${operationType} { foo { bar } }`
        })
    );

    test(
        `builds a ${operationType} with objects in tuples`,
        checkQuery({
            type: operationType,
            buildSchema() {
                const schema = z
                    .strictObject({
                        foo: z.tuple([z.strictObject({ bar: z.string() })])
                    });
                return schema;
            },
            expectedQuery: `${operationType} { foo { bar } }`
        })
    );

    test(
        `builds a ${operationType} with objects in tuples with rest`,
        checkQuery({
            type: operationType,
            buildSchema() {
                const schema = z
                    .strictObject({
                        foo: z.tuple([z.strictObject({ bar: z.string() })], z.strictObject({ x: z.number() }))
                    });
                return schema;
            },
            expectedQuery: `${operationType} { foo { bar } }`
        })
    );

    test(
        `builds a ${operationType} with objects in non-empty arrays`,
        checkQuery({
            type: operationType,
            buildSchema() {
                return z
                    .strictObject({
                        foo: z.array(z.strictObject({ bar: z.string() })).check(z.minLength(1))
                    });
            },
            expectedQuery: `${operationType} { foo { bar } }`
        })
    );

    test(
        `builds a ${operationType} with objects in nullable arrays`,
        checkQuery({
            type: operationType,
            buildSchema() {
                const schema = z
                    .strictObject({
                        foo: z.nullable(z.array(z.strictObject({ bar: z.string() })))
                    });
                return schema;
            },
            expectedQuery: `${operationType} { foo { bar } }`
        })
    );

    test(
        `builds a ${operationType} with nullable objects in nullable arrays`,
        checkQuery({
            type: operationType,
            buildSchema() {
                const schema = z
                    .strictObject({
                        foo: z.nullable(z.array(z.nullable(z.strictObject({ bar: z.string() }))))
                    });
                return schema;
            },
            expectedQuery: `${operationType} { foo { bar } }`
        })
    );
});
