import { z } from 'zod/v4';
import { isNonEmptyArray } from '../tuple/non-empty-array.ts';
import { safeParse } from '../zod-error-formatter/formatter.ts';
import { graphqlErrorSchema } from './graphql-error.ts';
import type { OperationResultForType } from './operation-result.ts';

const graphqlResponseSchema = z
    .object({
        data: z.unknown().optional(),
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
                    errors
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
