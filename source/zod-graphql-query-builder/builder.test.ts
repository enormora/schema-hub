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

    test(
        `builds a ${operationType} keeping a single-use typed schema inline`,
        checkQuery({
            type: operationType,
            buildSchema(builder) {
                const baseUserSchema = z.strictObject({ id: z.string(), name: z.string() });
                const userSchema = builder.registerFieldOptions(baseUserSchema, { typeName: 'User' });
                return z.strictObject({ me: userSchema });
            },
            expectedQuery: `${operationType} { me { id, name } }`
        })
    );

    test(
        `builds a ${operationType} hoisting a typed schema reused twice into a named fragment`,
        checkQuery({
            type: operationType,
            buildSchema(builder) {
                const baseUserSchema = z.strictObject({ id: z.string(), name: z.string() });
                const userSchema = builder.registerFieldOptions(baseUserSchema, { typeName: 'User' });
                return z.strictObject({ me: userSchema, you: userSchema });
            },
            expectedQuery:
                `${operationType} { me { ...User_1 }, you { ...User_1 } } fragment User_1 on User { id, name }`
        })
    );

    test(
        `builds a ${operationType} sharing one fragment across three use sites`,
        checkQuery({
            type: operationType,
            buildSchema(builder) {
                const baseUserSchema = z.strictObject({ id: z.string() });
                const userSchema = builder.registerFieldOptions(baseUserSchema, { typeName: 'User' });
                return z.strictObject({ a: userSchema, b: userSchema, c: userSchema });
            },
            expectedQuery: oneLine`
                ${operationType} { a { ...User_1 }, b { ...User_1 }, c { ...User_1 } }
                fragment User_1 on User { id }
            `
        })
    );

    test(
        `builds a ${operationType} keeping a reused schema inline when no typeName is registered`,
        checkQuery({
            type: operationType,
            buildSchema() {
                const userSchema = z.strictObject({ id: z.string(), name: z.string() });
                return z.strictObject({ me: userSchema, you: userSchema });
            },
            expectedQuery: `${operationType} { me { id, name }, you { id, name } }`
        })
    );

    test(
        `builds a ${operationType} deriving the typeName from a __typename literal on a reused schema`,
        checkQuery({
            type: operationType,
            buildSchema() {
                const userSchema = z.strictObject({
                    __typename: z.literal('User'),
                    id: z.string()
                });
                return z.strictObject({ me: userSchema, you: userSchema });
            },
            expectedQuery: oneLine`
                ${operationType} { me { ...User_1 }, you { ...User_1 } }
                fragment User_1 on User { __typename, id }
            `
        })
    );

    test(
        `throws building the ${operationType} when an explicit typeName conflicts with the __typename literal`,
        checkError({
            type: operationType,
            buildSchema(builder) {
                const baseUserSchema = z.strictObject({ __typename: z.literal('B'), id: z.string() });
                const userSchema = builder.registerFieldOptions(baseUserSchema, { typeName: 'A' });
                return z.strictObject({ first: userSchema, second: userSchema });
            },
            expectedError:
                'Conflicting GraphQL type name for schema: registered as "A" but `__typename` literal is "B".'
        })
    );

    test(
        `builds a ${operationType} treating a non-literal __typename as no inferred typeName`,
        checkQuery({
            type: operationType,
            buildSchema() {
                const userSchema = z.strictObject({
                    __typename: z.string(),
                    id: z.string()
                });
                return z.strictObject({ me: userSchema, you: userSchema });
            },
            expectedQuery: `${operationType} { me { __typename, id }, you { __typename, id } }`
        })
    );

    test(
        `builds a ${operationType} treating a non-string __typename literal as no inferred typeName`,
        checkQuery({
            type: operationType,
            buildSchema() {
                const userSchema = z.strictObject({
                    // eslint-disable-next-line @typescript-eslint/no-magic-numbers -- arbitrary non-string literal value
                    __typename: z.literal(42),
                    id: z.string()
                });
                return z.strictObject({ me: userSchema, you: userSchema });
            },
            expectedQuery: `${operationType} { me { __typename, id }, you { __typename, id } }`
        })
    );

    test(
        `builds a ${operationType} treating an invalid identifier __typename literal as no inferred typeName`,
        checkQuery({
            type: operationType,
            buildSchema() {
                const userSchema = z.strictObject({
                    __typename: z.literal('123-bad'),
                    id: z.string()
                });
                return z.strictObject({ me: userSchema, you: userSchema });
            },
            expectedQuery: `${operationType} { me { __typename, id }, you { __typename, id } }`
        })
    );

    test(
        `builds a ${operationType} hoisting discriminated-union options into fragments when the union is reused`,
        checkQuery({
            type: operationType,
            buildSchema() {
                const union = z.discriminatedUnion('__typename', [
                    z.strictObject({ __typename: z.literal('A'), valueA: z.string() }),
                    z.strictObject({ __typename: z.literal('B'), valueB: z.string() })
                ]);
                return z.strictObject({ first: union, second: union });
            },
            expectedQuery: oneLine`
                ${operationType} { first { ...A_1, ...B_1 }, second { ...A_1, ...B_1 } }
                fragment A_1 on A { __typename, valueA }
                fragment B_1 on B { __typename, valueB }
            `
        })
    );

    test(
        `builds a ${operationType} keeping single-use union options inline while hoisting reused ones`,
        checkQuery({
            type: operationType,
            buildSchema() {
                const sharedA = z.strictObject({ __typename: z.literal('A'), valueA: z.string() });
                const union = z.discriminatedUnion('__typename', [
                    sharedA,
                    z.strictObject({ __typename: z.literal('B'), valueB: z.string() })
                ]);
                return z.strictObject({ direct: sharedA, mixed: union });
            },
            expectedQuery: oneLine`
                ${operationType} { direct { ...A_1 }, mixed { ...A_1, ... on B { __typename, valueB } } }
                fragment A_1 on A { __typename, valueA }
            `
        })
    );

    test(
        `builds a ${operationType} emitting nested fragments for reused schemas inside reused schemas`,
        checkQuery({
            type: operationType,
            buildSchema(builder) {
                const baseAddressSchema = z.strictObject({ street: z.string(), city: z.string() });
                const addressSchema = builder.registerFieldOptions(baseAddressSchema, { typeName: 'Address' });
                const baseUserSchema = z.strictObject({ id: z.string(), address: addressSchema });
                const userSchema = builder.registerFieldOptions(baseUserSchema, { typeName: 'User' });
                return z.strictObject({ me: userSchema, you: userSchema });
            },
            expectedQuery: oneLine`
                ${operationType} { me { ...User_1 }, you { ...User_1 } }
                fragment Address_1 on Address { street, city }
                fragment User_1 on User { id, address { ...Address_1 } }
            `
        })
    );

    test(
        `builds a ${operationType} propagating variables from inside a fragmented body to the operation`,
        checkQuery({
            type: operationType,
            buildSchema(builder) {
                const baseUserSchema = z.strictObject({
                    id: z.string(),
                    avatar: builder.registerFieldOptions(z.string(), {
                        parameters: { size: variablePlaceholder('$size') }
                    })
                });
                const userSchema = builder.registerFieldOptions(baseUserSchema, { typeName: 'User' });
                return z.strictObject({ me: userSchema, you: userSchema });
            },
            operationOptions: { variableDefinitions: { $size: 'Int!' } },
            expectedQuery: oneLine`
                ${operationType} ($size: Int!) { me { ...User_1 }, you { ...User_1 } }
                fragment User_1 on User { id, avatar(size: $size) }
            `
        })
    );

    test(
        `throws building the ${operationType} when a variable referenced inside a fragment is not declared`,
        checkError({
            type: operationType,
            buildSchema(builder) {
                const baseUserSchema = z.strictObject({
                    id: z.string(),
                    avatar: builder.registerFieldOptions(z.string(), {
                        parameters: { size: variablePlaceholder('$size') }
                    })
                });
                const userSchema = builder.registerFieldOptions(baseUserSchema, { typeName: 'User' });
                return z.strictObject({ me: userSchema, you: userSchema });
            },
            operationOptions: {},
            expectedError: 'Referenced variable "$size" is missing in variableDefinitions'
        })
    );

    test(
        `builds a ${operationType} disambiguating two distinct schemas registered with the same typeName`,
        checkQuery({
            type: operationType,
            buildSchema(builder) {
                const baseUserA = z.strictObject({ id: z.string() });
                const userA = builder.registerFieldOptions(baseUserA, { typeName: 'User' });
                const baseUserB = z.strictObject({ id: z.string(), name: z.string() });
                const userB = builder.registerFieldOptions(baseUserB, { typeName: 'User' });
                return z.strictObject({
                    a1: userA,
                    a2: userA,
                    b1: userB,
                    b2: userB
                });
            },
            expectedQuery: oneLine`
                ${operationType} { a1 { ...User_1 }, a2 { ...User_1 }, b1 { ...User_2 }, b2 { ...User_2 } }
                fragment User_1 on User { id }
                fragment User_2 on User { id, name }
            `
        })
    );

    test(
        `builds a ${operationType} deduping the same object reached through a wrapper and a plain reference`,
        checkQuery({
            type: operationType,
            buildSchema(builder) {
                const baseUserSchema = z.strictObject({ id: z.string() });
                const userSchema = builder.registerFieldOptions(baseUserSchema, { typeName: 'User' });
                const wrappedUserSchema = z.nullable(userSchema);
                return z.strictObject({
                    plain: userSchema,
                    wrapped: wrappedUserSchema
                });
            },
            expectedQuery:
                `${operationType} { plain { ...User_1 }, wrapped { ...User_1 } } fragment User_1 on User { id }`
        })
    );

    test(
        `builds a ${operationType} producing a self-recursive fragment for a cyclic typed schema`,
        checkQuery({
            type: operationType,
            buildSchema(builder) {
                const holder: { value: unknown; } = { value: null };
                const baseUserSchema = z.strictObject({
                    id: z.string(),
                    friends: z.array(z.lazy(() => {
                        return holder.value as never;
                    }))
                });
                holder.value = baseUserSchema;
                const userSchema = builder.registerFieldOptions(baseUserSchema, { typeName: 'User' });
                return z.strictObject({ me: userSchema });
            },
            expectedQuery: `${operationType} { me { ...User_1 } } fragment User_1 on User { id, friends { ...User_1 } }`
        })
    );

    test(
        `throws building the ${operationType} when a cyclic schema has no resolvable typeName`,
        checkError({
            type: operationType,
            buildSchema() {
                const holder: { value: unknown; } = { value: null };
                const userSchema = z.strictObject({
                    id: z.string(),
                    friends: z.array(z.lazy(() => {
                        return holder.value as never;
                    }))
                });
                holder.value = userSchema;
                return z.strictObject({ me: userSchema });
            },
            expectedError: 'Cyclic schema detected without a resolvable GraphQL type name. ' +
                "Register it with graphqlFieldOptions(schema, { typeName: '...' }) " +
                "or add `__typename: z.literal('...')` to its shape so the builder can emit a named fragment."
        })
    );
});

test('throws at registration when typeName is not a valid GraphQL identifier', () => {
    const builder = createQueryBuilder();
    const baseSchema = z.strictObject({ id: z.string() });

    try {
        builder.registerFieldOptions(baseSchema, { typeName: 'bad-name!' });
        assert.fail('Expected registerFieldOptions to throw');
    } catch (error: unknown) {
        assert.strictEqual(
            (error as Error).message,
            'Invalid GraphQL type name: "bad-name!". A type name must match /^[A-Z_a-z]\\w*$/.'
        );
    }
});

test('a schema with custom scalar validates correctly', () => {
    const schema = z
        .strictObject({
            foo: createCustomScalarSchema(z.object({ bar: z.record(z.string(), z.string()) }))
        });

    const result = schema.safeParse({ foo: { bar: 'bar' } });

    assert.strictEqual(result.error?.issues[0]?.message, 'Invalid input: expected record, received string');
});
