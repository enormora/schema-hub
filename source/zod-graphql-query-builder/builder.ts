/* eslint-disable no-underscore-dangle -- we need to access _zod */
import {
    $ZodArray,
    $ZodDiscriminatedUnion,
    $ZodLiteral,
    $ZodReadonly,
    $ZodUndefined,
    type util
} from 'zod/v4/core';
import { isCustomScalarSchema } from './custom-scalar.js';
import {
    type FieldArray,
    type FieldSchema,
    type FieldSchemaTuple,
    type FieldShape,
    type FragmentsSchema,
    type FragmentUnionOptionSchema,
    isFragmentsSchema,
    isObjectOrListSchema,
    isStrictObjectSchema,
    isUnionOrListSchema,
    type NonWrappedFieldSchema,
    type ObjectOrListSchema,
    type QuerySchema,
    type StrictObjectSchema,
    type UnionOrListSchema,
    unwrapFieldSchema,
    unwrapFieldSchemaChain
} from './query-schema.js';
import { isValidGraphqlName } from './values/name.js';
import { normalizeParameterList } from './values/parameter-list.js';
import type { GraphqlValue, NormalizedGraphqlValue } from './values/value.js';
import { mergeVariables } from './values/variable-set.js';
import { ensureValidVariableCorrelations } from './variable-correlations.js';
import { serializeVariableDefinitions, type VariableDefinitions } from './variable-definition.js';

function withTrailingSpace(value: string): string {
    if (value.length === 0) {
        return value;
    }
    return `${value} `;
}

const cyclicSchemaErrorMessage = 'Cyclic schema detected without a resolvable GraphQL type name. ' +
    "Register it with graphqlFieldOptions(schema, { typeName: '...' }) " +
    "or add `__typename: z.literal('...')` to its shape so the builder can emit a named fragment.";

type GraphqlFieldOptions = {
    aliasFor?: string;
    parameters?: Record<string, GraphqlValue>;
    typeName?: string;
};

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

type FragmentDefinition = {
    typeName: string;
    body: string;
    referencedVariables: Set<string>;
};

// StrictObjectSchema<FieldShape> as a Map key triggers TS2589 (excessively deep). The shape
// of the schema is irrelevant for identity-based lookups, so we widen to FieldSchema here.
type BuildContext = {
    counts: Map<FieldSchema, number>;
    nameForSchema: Map<FieldSchema, string>;
    counterPerTypeName: Map<string, number>;
    definitions: Map<string, FragmentDefinition>;
};

function unwrapFromArraySchema<SchemaType extends NonWrappedFieldSchema>(
    predicate: (schema: NonWrappedFieldSchema) => schema is SchemaType,
    schema: FieldArray
): SchemaType | null {
    const elementSchema = unwrapFieldSchema(schema._zod.def.element);
    if (predicate(elementSchema)) {
        return elementSchema;
    }
    return null;
}

function unwrapFromTupleSchema<SchemaType extends NonWrappedFieldSchema>(
    predicate: (schema: NonWrappedFieldSchema) => schema is SchemaType,
    schema: FieldSchemaTuple
): SchemaType | null {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment -- ts-expect-error doesn’t work reliably here
    // @ts-ignore -  Type instantiation is not infinite
    const { items } = schema._zod.def;
    const [firstElementSchema] = items;
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
    if (schema instanceof $ZodArray) {
        return unwrapFromArraySchema(isStrictObjectSchema, schema);
    }
    return unwrapFromTupleSchema(isStrictObjectSchema, schema);
}

function getUnionSchema(
    schema: UnionOrListSchema
): FragmentsSchema | null {
    if (schema instanceof $ZodDiscriminatedUnion) {
        return schema;
    }
    if (schema instanceof $ZodArray) {
        return unwrapFromArraySchema(isFragmentsSchema, schema);
    }
    return unwrapFromTupleSchema(isFragmentsSchema, schema);
}

// eslint-disable-next-line max-statements -- each guard returns early; flattening would obscure intent
function inferTypeNameFromShape(schema: StrictObjectSchema<FieldShape>): string | null {
    const typenameField = schema._zod.def.shape.__typename;
    if (typenameField === undefined) {
        return null;
    }
    const unwrapped = unwrapFieldSchema(typenameField);
    if (!(unwrapped instanceof $ZodLiteral)) {
        return null;
    }
    const { values } = unwrapped._zod.def;
    if (values.length !== 1) {
        return null;
    }
    const [value] = values;
    if (typeof value !== 'string' || !isValidGraphqlName(value)) {
        return null;
    }
    return value;
}

