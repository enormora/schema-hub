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
            builder.buildQuery(schema, queryOptions);
            assert.fail('Expected buildQuery() to fail but it did not');
        } catch (error: unknown) {
            assert.strictEqual((error as Error).message, expectedError);
        }
    };
}

type QueryTestCase = {
    buildSchema: BuildSchema;
    queryOptions?: QueryOptions;
    expectedQuery: string;
};

function checkQuery(testCase: QueryTestCase): TestFn {
    const { buildSchema, expectedQuery, queryOptions } = testCase;
    return () => {
        const builder = createQueryBuilder();
        const schema = buildSchema(builder);

        const result = builder.buildQuery(schema, queryOptions);
        assert.strictEqual(result, expectedQuery);
    };
}

test(
    'throws when a referenced variable is not defined',
    checkError({
        buildSchema(builder) {
            return z
                .object({
                    foo: builder.registerFieldOptions(z.string(), { parameters: { bar: variablePlaceholder('$bar') } })
                })
                .strict();
        },
        queryOptions: {},
        expectedError: 'Referenced variable "$bar" is missing in variableDefinitions'
    })
);

test(
    'builds a simple unnamed query',
    checkQuery({
        buildSchema() {
            return z.object({ foo: z.string() }).strict();
        },
        expectedQuery: 'query { foo }'
    })
);

test(
    'builds a simple named query',
    checkQuery({
        buildSchema() {
            return z.object({ foo: z.string() }).strict();
        },
        queryOptions: { queryName: 'queryName' },
        expectedQuery: 'query queryName { foo }'
    })
);

test(
    'builds a simple unnamed query with variables',
    checkQuery({
        buildSchema(builder) {
            return z
                .object({
                    foo: builder.registerFieldOptions(z.string(), { parameters: { bar: variablePlaceholder('$bar') } })
                })
                .strict();
        },
        queryOptions: {
            variableDefinitions: { $bar: 'String!' }
        },
        expectedQuery: 'query ($bar: String!) { foo(bar: $bar) }'
    })
);

test(
    'builds a simple named query with variables',
    checkQuery({
        buildSchema(builder) {
            return z
                .object({
                    foo: builder.registerFieldOptions(z.string(), { parameters: { bar: variablePlaceholder('$bar') } })
                })
                .strict();
        },
        queryOptions: {
            queryName: 'queryName',
            variableDefinitions: { $bar: 'String!' }
        },
        expectedQuery: 'query queryName($bar: String!) { foo(bar: $bar) }'
    })
);

test(
    'builds a query with multiple top-level fields',
    checkQuery({
        buildSchema() {
            return z.object({ foo: z.string(), bar: z.number() }).strict();
        },
        expectedQuery: 'query { foo, bar }'
    })
);

test(
    'builds a query with nested objects',
    checkQuery({
        buildSchema() {
            return z.object({ foo: z.object({ bar: z.object({ baz: z.number() }).strict() }).strict() }).strict();
        },
        expectedQuery: 'query { foo { bar { baz } } }'
    })
);

test(
    'builds a query with nested objects and multiple top-level fields',
    checkQuery({
        buildSchema() {
            return z
                .object({
                    foo: z.object({ bar: z.object({ baz: z.number() }).strict() }).strict(),
                    qux: z.boolean()
                })
                .strict();
        },
        expectedQuery: 'query { foo { bar { baz } }, qux }'
    })
);

test(
    'builds a query with nested objects and parameters',
    checkQuery({
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
        expectedQuery: 'query { foo { bar(parameter: "value") { baz } } }'
    })
);

test(
    'builds a query with nested objects and an alias',
    checkQuery({
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
        expectedQuery: 'query { foo { bar: qux { baz } } }'
    })
);

test(
    'builds a query with nested objects and an alias and parameters',
    checkQuery({
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
        expectedQuery: 'query { foo { bar: qux(parameter: "value") { baz } } }'
    })
);

test(
    'builds a query with fragments',
    checkQuery({
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
        expectedQuery: 'query { foo { ... on A { __typename, valueA }, ... on B { __typename, valueB } } }'
    })
);

