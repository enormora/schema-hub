import { createHash } from 'node:crypto';
import { z } from 'zod/v4-mini';

const persistedQueryVersion = 1;

export type PersistedQueryExtensions = {
    persistedQuery: {
        version: typeof persistedQueryVersion;
        sha256Hash: string;
    };
};

export function computePersistedQueryHash(query: string): string {
    return createHash('sha256').update(query).digest('hex');
}

export function buildPersistedQueryExtensions(query: string): PersistedQueryExtensions {
    return {
        persistedQuery: {
            version: persistedQueryVersion,
            sha256Hash: computePersistedQueryHash(query)
        }
    };
}

const persistedQueryNotFoundMessage = 'PersistedQueryNotFound';
const persistedQueryNotFoundCode = 'PERSISTED_QUERY_NOT_FOUND';
const persistedQueryNotSupportedMessage = 'PersistedQueryNotSupported';
const persistedQueryNotSupportedCode = 'PERSISTED_QUERY_NOT_SUPPORTED';

const persistedQueryErrorDetectionSchema = z.object({
    errors: z.optional(z.array(z.object({
        message: z.optional(z.string()),
        extensions: z.optional(z.object({
            code: z.optional(z.string())
        }))
    })))
});

export type PersistedQueryRetryReason = 'not-found' | 'not-supported';

type GraphqlErrorShape = {
    message?: string | undefined;
    extensions?: { code?: string | undefined; } | undefined;
};

function classifyPersistedQueryError(error: GraphqlErrorShape): PersistedQueryRetryReason | undefined {
    const code = error.extensions?.code;
    if (error.message === persistedQueryNotFoundMessage || code === persistedQueryNotFoundCode) {
        return 'not-found';
    }
    if (error.message === persistedQueryNotSupportedMessage || code === persistedQueryNotSupportedCode) {
        return 'not-supported';
    }
    return undefined;
}

export function detectPersistedQueryRetryReason(rawResponse: unknown): PersistedQueryRetryReason | undefined {
    const parsed = persistedQueryErrorDetectionSchema.safeParse(rawResponse);
    if (!parsed.success || parsed.data.errors === undefined) {
        return undefined;
    }

    for (const error of parsed.data.errors) {
        const reason = classifyPersistedQueryError(error);
        if (reason !== undefined) {
            return reason;
        }
    }
    return undefined;
}
