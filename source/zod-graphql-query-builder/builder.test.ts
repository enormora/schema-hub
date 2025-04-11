import { test } from '@sondr3/minitest';
import { oneLine } from 'common-tags';
import assert from 'node:assert';
import { z } from 'zod/v4-mini';
import { createQueryBuilder, type OperationOptions, type QueryBuilder } from './builder.js';
import { createCustomScalarSchema } from './custom-scalar.js';
import type { QuerySchema } from './query-schema.js';
import { variablePlaceholder } from './values/variable-placeholder.js';

type TestFn = () => void;

type BuildSchema = (builder: QueryBuilder) => QuerySchema;

type ErrorTestCase = {
    type: 'mutation' | 'query';
    buildSchema: BuildSchema;
    operationOptions?: OperationOptions;
    expectedError: string;
};

function checkError(testCase: ErrorTestCase): TestFn {
    const { buildSchema, expectedError, operationOptions } = testCase;
    return () => {
        const builder = createQueryBuilder();
        const schema = buildSchema(builder);

        try {
            if (testCase.type === 'query') {
                builder.buildQuery(schema, operationOptions);
            } else {
                builder.buildMutation(schema, operationOptions);
            }
            assert.fail('Expected buildQuery() to fail but it did not');
        } catch (error: unknown) {
            assert.strictEqual((error as Error).message, expectedError);
        }
    };
}

type QueryTestCase = {
    type: 'mutation' | 'query';
    buildSchema: BuildSchema;
    operationOptions?: OperationOptions;
    expectedQuery: string;
};

function checkQuery(testCase: QueryTestCase): TestFn {
    const { buildSchema, expectedQuery, operationOptions } = testCase;
    return () => {
        const builder = createQueryBuilder();
        const schema = buildSchema(builder);

        const result = testCase.type === 'query' ?
            builder.buildQuery(schema, operationOptions) :
            builder.buildMutation(schema, operationOptions);

        assert.strictEqual(result, expectedQuery);
    };
}

