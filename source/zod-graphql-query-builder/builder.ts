import { z, ZodArray, ZodDiscriminatedUnion, type ZodLazy, type ZodTuple } from 'zod';
import {
    type FieldSchema,
    type FieldShape,
    type FragmentsSchema,
    type FragmentTypeName,
    type FragmentUnionOptionSchema,
    isFragmentsSchema,
    isObjectOrListSchema,
    isStrictObjectSchema,
    isUnionOrListSchema,
    type ObjectOrListSchema,
    type QuerySchema,
    type StrictObjectSchema,
    type UnionOrListSchema,
    unwrapFieldSchema
} from './query-schema.js';
import { normalizeParameterList } from './values/parameter-list.js';
import type { GraphqlValue, NormalizedGraphqlValue } from './values/value.js';
import { ensureValidVariableCorrelations } from './variable-correlations.js';
import { serializeVariableDefinitions, type VariableDefinitions } from './variable-definition.js';

function withTrailingSpace(value: string): string {
    if (value.length === 0) {
        return value;
    }
    return `${value} `;
}

type GraphqlFieldOptions = {
    aliasFor?: string;
    parameters?: Record<string, GraphqlValue>;
};

export type QueryOptions = {
    queryName?: string | undefined;
    variableDefinitions?: VariableDefinitions | undefined;
};

export type QueryBuilder = {
    registerFieldOptions: <Schema extends FieldSchema>(
        schema: Schema,
        options: GraphqlFieldOptions
    ) => ZodLazy<Schema>;
    buildQuery: <Schema extends QuerySchema>(schema: Schema, options?: QueryOptions) => string;
};

function unwrapFromArraySchema<SchemaType extends FieldSchema>(
    predicate: (schema: FieldSchema) => schema is SchemaType,
    schema: ZodArray<FieldSchema>
): SchemaType | null {
    const elementSchema = unwrapFieldSchema(schema.element);
    if (predicate(elementSchema)) {
        return elementSchema;
    }
    return null;
}

function unwrapFromTupleSchema<SchemaType extends FieldSchema>(
    predicate: (schema: FieldSchema) => schema is SchemaType,
    schema: ZodTuple<[FieldSchema, ...FieldSchema[]]>
): SchemaType | null {
    const [firstElementSchema] = schema.items;
    const unwrappedElementSchema = unwrapFieldSchema(firstElementSchema);
    if (predicate(unwrappedElementSchema)) {
        return unwrappedElementSchema;
    }
    return null;
}

function getObjectSchema(schema: ObjectOrListSchema): StrictObjectSchema<FieldShape> | null {
    if (isStrictObjectSchema(schema)) {
        return schema;
    }
    if (schema instanceof ZodArray) {
        return unwrapFromArraySchema(isStrictObjectSchema, schema);
    }
    return unwrapFromTupleSchema(isStrictObjectSchema, schema);
}

function getUnionSchema(
    schema: UnionOrListSchema
): FragmentsSchema | null {
    if (schema instanceof ZodDiscriminatedUnion) {
        return schema;
    }
    if (schema instanceof ZodArray) {
        return unwrapFromArraySchema(isFragmentsSchema, schema);
    }
    return unwrapFromTupleSchema(isFragmentsSchema, schema);
}

