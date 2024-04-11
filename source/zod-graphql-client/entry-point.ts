import baseKy, { type Options as KyOptions } from 'ky';
import { type ClientOptions, createClientFactory, type GraphqlClient } from './client.js';

export type GraphqlClientOptions = ClientOptions & {
    readonly fetch?: KyOptions['fetch'];
};

export function createGraphqlClient(clientOptions: GraphqlClientOptions): GraphqlClient {
    const { fetch: fetchFn, ...remainingOptions } = clientOptions;
    const ky = fetchFn === undefined ? baseKy : baseKy.create({ fetch: fetchFn });

    const createClient = createClientFactory({ ky });
    return createClient(remainingOptions);
}

export type { QuerySchema } from '../zod-graphql-query-builder/entry-point.js';
export { enumValue, graphqlFieldOptions, variablePlaceholder } from '../zod-graphql-query-builder/entry-point.js';
export type { GraphqlClient } from './client.js';
export type { QueryErrorDetails } from './query-error.js';
export { GraphqlQueryError } from './query-error.js';
export type { QueryResult } from './query-result.js';
