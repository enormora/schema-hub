import { test } from '@sondr3/minitest';
import { oneLine } from 'common-tags';
import { z } from 'zod/v4-mini';
import { checkError, checkQuery } from '../test-libraries/check-build-output.js';
import { variablePlaceholder } from './values/variable-placeholder.js';

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
});
