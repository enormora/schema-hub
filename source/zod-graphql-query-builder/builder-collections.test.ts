import { test } from '@sondr3/minitest';
import { z } from 'zod/v4-mini';
import { checkQuery } from '../test-libraries/check-build-output.ts';

([ 'query', 'mutation' ] as const).forEach(function (operationType) {
    test(
        `builds a ${operationType} with objects in arrays`,
        checkQuery({
            type: operationType,
            buildSchema() {
                const itemSchema = z.strictObject({ bar: z.string() });
                const schema = z.strictObject({ foo: z.array(itemSchema) });
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
                const itemSchema = z.strictObject({ bar: z.string() });
                const schema = z.strictObject({ foo: z.tuple([ itemSchema ]) });
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
                const itemSchema = z.strictObject({ bar: z.string() });
                const restSchema = z.strictObject({ x: z.number() });
                const schema = z.strictObject({ foo: z.tuple([ itemSchema ], restSchema) });
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
                const itemSchema = z.strictObject({ bar: z.string() });

                return z.strictObject({ foo: z.array(itemSchema).check(z.minLength(1)) });
            },
            expectedQuery: `${operationType} { foo { bar } }`
        })
    );

    test(
        `builds a ${operationType} with objects in nullable arrays`,
        checkQuery({
            type: operationType,
            buildSchema() {
                const itemSchema = z.strictObject({ bar: z.string() });
                const schema = z.strictObject({ foo: z.nullable(z.array(itemSchema)) });
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
                const nullableItemSchema = z.nullable(z.strictObject({ bar: z.string() }));
                const schema = z.strictObject({ foo: z.nullable(z.array(nullableItemSchema)) });
                return schema;
            },
            expectedQuery: `${operationType} { foo { bar } }`
        })
    );
});