test(
    'builds a query with fragments and parameters',
    checkQuery({
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
        expectedQuery: 'query { foo { ... on A { __typename, valueA(baz: "qux") }, ... on B { __typename, valueB } } }'
    })
);

test(
    'builds a query with nested fragments',
    checkQuery({
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
        expectedQuery: oneLine`query { foo { ... on A { __typename, valueA {
            ... on C { __typename, valueC }, ... on D { __typename, valueD } } },
            ... on B { __typename, valueB } } }`
    })
);

test(
    'builds a query with fragments in arrays',
    checkQuery({
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
        expectedQuery: 'query { foo { ... on A { __typename, valueA }, ... on B { __typename, valueB } } }'
    })
);

test(
    'builds a query with fragments in tuples',
    checkQuery({
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
        expectedQuery: 'query { foo { ... on A { __typename, valueA }, ... on B { __typename, valueB } } }'
    })
);

test(
    'builds a query with fragments in nullable arrays',
    checkQuery({
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
        expectedQuery: 'query { foo { ... on A { __typename, valueA }, ... on B { __typename, valueB } } }'
    })
);

test(
    'builds a query with nullable fragments in nullable arrays',
    checkQuery({
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
        expectedQuery: 'query { foo { ... on A { __typename, valueA }, ... on B { __typename, valueB } } }'
    })
);

test(
    'builds a query with objects in arrays',
    checkQuery({
        buildSchema() {
            return z
                .object({
                    foo: z.array(z.object({ bar: z.string() }).strict())
                })
                .strict();
        },
        expectedQuery: 'query { foo { bar } }'
    })
);

test(
    'builds a query with objects in tuples',
    checkQuery({
        buildSchema() {
            return z
                .object({
                    foo: z.tuple([z.object({ bar: z.string() }).strict()])
                })
                .strict();
        },
        expectedQuery: 'query { foo { bar } }'
    })
);

test(
    'builds a query with objects in nullable arrays',
    checkQuery({
        buildSchema() {
            return z
                .object({
                    foo: z.array(z.object({ bar: z.string() }).strict()).nullable()
                })
                .strict();
        },
        expectedQuery: 'query { foo { bar } }'
    })
);

test(
    'builds a query with nullable objects in nullable arrays',
    checkQuery({
        buildSchema() {
            return z
                .object({
                    foo: z.array(z.object({ bar: z.string() }).strict().nullable()).nullable()
                })
                .strict();
        },
        expectedQuery: 'query { foo { bar } }'
    })
);

test(
    'builds a query with transformable object',
    checkQuery({
        buildSchema() {
            return z
                .object({
                    foo: z.object({ bar: z.string() }).strict().transform(() => {
                        return '';
                    })
                })
                .strict();
        },
        expectedQuery: 'query { foo { bar } }'
    })
);

test(
    'builds a query with a simple number field',
    checkQuery({
        buildSchema() {
            return z.object({ foo: z.number() }).strict();
        },
        expectedQuery: 'query { foo }'
    })
);

test(
    'builds a query with a simple boolean field',
    checkQuery({
        buildSchema() {
            return z.object({ foo: z.boolean() }).strict();
        },
        expectedQuery: 'query { foo }'
    })
);

test(
    'builds a query with a simple literal field',
    checkQuery({
        buildSchema() {
            return z.object({ foo: z.literal('') }).strict();
        },
        expectedQuery: 'query { foo }'
    })
);

test(
    'builds a query with a simple nullable field',
    checkQuery({
        buildSchema() {
            return z.object({ foo: z.literal('').nullable() }).strict();
        },
        expectedQuery: 'query { foo }'
    })
);

test(
    'builds a query with a field that is wrapped multiple times',
    checkQuery({
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
        expectedQuery: 'query { foo }'
    })
);
test(
    'builds a query with a simple array field',
    checkQuery({
        buildSchema() {
            return z.object({ foo: z.array(z.literal('')) }).strict();
        },
        expectedQuery: 'query { foo }'
    })
);
