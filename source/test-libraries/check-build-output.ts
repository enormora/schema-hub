import assert from 'node:assert';
import {
    createQueryBuilder,
    type OperationOptions,
    type QueryBuilder
} from '../zod-graphql-query-builder/builder.js';
import type { QuerySchema } from '../zod-graphql-query-builder/query-schema.js';

type BuildSchema = (builder: QueryBuilder) => QuerySchema;

type ErrorTestCase = {
    type: 'mutation' | 'query';
    buildSchema: BuildSchema;
    operationOptions?: OperationOptions;
    expectedError: string;
};

export function checkError(testCase: ErrorTestCase): () => void {
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

export function checkQuery(testCase: QueryTestCase): () => void {
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
