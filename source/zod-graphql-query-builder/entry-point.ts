import { createQueryBuilder } from './builder.ts';

const builder = createQueryBuilder();

export const graphqlFieldOptions = builder.registerFieldOptions;
export const buildGraphqlQuery = builder.buildQuery;
export const buildGraphqlMutation = builder.buildMutation;

export { createCustomScalarSchema as customScalar } from './custom-scalar.ts';
export { enumValue } from './values/enum.ts';
export { variablePlaceholder } from './values/variable-placeholder.ts';

export type { QuerySchema } from './query-schema.ts';
