import { test } from '@sondr3/minitest';
import { oneLine } from 'common-tags';
import assert from 'node:assert';
import { z } from 'zod';
import { createQueryBuilder, type QueryBuilder, type QueryOptions } from './builder.js';
import type { QuerySchema } from './query-schema.js';
import { variablePlaceholder } from './values/variable-placeholder.js';

type TestFn = () => void;

type BuildSchema = (builder: QueryBuilder) => QuerySchema;

type ErrorTestCase = {
    type: 'mutation' | 'query';
    buildSchema: BuildSchema;
    queryOptions?: QueryOptions;
    expectedError: string;
};

function checkError(testCase: ErrorTestCase): TestFn {
    const { buildSchema, expectedError, queryOptions } = testCase;
    return () => {
        const builder = createQueryBuilder();
        const schema = buildSchema(builder);

        try {
            if (testCase.type === 'query') {
                builder.buildQuery(schema, queryOptions);
            } else {
                builder.buildMutation(schema, queryOptions);
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
    queryOptions?: QueryOptions;
    expectedQuery: string;
};

function checkQuery(testCase: QueryTestCase): TestFn {
    const { buildSchema, expectedQuery, queryOptions } = testCase;
    return () => {
        const builder = createQueryBuilder();
        const schema = buildSchema(builder);

        const result = testCase.type === 'query'
            ? builder.buildQuery(schema, queryOptions)
            : builder.buildMutation(schema, queryOptions);

        assert.strictEqual(result, expectedQuery);
    };
}

(['query', 'mutation'] as const).forEach((queryType) => {
    test(
        `throws building the ${queryType} when a referenced variable is not defined`,
        checkError({
            type: queryType,
            buildSchema(builder) {
                return z
                    .object({
                        foo: builder.registerFieldOptions(z.string(), {
                            parameters: { bar: variablePlaceholder('$bar') }
                        })
                    })
                    .strict();
            },
            queryOptions: {},
            expectedError: 'Referenced variable "$bar" is missing in variableDefinitions'
        })
    );

    test(
        `builds a simple unnamed ${queryType}`,
        checkQuery({
            type: queryType,
            buildSchema() {
                return z.object({ foo: z.string() }).strict();
            },
            expectedQuery: `${queryType} { foo }`
        })
    );

    test(
        `builds a simple named ${queryType}`,
        checkQuery({
            type: queryType,
            buildSchema() {
                return z.object({ foo: z.string() }).strict();
            },
            queryOptions: { queryName: 'queryName' },
            expectedQuery: `${queryType} queryName { foo }`
        })
    );

    test(
        `builds a simple unnamed ${queryType} with variables`,
        checkQuery({
            type: queryType,
            buildSchema(builder) {
                return z
                    .object({
                        foo: builder.registerFieldOptions(z.string(), {
                            parameters: { bar: variablePlaceholder('$bar') }
                        })
                    })
                    .strict();
            },
            queryOptions: {
                variableDefinitions: { $bar: 'String!' }
            },
            expectedQuery: `${queryType} ($bar: String!) { foo(bar: $bar) }`
        })
    );

    test(
        `builds a simple named ${queryType} with variables`,
        checkQuery({
            type: queryType,
            buildSchema(builder) {
                return z
                    .object({
                        foo: builder.registerFieldOptions(z.string(), {
                            parameters: { bar: variablePlaceholder('$bar') }
                        })
                    })
                    .strict();
            },
            queryOptions: {
                queryName: 'queryName',
                variableDefinitions: { $bar: 'String!' }
            },
            expectedQuery: `${queryType} queryName($bar: String!) { foo(bar: $bar) }`
        })
    );

    test(
        `builds a ${queryType} with multiple top-level fields`,
        checkQuery({
            type: queryType,
            buildSchema() {
                return z.object({ foo: z.string(), bar: z.number() }).strict();
            },
            expectedQuery: `${queryType} { foo, bar }`
        })
    );

    test(
        `builds a ${queryType} with nested objects`,
        checkQuery({
            type: queryType,
            buildSchema() {
                return z.object({ foo: z.object({ bar: z.object({ baz: z.number() }).strict() }).strict() }).strict();
            },
            expectedQuery: `${queryType} { foo { bar { baz } } }`
        })
    );

    test(
        `builds a ${queryType} with nested objects and multiple top-level fields`,
        checkQuery({
            type: queryType,
            buildSchema() {
                return z
                    .object({
                        foo: z.object({ bar: z.object({ baz: z.number() }).strict() }).strict(),
                        qux: z.boolean()
                    })
                    .strict();
            },
            expectedQuery: `${queryType} { foo { bar { baz } }, qux }`
        })
    );

    test(
        `builds a ${queryType} with nested objects and parameters`,
        checkQuery({
            type: queryType,
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
            expectedQuery: `${queryType} { foo { bar(parameter: "value") { baz } } }`
        })
    );

    test(
        `builds a ${queryType} with nested objects and an alias`,
        checkQuery({
            type: queryType,
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
            expectedQuery: `${queryType} { foo { bar: qux { baz } } }`
        })
    );

    test(
        `builds a ${queryType} with nested objects and an alias and parameters`,
        checkQuery({
            type: queryType,
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
            expectedQuery: `${queryType} { foo { bar: qux(parameter: "value") { baz } } }`
        })
    );

    test(
        `builds a ${queryType} with fragments`,
        checkQuery({
            type: queryType,
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
            expectedQuery: `${queryType} { foo { ... on A { __typename, valueA }, ... on B { __typename, valueB } } }`
        })
    );

    test(
        `builds a ${queryType} with fragments and parameters`,
        checkQuery({
            type: queryType,
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
            expectedQuery:
                `${queryType} { foo { ... on A { __typename, valueA(baz: "qux") }, ... on B { __typename, valueB } } }`
        })
    );

    test(
        `builds a ${queryType} with nested fragments`,
        checkQuery({
            type: queryType,
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
            expectedQuery: oneLine`${queryType} { foo { ... on A { __typename, valueA {
            ... on C { __typename, valueC }, ... on D { __typename, valueD } } },
            ... on B { __typename, valueB } } }`
        })
    );

    test(
        `builds a ${queryType} with fragments in arrays`,
        checkQuery({
            type: queryType,
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
            expectedQuery: `${queryType} { foo { ... on A { __typename, valueA }, ... on B { __typename, valueB } } }`
        })
    );

    test(
        `builds a ${queryType} with fragments in tuples`,
        checkQuery({
            type: queryType,
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
            expectedQuery: `${queryType} { foo { ... on A { __typename, valueA }, ... on B { __typename, valueB } } }`
        })
    );

    test(
        `builds a ${queryType} with fragments in nullable arrays`,
        checkQuery({
            type: queryType,
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
            expectedQuery: `${queryType} { foo { ... on A { __typename, valueA }, ... on B { __typename, valueB } } }`
        })
    );

    test(
        `builds a ${queryType} with nullable fragments in nullable arrays`,
        checkQuery({
            type: queryType,
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
            expectedQuery: `${queryType} { foo { ... on A { __typename, valueA }, ... on B { __typename, valueB } } }`
        })
    );

    test(
        `builds a ${queryType} with objects in arrays`,
        checkQuery({
            type: queryType,
            buildSchema() {
                return z
                    .object({
                        foo: z.array(z.object({ bar: z.string() }).strict())
                    })
                    .strict();
            },
            expectedQuery: `${queryType} { foo { bar } }`
        })
    );

    test(
        `builds a ${queryType} with objects in tuples`,
        checkQuery({
            type: queryType,
            buildSchema() {
                return z
                    .object({
                        foo: z.tuple([z.object({ bar: z.string() }).strict()])
                    })
                    .strict();
            },
            expectedQuery: `${queryType} { foo { bar } }`
        })
    );

    test(
        `builds a ${queryType} with objects in nullable arrays`,
        checkQuery({
            type: queryType,
            buildSchema() {
                return z
                    .object({
                        foo: z.array(z.object({ bar: z.string() }).strict()).nullable()
                    })
                    .strict();
            },
            expectedQuery: `${queryType} { foo { bar } }`
        })
    );

    test(
        `builds a ${queryType} with nullable objects in nullable arrays`,
        checkQuery({
            type: queryType,
            buildSchema() {
                return z
                    .object({
                        foo: z.array(z.object({ bar: z.string() }).strict().nullable()).nullable()
                    })
                    .strict();
            },
            expectedQuery: `${queryType} { foo { bar } }`
        })
    );

    test(
        `builds a ${queryType} with transformable object`,
        checkQuery({
            type: queryType,
            buildSchema() {
                return z
                    .object({
                        foo: z.object({ bar: z.string() }).strict().transform(() => {
                            return '';
                        })
                    })
                    .strict();
            },
            expectedQuery: `${queryType} { foo { bar } }`
        })
    );

    test(
        `builds a ${queryType} with a simple number field`,
        checkQuery({
            type: queryType,
            buildSchema() {
                return z.object({ foo: z.number() }).strict();
            },
            expectedQuery: `${queryType} { foo }`
        })
    );

    test(
        `builds a ${queryType} with a simple boolean field`,
        checkQuery({
            type: queryType,
            buildSchema() {
                return z.object({ foo: z.boolean() }).strict();
            },
            expectedQuery: `${queryType} { foo }`
        })
    );

    test(
        `builds a ${queryType} with a simple literal field`,
        checkQuery({
            type: queryType,
            buildSchema() {
                return z.object({ foo: z.literal('') }).strict();
            },
            expectedQuery: `${queryType} { foo }`
        })
    );

    test(
        `builds a ${queryType} with a simple nullable field`,
        checkQuery({
            type: queryType,
            buildSchema() {
                return z.object({ foo: z.literal('').nullable() }).strict();
            },
            expectedQuery: `${queryType} { foo }`
        })
    );

    test(
        `builds a ${queryType} with a field that is wrapped multiple times`,
        checkQuery({
            type: queryType,
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
            expectedQuery: `${queryType} { foo }`
        })
    );

    test(
        `builds a ${queryType} with a simple array field`,
        checkQuery({
            type: queryType,
            buildSchema() {
                return z.object({ foo: z.array(z.literal('')) }).strict();
            },
            expectedQuery: `${queryType} { foo }`
        })
    );
});
