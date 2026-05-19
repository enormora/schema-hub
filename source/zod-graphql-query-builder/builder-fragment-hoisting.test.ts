import { test } from '@sondr3/minitest';
import { oneLine } from 'common-tags';
import { z } from 'zod/v4-mini';
import { checkError, checkQuery } from '../test-libraries/check-build-output.js';
import { variablePlaceholder } from './values/variable-placeholder.js';

(['query', 'mutation'] as const).forEach((operationType) => {
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
