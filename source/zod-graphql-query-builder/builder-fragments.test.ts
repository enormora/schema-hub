import { test } from '@sondr3/minitest';
import { oneLine } from 'common-tags';
import { z } from 'zod/v4-mini';
import { checkQuery } from '../test-libraries/check-build-output.js';

(['query', 'mutation'] as const).forEach((operationType) => {
    test(
        `builds a ${operationType} with fragments`,
        checkQuery({
            type: operationType,
            buildSchema() {
                const schema = z
                    .strictObject({
                        foo: z.discriminatedUnion('__typename', [
                            z.strictObject({ __typename: z.literal('A'), valueA: z.string() }),
                            z.strictObject({ __typename: z.literal('B'), valueB: z.string() })
                        ])
                    });
                return schema;
            },
            expectedQuery:
                `${operationType} { foo { ... on A { __typename, valueA }, ... on B { __typename, valueB } } }`
        })
    );

    test(
        `builds a ${operationType} with fragments and parameters`,
        checkQuery({
            type: operationType,
            buildSchema(builder) {
                const schema = z
                    .strictObject({
                        foo: z.discriminatedUnion('__typename', [
                            z
                                .strictObject({
                                    __typename: z.literal('A'),
                                    valueA: builder.registerFieldOptions(z.string(), { parameters: { baz: 'qux' } })
                                }),
                            z.strictObject({ __typename: z.literal('B'), valueB: z.string() })
                        ])
                    });
                return schema;
            },
            expectedQuery: oneLine`${operationType} { foo { ... on A {
                __typename, valueA(baz: "qux") }, ... on B { __typename, valueB } } }`
        })
    );

    test(
        `builds a ${operationType} with nested fragments`,
        checkQuery({
            type: operationType,
            buildSchema() {
                const schema = z
                    .strictObject({
                        foo: z.discriminatedUnion('__typename', [
                            z
                                .strictObject({
                                    __typename: z.literal('A'),
                                    valueA: z.discriminatedUnion('__typename', [
                                        z.strictObject({ __typename: z.literal('C'), valueC: z.string() }),
                                        z.strictObject({ __typename: z.literal('D'), valueD: z.string() })
                                    ])
                                }),
                            z.strictObject({ __typename: z.literal('B'), valueB: z.string() })
                        ])
                    });
                return schema;
            },
            expectedQuery: oneLine`${operationType} { foo { ... on A { __typename, valueA {
            ... on C { __typename, valueC }, ... on D { __typename, valueD } } },
            ... on B { __typename, valueB } } }`
        })
    );

    test(
        `builds a ${operationType} with fragments in arrays`,
        checkQuery({
            type: operationType,
            buildSchema() {
                const schema = z
                    .strictObject({
                        foo: z.array(z.discriminatedUnion('__typename', [
                            z.strictObject({ __typename: z.literal('A'), valueA: z.string() }),
                            z.strictObject({ __typename: z.literal('B'), valueB: z.string() })
                        ]))
                    });
                return schema;
            },
            expectedQuery:
                `${operationType} { foo { ... on A { __typename, valueA }, ... on B { __typename, valueB } } }`
        })
    );

    test(
        `builds a ${operationType} with fragments in tuples`,
        checkQuery({
            type: operationType,
            buildSchema() {
                const schema = z
                    .strictObject({
                        foo: z.tuple([z.discriminatedUnion('__typename', [
                            z.strictObject({ __typename: z.literal('A'), valueA: z.string() }),
                            z.strictObject({ __typename: z.literal('B'), valueB: z.string() })
                        ])])
                    });
                return schema;
            },
            expectedQuery:
                `${operationType} { foo { ... on A { __typename, valueA }, ... on B { __typename, valueB } } }`
        })
    );

    test(
        `builds a ${operationType} with fragments in nullable arrays`,
        checkQuery({
            type: operationType,
            buildSchema() {
                const schema = z
                    .strictObject({
                        foo: z.nullable(z
                            .array(z.discriminatedUnion('__typename', [
                                z.strictObject({ __typename: z.literal('A'), valueA: z.string() }),
                                z.strictObject({ __typename: z.literal('B'), valueB: z.string() })
                            ])))
                    });
                return schema;
            },
            expectedQuery:
                `${operationType} { foo { ... on A { __typename, valueA }, ... on B { __typename, valueB } } }`
        })
    );

    test(
        `builds a ${operationType} with nullable fragments in nullable arrays`,
        checkQuery({
            type: operationType,
            buildSchema() {
                const schema = z
                    .strictObject({
                        foo: z.nullable(z
                            .array(
                                z.nullable(z
                                    .discriminatedUnion('__typename', [
                                        z.strictObject({ __typename: z.literal('A'), valueA: z.string() }),
                                        z.strictObject({ __typename: z.literal('B'), valueB: z.string() })
                                    ]))
                            ))
                    });
                return schema;
            },
            expectedQuery:
                `${operationType} { foo { ... on A { __typename, valueA }, ... on B { __typename, valueB } } }`
        })
    );
});
