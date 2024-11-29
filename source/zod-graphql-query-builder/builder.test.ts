import { test } from '@sondr3/minitest';
import { oneLine } from 'common-tags';
import assert from 'node:assert';
import { z } from 'zod';
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

        const result = testCase.type === 'query'
            ? builder.buildQuery(schema, operationOptions)
            : builder.buildMutation(schema, operationOptions);

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
                    .object({
                        foo: builder.registerFieldOptions(z.string(), {
                            parameters: { bar: variablePlaceholder('$bar') }
                        })
                    })
                    .strict();
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
                return z.object({ foo: z.string() }).strict();
            },
            expectedQuery: `${operationType} { foo }`
        })
    );

    test(
        `builds a simple named ${operationType}`,
        checkQuery({
            type: operationType,
            buildSchema() {
                return z.object({ foo: z.string() }).strict();
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
                    .object({
                        foo: builder.registerFieldOptions(z.string(), {
                            parameters: { bar: variablePlaceholder('$bar') }
                        })
                    })
                    .strict();
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
                return z
                    .object({
                        foo: builder
                            .registerFieldOptions(z.string(), {
                                parameters: { bar: 'baz' }
                            })
                            .nullable()
                    })
                    .strict();
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
                return z
                    .object({
                        foo: builder.registerFieldOptions(
                            builder
                                .registerFieldOptions(z.string(), {
                                    parameters: { bar: 'inner-overwritten', baz: 'inner-only' }
                                })
                                .nullable(),
                            {
                                parameters: {
                                    bar: 'outer-overwritten',
                                    qux: 'outer-only'
                                }
                            }
                        )
                    })
                    .strict();
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
                    .object({
                        foo: builder.registerFieldOptions(z.string(), {
                            parameters: { bar: variablePlaceholder('$bar') }
                        })
                    })
                    .strict();
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
                return z.object({ foo: z.string(), bar: z.number() }).strict();
            },
            expectedQuery: `${operationType} { foo, bar }`
        })
    );

    test(
        `builds a ${operationType} with nested objects`,
        checkQuery({
            type: operationType,
            buildSchema() {
                return z.object({ foo: z.object({ bar: z.object({ baz: z.number() }).strict() }).strict() }).strict();
            },
            expectedQuery: `${operationType} { foo { bar { baz } } }`
        })
    );

    test(
        `builds a ${operationType} with nested objects and multiple top-level fields`,
        checkQuery({
            type: operationType,
            buildSchema() {
                return z
                    .object({
                        foo: z.object({ bar: z.object({ baz: z.number() }).strict() }).strict(),
                        qux: z.boolean()
                    })
                    .strict();
            },
            expectedQuery: `${operationType} { foo { bar { baz } }, qux }`
        })
    );

    test(
        `builds a ${operationType} with nested objects and parameters`,
        checkQuery({
            type: operationType,
            buildSchema(builder) {
                return z
                    .object({
                        foo: z
                            .object({
                                bar: builder.registerFieldOptions(z.object({ baz: z.number() }).strict(), {
                                    parameters: { parameter: 'value' }
                                })
                            })
                            .strict()
                    })
                    .strict();
            },
            expectedQuery: `${operationType} { foo { bar(parameter: "value") { baz } } }`
        })
    );

    test(
        `builds a ${operationType} with nested objects and an alias`,
        checkQuery({
            type: operationType,
            buildSchema(builder) {
                return z
                    .object({
                        foo: z
                            .object({
                                bar: builder.registerFieldOptions(z.object({ baz: z.number() }).strict(), {
                                    aliasFor: 'qux'
                                })
                            })
                            .strict()
                    })
                    .strict();
            },
            expectedQuery: `${operationType} { foo { bar: qux { baz } } }`
        })
    );

    test(
        `builds a ${operationType} with nested objects and an alias and parameters`,
        checkQuery({
            type: operationType,
            buildSchema(builder) {
                return z
                    .object({
                        foo: z
                            .object({
                                bar: builder.registerFieldOptions(z.object({ baz: z.number() }).strict(), {
                                    aliasFor: 'qux',
                                    parameters: { parameter: 'value' }
                                })
                            })
                            .strict()
                    })
                    .strict();
            },
            expectedQuery: `${operationType} { foo { bar: qux(parameter: "value") { baz } } }`
        })
    );
    // example test with new expected query
    test(
        `builds a ${operationType} with fragments`,
        checkQuery({
            type: operationType,
            buildSchema() {
                return z
                    .object({
                        foo: z.discriminatedUnion('__typename', [
                            z.object({ __typename: z.literal('A'), valueA: z.string() }).strict(),
                            z.object({ __typename: z.literal('B'), valueB: z.string() }).strict()
                        ])
                    })
                    .strict();
            },
            expectedQuery: `${operationType} { foo { __typename, ... on A { valueA }, ... on B { valueB } } }`
        })
    );

    test(
        `builds a ${operationType} with fragments and parameters`,
        checkQuery({
            type: operationType,
            buildSchema(builder) {
                return z
                    .object({
                        foo: z.discriminatedUnion('__typename', [
                            z
                                .object({
                                    __typename: z.literal('A'),
                                    valueA: builder.registerFieldOptions(z.string(), { parameters: { baz: 'qux' } })
                                })
                                .strict(),
                            z.object({ __typename: z.literal('B'), valueB: z.string() }).strict()
                        ])
                    })
                    .strict();
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
                return z
                    .object({
                        foo: z.discriminatedUnion('__typename', [
                            z
                                .object({
                                    __typename: z.literal('A'),
                                    valueA: z.discriminatedUnion('__typename', [
                                        z.object({ __typename: z.literal('C'), valueC: z.string() }).strict(),
                                        z.object({ __typename: z.literal('D'), valueD: z.string() }).strict()
                                    ])
                                })
                                .strict(),
                            z.object({ __typename: z.literal('B'), valueB: z.string() }).strict()
                        ])
                    })
                    .strict();
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
                return z
                    .object({
                        foo: z.array(z.discriminatedUnion('__typename', [
                            z.object({ __typename: z.literal('A'), valueA: z.string() }).strict(),
                            z.object({ __typename: z.literal('B'), valueB: z.string() }).strict()
                        ]))
                    })
                    .strict();
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
                return z
                    .object({
                        foo: z.tuple([z.discriminatedUnion('__typename', [
                            z.object({ __typename: z.literal('A'), valueA: z.string() }).strict(),
                            z.object({ __typename: z.literal('B'), valueB: z.string() }).strict()
                        ])])
                    })
                    .strict();
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
                return z
                    .object({
                        foo: z
                            .array(z.discriminatedUnion('__typename', [
                                z.object({ __typename: z.literal('A'), valueA: z.string() }).strict(),
                                z.object({ __typename: z.literal('B'), valueB: z.string() }).strict()
                            ]))
                            .nullable()
                    })
                    .strict();
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
                return z
                    .object({
                        foo: z
                            .array(
                                z
                                    .discriminatedUnion('__typename', [
                                        z.object({ __typename: z.literal('A'), valueA: z.string() }).strict(),
                                        z.object({ __typename: z.literal('B'), valueB: z.string() }).strict()
                                    ])
                                    .nullable()
                            )
                            .nullable()
                    })
                    .strict();
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
                return z
                    .object({
                        foo: z.array(z.object({ bar: z.string() }).strict())
                    })
                    .strict();
            },
            expectedQuery: `${operationType} { foo { bar } }`
        })
    );

    test(
        `builds a ${operationType} with objects in tuples`,
        checkQuery({
            type: operationType,
            buildSchema() {
                return z
                    .object({
                        foo: z.tuple([z.object({ bar: z.string() }).strict()])
                    })
                    .strict();
            },
            expectedQuery: `${operationType} { foo { bar } }`
        })
    );

    test(
        `builds a ${operationType} with objects in nullable arrays`,
        checkQuery({
            type: operationType,
            buildSchema() {
                return z
                    .object({
                        foo: z.array(z.object({ bar: z.string() }).strict()).nullable()
                    })
                    .strict();
            },
            expectedQuery: `${operationType} { foo { bar } }`
        })
    );

    test(
        `builds a ${operationType} with nullable objects in nullable arrays`,
        checkQuery({
            type: operationType,
            buildSchema() {
                return z
                    .object({
                        foo: z.array(z.object({ bar: z.string() }).strict().nullable()).nullable()
                    })
                    .strict();
            },
            expectedQuery: `${operationType} { foo { bar } }`
        })
    );

    test(
        `builds a ${operationType} with transformable object`,
        checkQuery({
            type: operationType,
            buildSchema() {
                return z
                    .object({
                        foo: z.object({ bar: z.string() }).strict().transform(() => {
                            return '';
                        })
                    })
                    .strict();
            },
            expectedQuery: `${operationType} { foo { bar } }`
        })
    );

    test(
        `builds a ${operationType} with a simple number field`,
        checkQuery({
            type: operationType,
            buildSchema() {
                return z.object({ foo: z.number() }).strict();
            },
            expectedQuery: `${operationType} { foo }`
        })
    );

    test(
        `builds a ${operationType} with a simple boolean field`,
        checkQuery({
            type: operationType,
            buildSchema() {
                return z.object({ foo: z.boolean() }).strict();
            },
            expectedQuery: `${operationType} { foo }`
        })
    );

    test(
        `builds a ${operationType} with a simple literal field`,
        checkQuery({
            type: operationType,
            buildSchema() {
                return z.object({ foo: z.literal('') }).strict();
            },
            expectedQuery: `${operationType} { foo }`
        })
    );

    test(
        `builds a ${operationType} with a simple nullable field`,
        checkQuery({
            type: operationType,
            buildSchema() {
                return z.object({ foo: z.literal('').nullable() }).strict();
            },
            expectedQuery: `${operationType} { foo }`
        })
    );

    test(
        `builds a ${operationType} with a field that is wrapped multiple times`,
        checkQuery({
            type: operationType,
            buildSchema() {
                return z
                    .object({
                        foo: z
                            .lazy(() => {
                                return z.literal('').nullable();
                            })
                            .transform(() => {
                                return '';
                            })
                    })
                    .strict();
            },
            expectedQuery: `${operationType} { foo }`
        })
    );

    test(
        `builds a ${operationType} with a simple array field`,
        checkQuery({
            type: operationType,
            buildSchema() {
                return z.object({ foo: z.array(z.literal('')) }).strict();
            },
            expectedQuery: `${operationType} { foo }`
        })
    );

    test(
        `builds a ${operationType} ignoring fields which are always undefined`,
        checkQuery({
            type: operationType,
            buildSchema() {
                return z.object({ foo: z.string(), bar: z.undefined() }).strict();
            },
            expectedQuery: `${operationType} { foo }`
        })
    );

    test(
        `builds a ${operationType} with readonly fields`,
        checkQuery({
            type: operationType,
            buildSchema() {
                return z.object({ foo: z.array(z.string()).readonly() }).strict();
            },
            expectedQuery: `${operationType} { foo }`
        })
    );

    test(
        `builds a ${operationType} with union of primitives fields`,
        checkQuery({
            type: operationType,
            buildSchema() {
                return z
                    .object({
                        foo: z.union([z.string(), z.number(), z.boolean(), z.null(), z.undefined()]),
                        bar: z.union([z.literal('a'), z.literal(1), z.literal(false)])
                    })
                    .strict();
            },
            expectedQuery: `${operationType} { foo, bar }`
        })
    );

    test(
        `builds a ${operationType} with a custom scalar`,
        checkQuery({
            type: operationType,
            buildSchema() {
                return z
                    .object({
                        foo: createCustomScalarSchema(z.object({ bar: z.record(z.string()) }).strip())
                    })
                    .strict();
            },
            expectedQuery: `${operationType} { foo }`
        })
    );
});

test('a schema with custom scalar validates correctly', () => {
    const schema = z
        .object({
            foo: createCustomScalarSchema(z.object({ bar: z.record(z.string()) }).strip())
        })
        .strict();

    const result = schema.safeParse({ foo: { bar: 'bar' } });

    assert.strictEqual(result.error?.issues[0]?.message, 'Expected object, received string');
});
