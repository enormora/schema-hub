import assert from 'node:assert';
import {
    createQueryBuilder,
    type OperationOptions,
    type QueryBuilder
} from '../zod-graphql-query-builder/builder.ts';
import type { QuerySchema } from '../zod-graphql-query-builder/query-schema.ts';

type BuildSchema = (builder: QueryBuilder) => QuerySchema;

type ErrorTestCase = {
    readonly type: 'mutation' | 'query';
    readonly buildSchema: BuildSchema;
    readonly operationOptions?: OperationOptions;
    readonly expectedError: string;
};

export function checkError(testCase: ErrorTestCase): () => void {
    const { buildSchema, expectedError, operationOptions } = testCase;
    return function () {
        const builder = createQueryBuilder();
        const schema = buildSchema(builder);
        const build = testCase.type === 'query' ? 'buildQuery' : 'buildMutation';

        try {
            builder[build](schema, operationOptions);
            assert.fail('Expected the build to fail but it did not');
        } catch (error: unknown) {
            assert.ok(error instanceof Error);
            assert.strictEqual(error.message, expectedError);
        }
    };
}

type QueryTestCase = {
    readonly type: 'mutation' | 'query';
    readonly buildSchema: BuildSchema;
    readonly operationOptions?: OperationOptions;
    readonly expectedQuery: string;
};

export function checkQuery(testCase: QueryTestCase): () => void {
    const { buildSchema, expectedQuery, operationOptions } = testCase;
    return function () {
        const builder = createQueryBuilder();
        const schema = buildSchema(builder);
        const build = testCase.type === 'query' ? 'buildQuery' : 'buildMutation';

        const result = builder[build](schema, operationOptions);

        assert.strictEqual(result, expectedQuery);
    };
}
