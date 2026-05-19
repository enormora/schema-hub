import { test } from '@sondr3/minitest';
import assert from 'node:assert';
import { z } from 'zod/v4-mini';
import { createQueryBuilder } from './builder.js';
import { createCustomScalarSchema } from './custom-scalar.js';

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