export function createQueryBuilder(): QueryBuilder {
    const fieldOptionsRegistry = new WeakMap<FieldSchema, GraphqlFieldOptions>();

    function getFieldOptionsForSchema(schema: FieldSchema): GraphqlFieldOptions {
        const fieldOptions = fieldOptionsRegistry.get(schema);
        return fieldOptions ?? {};
    }

    function serializedFieldSelector(fieldName: string, fieldSchema: FieldSchema): NormalizedGraphqlValue {
        const fieldOptions = getFieldOptionsForSchema(fieldSchema);
        const { aliasFor, parameters } = fieldOptions;

        const selectorName = aliasFor === undefined ? fieldName : `${fieldName}: ${aliasFor}`;

        if (parameters !== undefined) {
            const normalizedParameterList = normalizeParameterList(parameters);
            return {
                serializedValue: `${selectorName}${normalizedParameterList.serializedValue}`,
                referencedVariables: normalizedParameterList.referencedVariables
            };
        }

        return {
            serializedValue: selectorName,
            referencedVariables: new Set()
        };
    }

    function serializeObjectSchema(objectSchema: StrictObjectSchema<FieldShape>): NormalizedGraphqlValue {
        const entries = Object.entries(objectSchema.shape);
        let referencedVariables = new Set<string>();
        const serializedEntries: string[] = [];

        for (const [fieldName, fieldSchema] of entries) {
            // eslint-disable-next-line @typescript-eslint/no-use-before-define -- recursion
            const serializedField = serializeFieldSchema(fieldName, fieldSchema);
            referencedVariables = new Set([...referencedVariables, ...serializedField.referencedVariables]);
            serializedEntries.push(serializedField.serializedValue);
        }

        return {
            serializedValue: ` { ${serializedEntries.join(', ')} }`,
            referencedVariables
        };
    }

    function serializeFragments(
        unionOptions: ReadonlyMap<FragmentTypeName, FragmentUnionOptionSchema>
    ): NormalizedGraphqlValue {
        let referencedVariables = new Set<string>();
        const serializedFragments: string[] = [];

        for (const [fragmentName, fragmentSchema] of unionOptions.entries()) {
            const serializedFragment = serializeObjectSchema(fragmentSchema);
            referencedVariables = new Set([...referencedVariables, ...serializedFragment.referencedVariables]);
            serializedFragments.push(`... on ${fragmentName}${serializedFragment.serializedValue}`);
        }
        return {
            serializedValue: ` { ${serializedFragments.join(', ')} }`,
            referencedVariables
        };
    }

    function combineFieldSelectorAndFieldBody(
        fieldSelector: NormalizedGraphqlValue,
        fieldBody: NormalizedGraphqlValue
    ): NormalizedGraphqlValue {
        return {
            serializedValue: `${fieldSelector.serializedValue}${fieldBody.serializedValue}`,
            referencedVariables: new Set([
                ...fieldSelector.referencedVariables,
                ...fieldBody.referencedVariables
            ])
        };
    }

    // eslint-disable-next-line max-statements -- no good idea how to refactor at the moment
    function serializeFieldSchema(
        fieldName: string,
        fieldSchema: FieldSchema
    ): NormalizedGraphqlValue {
        const fieldSelector = serializedFieldSelector(fieldName, fieldSchema);
        const unwrappedSchema = unwrapFieldSchema(fieldSchema);

        if (isObjectOrListSchema(unwrappedSchema)) {
            const objectSchema = getObjectSchema(unwrappedSchema);

            if (objectSchema !== null) {
                return combineFieldSelectorAndFieldBody(fieldSelector, serializeObjectSchema(objectSchema));
            }
        }

        if (isUnionOrListSchema(unwrappedSchema)) {
            const unionSchema = getUnionSchema(unwrappedSchema);
            if (unionSchema !== null) {
                return combineFieldSelectorAndFieldBody(
                    fieldSelector,
                    serializeFragments(
                        unionSchema.optionsMap as unknown as ReadonlyMap<FragmentTypeName, FragmentUnionOptionSchema>
                    )
                );
            }
        }

        return fieldSelector;
    }

    function buildDocument<Schema extends QuerySchema>(
        documentType: 'mutation' | 'query',
        schema: Schema,
        options: QueryOptions
    ): string {
        let referencedVariables = new Set<string>();
        const { variableDefinitions = {}, queryName = '' } = options;
        const bodyEntries: string[] = [];

        for (const [fieldName, fieldSchema] of Object.entries(schema.shape)) {
            const serializedField = serializeFieldSchema(fieldName, fieldSchema);

            bodyEntries.push(serializedField.serializedValue);
            referencedVariables = new Set([
                ...referencedVariables,
                ...serializedField.referencedVariables
            ]);
        }

        ensureValidVariableCorrelations(variableDefinitions, referencedVariables);
        const queryNameAndParams = withTrailingSpace(
            `${queryName}${serializeVariableDefinitions(variableDefinitions)}`
        );

        return `${documentType} ${queryNameAndParams}{ ${bodyEntries.join(', ')} }`;
    }

    return {
        registerFieldOptions<Schema extends FieldSchema>(
            schema: Schema,
            options: GraphqlFieldOptions
        ): ZodLazy<Schema> {
            const newSchemaInstance = z.lazy(() => {
                return schema;
            }) as ZodLazy<Schema>;
            fieldOptionsRegistry.set(newSchemaInstance, options);

            return newSchemaInstance;
        },

        buildQuery(schema, options = {}) {
            return buildDocument('query', schema, options);
        }
    };
}