(['query', 'mutation'] as const).forEach((operationType) => {
    test(
        `throws building the ${operationType} when a referenced variable is not defined`,
        checkError({
            type: operationType,
            buildSchema(builder) {
                return z
                    .strictObject({
                        foo: builder.registerFieldOptions(z.string(), {
                            parameters: { bar: variablePlaceholder('$bar') }
                        })
                    });
            },
            operationOptions: {},
            expectedError: 'Referenced variable "$bar" is missing in variableDefinitions'
        })
    );

    test(
        `builds a simple unnamed ${operationType}`,
        checkQuery({
            type: operationType,
            buildSchema() {
                return z.strictObject({ foo: z.string() });
            },
            expectedQuery: `${operationType} { foo }`
        })
    );

    test(
        `builds a simple named ${operationType}`,
        checkQuery({
            type: operationType,
            buildSchema() {
                return z.strictObject({ foo: z.string() });
            },
            operationOptions: { operationName: 'theOperationName' },
            expectedQuery: `${operationType} theOperationName { foo }`
        })
    );

    test(
        `builds a simple unnamed ${operationType} with variables`,
        checkQuery({
            type: operationType,
            buildSchema(builder) {
                return z
                    .strictObject({
                        foo: builder.registerFieldOptions(z.string(), {
                            parameters: { bar: variablePlaceholder('$bar') }
                        })
                    });
            },
            operationOptions: {
                variableDefinitions: { $bar: 'String!' }
            },
            expectedQuery: `${operationType} ($bar: String!) { foo(bar: $bar) }`
        })
    );

    test(
        `builds a simple ${operationType} using field options which are composed with zod methods`,
        checkQuery({
            type: operationType,
            buildSchema(builder) {
                const schema = z
                    .strictObject({
                        foo: z.nullable(builder
                            .registerFieldOptions(z.string(), {
                                parameters: { bar: 'baz' }
                            }))
                    });

                return schema;
            },
            expectedQuery: `${operationType} { foo(bar: "baz") }`
        })
    );

    test(
        oneLine`builds a simple ${operationType} using the outmost defined field options when
            there are defined multiple for the same field`,
        checkQuery({
            type: operationType,
            buildSchema(builder) {
                const schema = z
                    .strictObject({
                        foo: builder.registerFieldOptions(
                            z.nullable(
                                builder
                                    .registerFieldOptions(z.string(), {
                                        parameters: { bar: 'inner-overwritten', baz: 'inner-only' }
                                    })
                            ),
                            {
                                parameters: {
                                    bar: 'outer-overwritten',
                                    qux: 'outer-only'
                                }
                            }
                        )
                    });

                return schema;
            },
            expectedQuery: `${operationType} { foo(bar: "outer-overwritten", qux: "outer-only") }`
        })
    );

    test(
        `builds a simple named ${operationType} with variables`,
        checkQuery({
            type: operationType,
            buildSchema(builder) {
                return z
                    .strictObject({
                        foo: builder.registerFieldOptions(z.string(), {
                            parameters: { bar: variablePlaceholder('$bar') }
                        })
                    });
            },
            operationOptions: {
                operationName: 'theOperationName',
                variableDefinitions: { $bar: 'String!' }
            },
            expectedQuery: `${operationType} theOperationName($bar: String!) { foo(bar: $bar) }`
        })
    );

    test(
        `builds a ${operationType} with multiple top-level fields`,
        checkQuery({
            type: operationType,
            buildSchema() {
                return z.strictObject({ foo: z.string(), bar: z.number() });
            },
            expectedQuery: `${operationType} { foo, bar }`
        })
    );

    test(
        `builds a ${operationType} with nested objects`,
        checkQuery({
            type: operationType,
            buildSchema() {
                const schema = z.strictObject({ foo: z.strictObject({ bar: z.strictObject({ baz: z.number() }) }) });
                return schema;
            },
            expectedQuery: `${operationType} { foo { bar { baz } } }`
        })
    );

    test(
        `builds a ${operationType} with nested objects and multiple top-level fields`,
        checkQuery({
            type: operationType,
            buildSchema() {
                const schema = z
                    .strictObject({
                        foo: z.strictObject({ bar: z.strictObject({ baz: z.number() }) }),
                        qux: z.boolean()
                    });
                return schema;
            },
            expectedQuery: `${operationType} { foo { bar { baz } }, qux }`
        })
    );

    test(
        `builds a ${operationType} with nested objects and parameters`,
        checkQuery({
            type: operationType,
            buildSchema(builder) {
                const schema = z
                    .strictObject({
                        foo: z
                            .strictObject({
                                bar: builder.registerFieldOptions(z.strictObject({ baz: z.number() }), {
                                    parameters: { parameter: 'value' }
                                })
                            })
                    });
                return schema;
            },
            expectedQuery: `${operationType} { foo { bar(parameter: "value") { baz } } }`
        })
    );

    test(
        `builds a ${operationType} with nested objects and an alias`,
        checkQuery({
            type: operationType,
            buildSchema(builder) {
                const schema = z
                    .strictObject({
                        foo: z
                            .strictObject({
                                bar: builder.registerFieldOptions(z.strictObject({ baz: z.number() }), {
                                    aliasFor: 'qux'
                                })
                            })
                    });
                return schema;
            },
            expectedQuery: `${operationType} { foo { bar: qux { baz } } }`
        })
    );

    test(
        `builds a ${operationType} with nested objects and an alias and parameters`,
        checkQuery({
            type: operationType,
            buildSchema(builder) {
                const schema = z
                    .strictObject({
                        foo: z
                            .strictObject({
                                bar: builder.registerFieldOptions(z.strictObject({ baz: z.number() }), {
                                    aliasFor: 'qux',
                                    parameters: { parameter: 'value' }
                                })
                            })
                    });
                return schema;
            },
            expectedQuery: `${operationType} { foo { bar: qux(parameter: "value") { baz } } }`
        })
    );

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

    test(
        `builds a ${operationType} with transformable object`,
        checkQuery({
            type: operationType,
            buildSchema() {
                const schema = z
                    .strictObject({
                        foo: z.pipe(
                            z.strictObject({ bar: z.string() }),
                            z.transform(() => {
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
                                .lazy(() => {
                                    return z.nullable(z.literal(''));
                                }),
                            z.transform(() => {
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
                        foo: z.union([z.string(), z.number(), z.boolean(), z.null(), z.undefined()]),
                        bar: z.union([z.literal('a'), z.literal(1), z.literal(false)])
                    });
                return schema;
            },
            expectedQuery: `${operationType} { foo, bar }`
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

test('a schema with custom scalar validates correctly', () => {
    const schema = z
        .strictObject({
            foo: createCustomScalarSchema(z.object({ bar: z.record(z.string(), z.string()) }))
        });

    const result = schema.safeParse({ foo: { bar: 'bar' } });

    assert.strictEqual(result.error?.issues[0]?.message, 'Invalid input: expected record, received string');
});
