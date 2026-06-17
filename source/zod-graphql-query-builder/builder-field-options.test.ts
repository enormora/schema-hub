import { test } from '@sondr3/minitest';
import { z } from 'zod/v4-mini';
import { checkQuery } from '../test-libraries/check-build-output.ts';

([ 'query', 'mutation' ] as const).forEach(function (operationType) {
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
});
