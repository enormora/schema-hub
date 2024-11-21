import { z, ZodArray, ZodDiscriminatedUnion, type ZodLazy, type ZodTuple, ZodUndefined } from 'zod';
import { isCustomScalarSchema } from './custom-scalar.js';
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
    unwrapFieldSchema,
    unwrapFieldSchemaChain
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

export type OperationOptions = {
    operationName?: string | undefined;
    variableDefinitions?: VariableDefinitions | undefined;
};

export type QueryBuilder = {
    registerFieldOptions: <Schema extends FieldSchema>(
        schema: Schema,
        options: GraphqlFieldOptions
    ) => ZodLazy<Schema>;
    buildQuery: (schema: QuerySchema, options?: OperationOptions) => string;
    buildMutation: (schema: QuerySchema, options?: OperationOptions) => string;
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
        const unwrappingResult = unwrapFieldSchemaChain(schema);
        const queue = [...unwrappingResult.wrapperElements, unwrappingResult.unwrappedSchema];

        for (const currentSchema of queue) {
            const fieldOptions = fieldOptionsRegistry.get(currentSchema);

            if (fieldOptions !== undefined) {
                return fieldOptions;
            }
        }

        return {};
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

    // eslint-disable-next-line max-statements, complexity -- no good idea how to refactor at the moment
    function serializeFieldSchema(
        fieldName: string,
        fieldSchema: FieldSchema
    ): NormalizedGraphqlValue {
        const fieldSelector = serializedFieldSelector(fieldName, fieldSchema);

        if (isCustomScalarSchema(fieldSchema)) {
            return fieldSelector;
        }

        const unwrappedSchema = unwrapFieldSchema(fieldSchema);

        if (unwrappedSchema instanceof ZodUndefined) {
            return { serializedValue: '', referencedVariables: new Set() };
        }

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

    // eslint-disable-next-line max-statements -- no idea right now to make this smaller
    function buildDocument(
        documentType: 'mutation' | 'query',
        schema: QuerySchema,
        options: OperationOptions
    ): string {
        let referencedVariables = new Set<string>();
        const { variableDefinitions = {}, operationName = '' } = options;
        const bodyEntries: string[] = [];

        for (const [fieldName, fieldSchema] of Object.entries(schema.shape)) {
            const serializedField = serializeFieldSchema(fieldName, fieldSchema);

            if (serializedField.serializedValue.length > 0) {
                bodyEntries.push(serializedField.serializedValue);
            }
            referencedVariables = new Set([
                ...referencedVariables,
                ...serializedField.referencedVariables
            ]);
        }

        ensureValidVariableCorrelations(variableDefinitions, referencedVariables);
        const operationNameAndParams = withTrailingSpace(
            `${operationName}${serializeVariableDefinitions(variableDefinitions)}`
        );

        return `${documentType} ${operationNameAndParams}{ ${bodyEntries.join(', ')} }`;
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
        },

        buildMutation(schema, options = {}) {
            return buildDocument('mutation', schema, options);
        }
    };
}
