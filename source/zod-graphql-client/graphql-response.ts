import { z } from 'zod';
import { isNonEmptyArray } from '../tuple/non-empty-array.js';
import { safeParse } from '../zod-error-formatter/formatter.js';
import { formatAllErrors, graphqlErrorSchema } from './graphql-error.js';
import type { OperationResultForType } from './operation-result.js';

const graphqlResponseSchema = z
    .object({
        data: z.unknown(),
        errors: z.array(graphqlErrorSchema).optional()
    })
    .strip();

export function parseGraphqlResponse(responseBody: unknown): OperationResultForType<unknown> {
    const graphqlResponseParseResult = safeParse(graphqlResponseSchema, responseBody);

    if (graphqlResponseParseResult.success) {
        const { errors, data } = graphqlResponseParseResult.data;

        if (errors !== undefined && isNonEmptyArray(errors)) {
            return {
                success: false,
                errorDetails: {
                    type: 'graphql',
                    message: 'GraphQL response contains errors',
                    errors: formatAllErrors(errors)
                }
            };
        }

        return { success: true, data };
    }

    return {
        success: false,
        errorDetails: {
            type: 'unknown',
            message: 'GraphQL server responded with an incorrect data structure'
        }
    };
}
