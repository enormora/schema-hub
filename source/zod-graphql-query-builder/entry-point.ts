import { createQueryBuilder } from './builder.js';

const builder = createQueryBuilder();

export const graphqlFieldOptions = builder.registerFieldOptions;
export const buildGraphqlQuery = builder.buildQuery;
export const buildGraphqlMutation = builder.buildMutation;

export { createCustomScalarSchema as customScalar } from './custom-scalar.js';
export { enumValue } from './values/enum.js';
export { variablePlaceholder } from './values/variable-placeholder.js';

export type { QuerySchema } from './query-schema.js';
