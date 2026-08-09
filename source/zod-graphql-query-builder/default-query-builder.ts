import { createQueryBuilder } from './builder.ts';

const defaultQueryBuilder = createQueryBuilder();

export const graphqlFieldOptions = defaultQueryBuilder.registerFieldOptions;
export const buildGraphqlQuery = defaultQueryBuilder.buildQuery;
export const buildGraphqlMutation = defaultQueryBuilder.buildMutation;
