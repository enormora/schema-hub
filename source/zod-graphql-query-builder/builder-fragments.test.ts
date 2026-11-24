import { test } from '@sondr3/minitest';
import { oneLine } from 'common-tags';
import { z } from 'zod/v4-mini';
import { checkQuery } from '../test-libraries/check-build-output.ts';

([ 'query', 'mutation' ] as const).forEach(function (operationType) {
    test(
        `builds a ${operationType} with fragments`,
        checkQuery({
            type: operationType,
            buildSchema() {
                const fragmentsSchema = z.discriminatedUnion('__typename', [
                    z.strictObject({ __typename: z.literal('A'), valueA: z.string() }),
                    z.strictObject({ __typename: z.literal('B'), valueB: z.string() })
                ]);
                const schema = z.strictObject({ foo: fragmentsSchema });
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
                const valueASchema = builder.registerFieldOptions(z.string(), { parameters: { baz: 'qux' } });
                const fragmentsSchema = z.discriminatedUnion('__typename', [
                    z.strictObject({ __typename: z.literal('A'), valueA: valueASchema }),
                    z.strictObject({ __typename: z.literal('B'), valueB: z.string() })
                ]);
                const schema = z.strictObject({ foo: fragmentsSchema });
                return schema;
            },
            expectedQuery: oneLine`${operationType} { foo { ... on A {
                __typename, valueA(baz: "qux") }, ... on B { __typename, valueB } } }`
        })
    );

    test(
        `builds a ${operationType} with fragments for multi-value typenames`,
        checkQuery({
            type: operationType,
            buildSchema() {
                const fragmentsSchema = z.discriminatedUnion('__typename', [
                    z.strictObject({ __typename: z.literal([ 'A', 'B' ]), shared: z.string() }),
                    z.strictObject({ __typename: z.literal('C'), other: z.string() })
                ]);
                const schema = z.strictObject({ foo: fragmentsSchema });
                return schema;
            },
            expectedQuery: oneLine`${operationType} { foo { ... on A { __typename, shared },
                ... on B { __typename, shared }, ... on C { __typename, other } } }`
        })
    );

    test(
        `builds a ${operationType} with nested fragments`,
        checkQuery({
            type: operationType,
            buildSchema() {
                const valueASchema = z.discriminatedUnion('__typename', [
                    z.strictObject({ __typename: z.literal('C'), valueC: z.string() }),
                    z.strictObject({ __typename: z.literal('D'), valueD: z.string() })
                ]);
                const fragmentsSchema = z.discriminatedUnion('__typename', [
                    z.strictObject({ __typename: z.literal('A'), valueA: valueASchema }),
                    z.strictObject({ __typename: z.literal('B'), valueB: z.string() })
                ]);
                const schema = z.strictObject({ foo: fragmentsSchema });
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
                const fragmentsSchema = z.discriminatedUnion('__typename', [
                    z.strictObject({ __typename: z.literal('A'), valueA: z.string() }),
                    z.strictObject({ __typename: z.literal('B'), valueB: z.string() })
                ]);
                const schema = z.strictObject({ foo: z.array(fragmentsSchema) });
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
                const fragmentsSchema = z.discriminatedUnion('__typename', [
                    z.strictObject({ __typename: z.literal('A'), valueA: z.string() }),
                    z.strictObject({ __typename: z.literal('B'), valueB: z.string() })
                ]);
                const schema = z.strictObject({ foo: z.tuple([ fragmentsSchema ]) });
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
                const fragmentsSchema = z.discriminatedUnion('__typename', [
                    z.strictObject({ __typename: z.literal('A'), valueA: z.string() }),
                    z.strictObject({ __typename: z.literal('B'), valueB: z.string() })
                ]);
                const schema = z.strictObject({ foo: z.nullable(z.array(fragmentsSchema)) });
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
                const fragmentsSchema = z.discriminatedUnion('__typename', [
                    z.strictObject({ __typename: z.literal('A'), valueA: z.string() }),
                    z.strictObject({ __typename: z.literal('B'), valueB: z.string() })
                ]);
                const nullableFragmentsSchema = z.nullable(fragmentsSchema);
                const schema = z.strictObject({ foo: z.nullable(z.array(nullableFragmentsSchema)) });
                return schema;
            },
            expectedQuery:
                `${operationType} { foo { ... on A { __typename, valueA }, ... on B { __typename, valueB } } }`
        })
    );
});
