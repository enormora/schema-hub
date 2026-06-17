import { createBuildContext } from './build-context.ts';
import { formatFragmentDefinitions } from './fragment-definitions.ts';
import type { FieldSchema, QuerySchema } from './query-schema.ts';
import { extractRootShape } from './root-shape.ts';
import { serializeRootShape } from './serializer.ts';
import type { FieldOptionsRegistry, GraphqlFieldOptions } from './type-name.ts';
import { isValidGraphqlName } from './values/name.ts';
import { ensureValidVariableCorrelations } from './variable-correlations.ts';
import { serializeVariableDefinitions, type VariableDefinitions } from './variable-definition.ts';

export type OperationOptions = {
    readonly operationName?: string | undefined;
    readonly variableDefinitions?: VariableDefinitions | undefined;
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
