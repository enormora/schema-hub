import { createBuildContext } from './build-context.js';
import { formatFragmentDefinitions } from './fragment-definitions.js';
import type { FieldSchema, QuerySchema } from './query-schema.js';
import { extractRootShape } from './root-shape.js';
import {
    type FieldOptionsRegistry,
    type GraphqlFieldOptions,
    serializeRootShape
} from './serializer.js';
import { isValidGraphqlName } from './values/name.js';
import { ensureValidVariableCorrelations } from './variable-correlations.js';
import { serializeVariableDefinitions, type VariableDefinitions } from './variable-definition.js';

export type OperationOptions = {
    operationName?: string | undefined;
    variableDefinitions?: VariableDefinitions | undefined;
};

export type QueryBuilder = {
    registerFieldOptions: <Schema extends FieldSchema>(
        schema: Schema,
        options: GraphqlFieldOptions
    ) => Schema;
    buildQuery: (schema: QuerySchema, options?: OperationOptions) => string;
    buildMutation: (schema: QuerySchema, options?: OperationOptions) => string;
};

function withTrailingSpace(value: string): string {
    if (value.length === 0) {
        return value;
    }
    return `${value} `;
}

function buildDocument(
    registry: FieldOptionsRegistry,
    documentType: 'mutation' | 'query',
    schema: QuerySchema,
    options: OperationOptions
): string {
    const { variableDefinitions = {}, operationName = '' } = options;
    const shape = extractRootShape(schema);
    const context = createBuildContext(registry, shape);
    const { bodyEntries, referencedVariables } = serializeRootShape(registry, shape, context);

    ensureValidVariableCorrelations(variableDefinitions, referencedVariables);
    const operationNameAndParams = withTrailingSpace(
        `${operationName}${serializeVariableDefinitions(variableDefinitions)}`
    );
    const operationOutput = `${documentType} ${operationNameAndParams}{ ${bodyEntries.join(', ')} }`;
    return operationOutput + formatFragmentDefinitions(context.definitions);
}

export function createQueryBuilder(): QueryBuilder {
    const fieldOptionsRegistry: FieldOptionsRegistry = new WeakMap();

    return {
        registerFieldOptions<Schema extends FieldSchema>(
            schema: Schema,
            options: GraphqlFieldOptions
        ): Schema {
            if (options.typeName !== undefined && !isValidGraphqlName(options.typeName)) {
                throw new Error(
                    `Invalid GraphQL type name: "${options.typeName}". A type name must match /^[A-Z_a-z]\\w*$/.`
                );
            }
            fieldOptionsRegistry.set(schema, options);
            return schema;
        },

        buildQuery(schema, options = {}) {
            return buildDocument(fieldOptionsRegistry, 'query', schema, options);
        },

        buildMutation(schema, options = {}) {
            return buildDocument(fieldOptionsRegistry, 'mutation', schema, options);
        }
    };
}
