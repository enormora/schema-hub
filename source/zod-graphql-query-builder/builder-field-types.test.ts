import { test } from '@sondr3/minitest';
import { z } from 'zod/v4-mini';
import { checkQuery } from '../test-libraries/check-build-output.ts';
import { createCustomScalarSchema } from './custom-scalar.ts';

([ 'query', 'mutation' ] as const).forEach(function (operationType) {
    test(
        `builds a ${operationType} with transformable object`,
        checkQuery({
            type: operationType,
            buildSchema() {
                const schema = z
                    .strictObject({
                        foo: z.pipe(
                            z.strictObject({ bar: z.string() }),
                            z.transform(function () {
                                return '';
                            })
                        )
                    });
                return schema;
            },
            expectedQuery: `${operationType} { foo { bar } }`
        })
    );

    test(
        `builds a ${operationType} with a simple number field`,
        checkQuery({
            type: operationType,
            buildSchema() {
                return z.strictObject({ foo: z.number() });
            },
            expectedQuery: `${operationType} { foo }`
        })
    );

    test(
        `builds a ${operationType} with a simple boolean field`,
        checkQuery({
            type: operationType,
            buildSchema() {
                return z.strictObject({ foo: z.boolean() });
            },
            expectedQuery: `${operationType} { foo }`
        })
    );

    test(
        `builds a ${operationType} with a simple literal field`,
        checkQuery({
            type: operationType,
            buildSchema() {
                const schema = z.strictObject({ foo: z.literal('bar') });
                return schema;
            },
            expectedQuery: `${operationType} { foo }`
        })
    );

    test(
        `builds a ${operationType} with a simple nullable field`,
        checkQuery({
            type: operationType,
            buildSchema() {
                const schema = z.strictObject({ foo: z.nullable(z.literal('')) });
                return schema;
            },
            expectedQuery: `${operationType} { foo }`
        })
    );

    test(
        `builds a ${operationType} with a field that is wrapped multiple times`,
        checkQuery({
            type: operationType,
            buildSchema() {
                const schema = z
                    .strictObject({
                        foo: z.pipe(
                            z
                                .lazy(function () {
                                    return z.nullable(z.literal(''));
                                }),
                            z.transform(function () {
                                return '';
                            })
                        )
                    });
                return schema;
            },
            expectedQuery: `${operationType} { foo }`
        })
    );

    test(
        `builds a ${operationType} with a simple array field`,
        checkQuery({
            type: operationType,
            buildSchema() {
                const schema = z.strictObject({ foo: z.array(z.literal('')) });
                return schema;
            },
            expectedQuery: `${operationType} { foo }`
        })
    );

    test(
        `builds a ${operationType} ignoring fields which are always undefined`,
        checkQuery({
            type: operationType,
            buildSchema() {
                return z.strictObject({ foo: z.string(), bar: z.undefined() });
            },
            expectedQuery: `${operationType} { foo }`
        })
    );

    test(
        `builds a ${operationType} with readonly fields`,
        checkQuery({
            type: operationType,
            buildSchema() {
                const schema = z.strictObject({ foo: z.readonly(z.array(z.string())) });
                return schema;
            },
            expectedQuery: `${operationType} { foo }`
        })
    );

    test(
        `builds a ${operationType} with readonly objects`,
        checkQuery({
            type: operationType,
            buildSchema() {
                const schema = z.readonly(z.strictObject({ foo: z.string() }));
                return schema;
            },
            expectedQuery: `${operationType} { foo }`
        })
    );

    test(
        `builds a ${operationType} with nested readonly objects`,
        checkQuery({
            type: operationType,
            buildSchema() {
                const schema = z.readonly(z.strictObject({ foo: z.readonly(z.strictObject({ bar: z.string() })) }));
                return schema;
            },
            expectedQuery: `${operationType} { foo { bar } }`
        })
    );

    test(
        `builds a ${operationType} with union of primitives fields`,
        checkQuery({
            type: operationType,
            buildSchema() {
                const schema = z
                    .strictObject({
                        foo: z.union([ z.string(), z.number(), z.boolean(), z.null(), z.undefined() ]),
                        bar: z.union([ z.literal('a'), z.literal(1), z.literal(false) ])
                    });
                return schema;
            },
            expectedQuery: `${operationType} { bar, foo }`
        })
    );

    test(
        `builds a ${operationType} with a custom scalar`,
        checkQuery({
            type: operationType,
            buildSchema() {
                const schema = z
                    .strictObject({
                        foo: createCustomScalarSchema(z.object({ bar: z.record(z.string(), z.string()) }))
                    });
                return schema;
            },
            expectedQuery: `${operationType} { foo }`
        })
    );
});