// eslint-disable-next-line max-statements -- each nested helper is small; flattening would lose grouping
export function createQueryBuilder(): QueryBuilder {
    const fieldOptionsRegistry = new WeakMap<FieldSchema, GraphqlFieldOptions>();

    function getFieldOptionsForSchema(schema: FieldSchema): GraphqlFieldOptions {
        const unwrappingResult = unwrapFieldSchemaChain(schema);
        const queue: FieldSchema[] = [...unwrappingResult.wrapperElements, unwrappingResult.unwrappedSchema];

        for (const currentSchema of queue) {
            const fieldOptions = fieldOptionsRegistry.get(currentSchema);

            if (fieldOptions !== undefined) {
                return fieldOptions;
            }
        }

        return {};
    }

    // eslint-disable-next-line complexity -- guard for conflict detection requires multiple conditions
    function resolveTypeName(schema: StrictObjectSchema<FieldShape>): string | null {
        const explicit = fieldOptionsRegistry.get(schema)?.typeName ?? null;
        const inferred = inferTypeNameFromShape(schema);

        if (explicit !== null && inferred !== null && explicit !== inferred) {
            const prefix = `Conflicting GraphQL type name for schema: registered as "${explicit}" but `;
            const suffix = `\`__typename\` literal is "${inferred}".`;
            throw new Error(prefix + suffix);
        }

        return explicit ?? inferred;
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

    function collectSchemaReferences(rootShape: FieldShape): Map<FieldSchema, number> {
        const counts = new Map<FieldSchema, number>();
        const visiting = new Set<FieldSchema>();

        function visitObject(objectSchema: StrictObjectSchema<FieldShape>): void {
            counts.set(objectSchema, (counts.get(objectSchema) ?? 0) + 1);
            if (visiting.has(objectSchema)) {
                if (resolveTypeName(objectSchema) === null) {
                    throw new Error(cyclicSchemaErrorMessage);
                }
                return;
            }
            visiting.add(objectSchema);
            for (const childSchema of Object.values(objectSchema._zod.def.shape)) {
                // eslint-disable-next-line @typescript-eslint/no-use-before-define -- mutual recursion
                visitField(childSchema);
            }
            visiting.delete(objectSchema);
        }

        // eslint-disable-next-line max-statements, complexity -- each branch mirrors the serializer
        function visitField(fieldSchema: FieldSchema): void {
            if (isCustomScalarSchema(fieldSchema)) {
                return;
            }
            const unwrapped = unwrapFieldSchema(fieldSchema);
            if (unwrapped instanceof $ZodUndefined) {
                return;
            }

            if (isObjectOrListSchema(unwrapped)) {
                const objectSchema = getObjectSchema(unwrapped);
                if (objectSchema !== null) {
                    visitObject(objectSchema);
                    return;
                }
            }

            if (isUnionOrListSchema(unwrapped)) {
                const unionSchema = getUnionSchema(unwrapped);
                if (unionSchema !== null) {
                    for (const option of unionSchema._zod.def.options) {
                        visitObject(option);
                    }
                }
            }
        }

        for (const fieldSchema of Object.values(rootShape)) {
            visitField(fieldSchema);
        }

        return counts;
    }

    // eslint-disable-next-line max-statements -- guard chain reads top-to-bottom; collapsing would obscure intent
    function maybeAssignFragmentName(
        objectSchema: StrictObjectSchema<FieldShape>,
        ctx: BuildContext
    ): string | null {
        const existing = ctx.nameForSchema.get(objectSchema);
        if (existing !== undefined) {
            return existing;
        }

        const count = ctx.counts.get(objectSchema) ?? 0;
        const minReuseForFragment = 2;
        if (count < minReuseForFragment) {
            return null;
        }

        const typeName = resolveTypeName(objectSchema);
        if (typeName === null) {
            return null;
        }

        const nextIndex = (ctx.counterPerTypeName.get(typeName) ?? 0) + 1;
        ctx.counterPerTypeName.set(typeName, nextIndex);
        const fragmentName = `${typeName}_${nextIndex}`;
        ctx.nameForSchema.set(objectSchema, fragmentName);

        // eslint-disable-next-line @typescript-eslint/no-use-before-define -- mutual recursion
        const body = serializeObjectSchemaInline(objectSchema, ctx);
        ctx.definitions.set(fragmentName, {
            typeName,
            body: body.serializedValue,
            referencedVariables: body.referencedVariables
        });

        return fragmentName;
    }

    function serializeObjectSchemaInline(
        objectSchema: FragmentUnionOptionSchema | StrictObjectSchema<FieldShape>,
        ctx: BuildContext
    ): NormalizedGraphqlValue {
        const entries = Object.entries(objectSchema._zod.def.shape);
        let referencedVariables = new Set<string>();
        const serializedEntries: string[] = [];

        for (const [fieldName, fieldSchema] of entries) {
            // eslint-disable-next-line @typescript-eslint/no-use-before-define -- recursion
            const serializedField = serializeFieldSchema(fieldName, fieldSchema, ctx);
            referencedVariables = mergeVariables(referencedVariables, serializedField.referencedVariables);
            serializedEntries.push(serializedField.serializedValue);
        }

        return {
            serializedValue: ` { ${serializedEntries.join(', ')} }`,
            referencedVariables
        };
    }

    // eslint-disable-next-line max-statements, complexity -- no good idea how to refactor at the moment
    function serializeFragments(
        discriminatorMap: util.PropValues,
        unionOptions: FragmentUnionOptionSchema[],
        ctx: BuildContext
    ): NormalizedGraphqlValue {
        let referencedVariables = new Set<string>();
        const serializedFragments: string[] = [];
        const typeNameDiscriminator = discriminatorMap.__typename;
        const discriminatorNames = Array.from(typeNameDiscriminator ?? []);

        for (const [index, fragmentSchema] of unionOptions.entries()) {
            const discriminatorName = discriminatorNames[index];
            if (discriminatorName === undefined || discriminatorName === null) {
                throw new Error(
                    `Fragment name for index ${index} is undefined`
                );
            }

            const assignedName = maybeAssignFragmentName(fragmentSchema, ctx);
            if (assignedName === null) {
                const serializedFragment = serializeObjectSchemaInline(fragmentSchema, ctx);
                referencedVariables = mergeVariables(referencedVariables, serializedFragment.referencedVariables);
                serializedFragments.push(`... on ${discriminatorName.toString()}${serializedFragment.serializedValue}`);
            } else {
                const definition = ctx.definitions.get(assignedName);
                if (definition !== undefined) {
                    referencedVariables = mergeVariables(referencedVariables, definition.referencedVariables);
                }
                serializedFragments.push(`...${assignedName}`);
            }
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
            referencedVariables: mergeVariables(fieldSelector.referencedVariables, fieldBody.referencedVariables)
        };
    }

    // eslint-disable-next-line max-statements, complexity -- no good idea how to refactor at the moment
    function serializeFieldSchema(
        fieldName: string,
        fieldSchema: FieldSchema,
        ctx: BuildContext
    ): NormalizedGraphqlValue {
        const fieldSelector = serializedFieldSelector(fieldName, fieldSchema);

        if (isCustomScalarSchema(fieldSchema)) {
            return fieldSelector;
        }

        const unwrappedSchema = unwrapFieldSchema(fieldSchema);

        if (unwrappedSchema instanceof $ZodUndefined) {
            return { serializedValue: '', referencedVariables: new Set() };
        }

        if (isObjectOrListSchema(unwrappedSchema)) {
            const objectSchema = getObjectSchema(unwrappedSchema);

            if (objectSchema !== null) {
                const assignedName = maybeAssignFragmentName(objectSchema, ctx);
                if (assignedName !== null) {
                    const definition = ctx.definitions.get(assignedName);
                    return combineFieldSelectorAndFieldBody(fieldSelector, {
                        serializedValue: ` { ...${assignedName} }`,
                        referencedVariables: definition?.referencedVariables ?? new Set()
                    });
                }
                return combineFieldSelectorAndFieldBody(
                    fieldSelector,
                    serializeObjectSchemaInline(objectSchema, ctx)
                );
            }
        }

        if (isUnionOrListSchema(unwrappedSchema)) {
            const unionSchema = getUnionSchema(unwrappedSchema);
            if (unionSchema !== null) {
                return combineFieldSelectorAndFieldBody(
                    fieldSelector,
                    serializeFragments(
                        unionSchema._zod.propValues,
                        unionSchema._zod.def.options,
                        ctx
                    )
                );
            }
        }

        return fieldSelector;
    }

    // eslint-disable-next-line max-statements, complexity -- no idea right now to make this smaller
    function buildDocument(
        documentType: 'mutation' | 'query',
        schema: QuerySchema,
        options: OperationOptions
    ): string {
        let referencedVariables = new Set<string>();
        const { variableDefinitions = {}, operationName = '' } = options;
        const bodyEntries: string[] = [];
        const shape = schema instanceof $ZodReadonly ?
            (schema._zod.def.innerType as StrictObjectSchema<FieldShape>)._zod.def.shape :
            schema._zod.def.shape;

        const ctx: BuildContext = {
            counts: collectSchemaReferences(shape),
            nameForSchema: new Map(),
            counterPerTypeName: new Map(),
            definitions: new Map()
        };

        for (const [fieldName, fieldSchema] of Object.entries(shape)) {
            const serializedField = serializeFieldSchema(fieldName, fieldSchema, ctx);

            if (serializedField.serializedValue.length > 0) {
                bodyEntries.push(serializedField.serializedValue);
            }
            referencedVariables = mergeVariables(referencedVariables, serializedField.referencedVariables);
        }

        ensureValidVariableCorrelations(variableDefinitions, referencedVariables);
        const operationNameAndParams = withTrailingSpace(
            `${operationName}${serializeVariableDefinitions(variableDefinitions)}`
        );

        const operationOutput = `${documentType} ${operationNameAndParams}{ ${bodyEntries.join(', ')} }`;

        if (ctx.definitions.size === 0) {
            return operationOutput;
        }

        // eslint-disable-next-line unicorn/no-array-sort -- target is ES2022; Array#toSorted is unavailable
        const sortedNames = Array.from(ctx.definitions.keys()).sort();
        const fragmentOutputs = sortedNames.map((name) => {
            const definition = ctx.definitions.get(name) as FragmentDefinition;
            return `fragment ${name} on ${definition.typeName}${definition.body}`;
        });

        return `${operationOutput} ${fragmentOutputs.join(' ')}`;
    }

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
            return buildDocument('query', schema, options);
        },

        buildMutation(schema, options = {}) {
            return buildDocument('mutation', schema, options);
        }
    };
}
