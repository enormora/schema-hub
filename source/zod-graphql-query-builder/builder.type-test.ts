import { describe, expect, test } from 'tstyche';
import { z } from 'zod';
import type { output as TypeOf } from 'zod/v4/core';
import { buildGraphqlMutation, buildGraphqlQuery, customScalar, type QuerySchema } from './entry-point.ts';

describe('buildGraphqlQuery / buildGraphqlMutation accept simple root schemas', function () {
    test('strict object with primitive fields', function () {
        const schema = z.strictObject({ foo: z.string(), bar: z.number(), baz: z.boolean() });
        expect(buildGraphqlQuery(schema)).type.toBe<string>();
        expect(buildGraphqlMutation(schema)).type.toBe<string>();
    });

    test('strict object with literal and null fields', function () {
        const schema = z.strictObject({ kind: z.literal('a'), tag: z.null() });
        expect(buildGraphqlQuery(schema)).type.toBe<string>();
    });

    test('readonly-wrapped root schema', function () {
        const schema = z.strictObject({ foo: z.string() }).readonly();
        expect(buildGraphqlQuery(schema)).type.toBe<string>();
    });
});

describe('buildGraphqlQuery accepts wrapped field schemas', function () {
    test('field wrapped in nullable', function () {
        const schema = z.strictObject({ foo: z.nullable(z.string()) });
        expect(buildGraphqlQuery(schema)).type.toBe<string>();
    });

    test('field wrapped in readonly', function () {
        const schema = z.strictObject({ foo: z.string().readonly() });
        expect(buildGraphqlQuery(schema)).type.toBe<string>();
    });

    test('field wrapped in lazy', function () {
        const schema = z.strictObject({
            foo: z.lazy(function () {
                return z.string();
            })
        });
        expect(buildGraphqlQuery(schema)).type.toBe<string>();
    });

    test('field as a custom scalar', function () {
        const schema = z.strictObject({ foo: customScalar(z.string()) });
        expect(buildGraphqlQuery(schema)).type.toBe<string>();
    });
});

describe('buildGraphqlQuery accepts collection and union field schemas', function () {
    test('field as an array of primitives', function () {
        const schema = z.strictObject({ foo: z.array(z.string()) });
        expect(buildGraphqlQuery(schema)).type.toBe<string>();
    });

    test('field as an array of strict objects', function () {
        const schema = z.strictObject({ foo: z.array(z.strictObject({ bar: z.string() })) });
        expect(buildGraphqlQuery(schema)).type.toBe<string>();
    });

    test('field as a tuple', function () {
        const schema = z.strictObject({ foo: z.tuple([ z.string(), z.number() ]) });
        expect(buildGraphqlQuery(schema)).type.toBe<string>();
    });

    test('field as a primitive union', function () {
        const schema = z.strictObject({ foo: z.union([ z.string(), z.number() ]) });
        expect(buildGraphqlQuery(schema)).type.toBe<string>();
    });

    test('field as a discriminated union (fragments)', function () {
        const schema = z.strictObject({
            foo: z.discriminatedUnion('__typename', [
                z.strictObject({ __typename: z.literal('A'), valueA: z.string() }),
                z.strictObject({ __typename: z.literal('B'), valueB: z.number() })
            ])
        });
        expect(buildGraphqlQuery(schema)).type.toBe<string>();
    });
});

describe('buildGraphqlQuery / buildGraphqlMutation reject invalid schemas', function () {
    test('rejects z.record at the field level (only known shapes allowed)', function () {
        const schema = z.strictObject({ foo: z.record(z.string(), z.string()) });
        expect(buildGraphqlQuery).type.not.toBeCallableWith(schema);
    });

    test('rejects z.map at the field level', function () {
        const schema = z.strictObject({ foo: z.map(z.string(), z.string()) });
        expect(buildGraphqlQuery).type.not.toBeCallableWith(schema);
    });

    test('rejects z.set at the field level', function () {
        const schema = z.strictObject({ foo: z.set(z.string()) });
        expect(buildGraphqlQuery).type.not.toBeCallableWith(schema);
    });

    test('rejects z.record wrapped in z.nullable (recursive constraint still catches it)', function () {
        const schema = z.strictObject({ foo: z.nullable(z.record(z.string(), z.string())) });
        expect(buildGraphqlQuery).type.not.toBeCallableWith(schema);
    });

    test('rejects a bare primitive as root', function () {
        expect(buildGraphqlQuery).type.not.toBeCallableWith(z.string());
    });
});

describe('QuerySchema does not leak `any` into consumer inference', function () {
    test('core.output<QuerySchema> is unknown, not any (Gh6015 workaround sanity check)', function () {
        expect<TypeOf<QuerySchema>>().type.toBe<unknown>();
    });
});
