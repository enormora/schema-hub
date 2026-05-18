/* eslint-disable no-underscore-dangle -- we need to access _zod */
import {
    $ZodArray,
    $ZodDiscriminatedUnion,
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
    type StrictObjectSchema,
    type UnionOrListSchema,
    unwrapFieldSchema,
    unwrapFieldSchemaChain
} from './query-schema.js';
import {
    type FieldOptionsRegistry,
    type GraphqlFieldOptions,
    resolveTypeName
} from './type-name.js';
import { normalizeParameterList } from './values/parameter-list.js';
import type { NormalizedGraphqlValue } from './values/value.js';
import { mergeVariables } from './values/variable-set.js';

export type { FieldOptionsRegistry, GraphqlFieldOptions } from './type-name.js';

export type FragmentDefinition = {
    typeName: string;
    body: string;
    referencedVariables: Set<string>;
};

// StrictObjectSchema<FieldShape> as a Map key triggers TS2589 (excessively deep). The shape
// of the schema is irrelevant for identity-based lookups, so we widen to FieldSchema here.
export type BuildContext = {
    counts: Map<FieldSchema, number>;
    nameForSchema: Map<FieldSchema, string>;
    counterPerTypeName: Map<string, number>;
    definitions: Map<string, FragmentDefinition>;
};

export type SerializedRootShape = {
    bodyEntries: readonly string[];
    referencedVariables: Set<string>;
};

type FragmentAllocation = {
    fragmentName: string;
    typeName: string;
};

type DiscriminatorValue = boolean | number | string;

const minimumReuseCountForFragment = 2;

const cyclicSchemaErrorMessage = 'Cyclic schema detected without a resolvable GraphQL type name. ' +
    "Register it with graphqlFieldOptions(schema, { typeName: '...' }) " +
    "or add `__typename: z.literal('...')` to its shape so the builder can emit a named fragment.";

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

function getUnionSchema(schema: UnionOrListSchema): FragmentsSchema | null {
    if (schema instanceof $ZodDiscriminatedUnion) {
        return schema;
    }
    if (schema instanceof $ZodArray) {
        return unwrapFromArraySchema(isFragmentsSchema, schema);
    }
    return unwrapFromTupleSchema(isFragmentsSchema, schema);
}

function getFieldOptionsForSchema(
    registry: FieldOptionsRegistry,
    schema: FieldSchema
): GraphqlFieldOptions {
    const unwrappingResult = unwrapFieldSchemaChain(schema);
    const queue: FieldSchema[] = [...unwrappingResult.wrapperElements, unwrappingResult.unwrappedSchema];
    for (const currentSchema of queue) {
        const fieldOptions = registry.get(currentSchema);
        if (fieldOptions !== undefined) {
            return fieldOptions;
        }
    }
    return {};
}

function serializedFieldSelector(
    registry: FieldOptionsRegistry,
    fieldName: string,
    fieldSchema: FieldSchema
): NormalizedGraphqlValue {
    const { aliasFor, parameters } = getFieldOptionsForSchema(registry, fieldSchema);
    const selectorName = aliasFor === undefined ? fieldName : `${fieldName}: ${aliasFor}`;
    if (parameters === undefined) {
        return { serializedValue: selectorName, referencedVariables: new Set() };
    }
    const normalizedParameterList = normalizeParameterList(parameters);
    return {
        serializedValue: `${selectorName}${normalizedParameterList.serializedValue}`,
        referencedVariables: normalizedParameterList.referencedVariables
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

function getObjectSchemasFromList(
    unwrapped: NonWrappedFieldSchema
): readonly StrictObjectSchema<FieldShape>[] {
    if (!isObjectOrListSchema(unwrapped)) {
        return [];
    }
    const objectSchema = getObjectSchema(unwrapped);
    return objectSchema === null ? [] : [objectSchema];
}

function getOptionsFromUnion(
    unwrapped: NonWrappedFieldSchema
): readonly FragmentUnionOptionSchema[] {
    if (!isUnionOrListSchema(unwrapped)) {
        return [];
    }
    const unionSchema = getUnionSchema(unwrapped);
    return unionSchema === null ? [] : unionSchema._zod.def.options;
}

function getSchemasToVisit(
    unwrapped: NonWrappedFieldSchema
): readonly StrictObjectSchema<FieldShape>[] {
    if (unwrapped instanceof $ZodUndefined) {
        return [];
    }
    const objectSchemas = getObjectSchemasFromList(unwrapped);
    if (objectSchemas.length > 0) {
        return objectSchemas;
    }
    return getOptionsFromUnion(unwrapped);
}

function ensureCycleHasResolvableTypeName(
    registry: FieldOptionsRegistry,
    objectSchema: StrictObjectSchema<FieldShape>
): void {
    if (resolveTypeName(registry, objectSchema) !== null) {
        return;
    }
    throw new Error(cyclicSchemaErrorMessage);
}

export function collectSchemaReferences(
    registry: FieldOptionsRegistry,
    rootShape: FieldShape
): Map<FieldSchema, number> {
    const counts = new Map<FieldSchema, number>();
    const visiting = new Set<FieldSchema>();

    function visitObject(objectSchema: StrictObjectSchema<FieldShape>): void {
        counts.set(objectSchema, (counts.get(objectSchema) ?? 0) + 1);
        if (visiting.has(objectSchema)) {
            ensureCycleHasResolvableTypeName(registry, objectSchema);
            return;
        }
        visiting.add(objectSchema);
        for (const childSchema of Object.values(objectSchema._zod.def.shape)) {
            // eslint-disable-next-line @typescript-eslint/no-use-before-define -- mutual recursion
            visitField(childSchema);
        }
        visiting.delete(objectSchema);
    }

    function visitField(fieldSchema: FieldSchema): void {
        if (isCustomScalarSchema(fieldSchema)) {
            return;
        }
        const unwrapped = unwrapFieldSchema(fieldSchema);
        for (const objectSchema of getSchemasToVisit(unwrapped)) {
            visitObject(objectSchema);
        }
    }

    for (const fieldSchema of Object.values(rootShape)) {
        visitField(fieldSchema);
    }

    return counts;
}

function allocateFragmentName(typeName: string, counterPerTypeName: Map<string, number>): string {
    const nextIndex = (counterPerTypeName.get(typeName) ?? 0) + 1;
    counterPerTypeName.set(typeName, nextIndex);
    return `${typeName}_${nextIndex}`;
}

function tryAllocateFragmentForSchema(
    registry: FieldOptionsRegistry,
    objectSchema: StrictObjectSchema<FieldShape>,
    context: BuildContext
): FragmentAllocation | null {
    const count = context.counts.get(objectSchema) ?? 0;
    if (count < minimumReuseCountForFragment) {
        return null;
    }
    const typeName = resolveTypeName(registry, objectSchema);
    if (typeName === null) {
        return null;
    }
    const fragmentName = allocateFragmentName(typeName, context.counterPerTypeName);
    context.nameForSchema.set(objectSchema, fragmentName);
    return { fragmentName, typeName };
}

function storeFragmentDefinition(
    registry: FieldOptionsRegistry,
    allocation: FragmentAllocation,
    objectSchema: StrictObjectSchema<FieldShape>,
    context: BuildContext
): void {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define -- mutual recursion
    const body = serializeObjectSchemaInline(registry, objectSchema, context);
    context.definitions.set(allocation.fragmentName, {
        typeName: allocation.typeName,
        body: body.serializedValue,
        referencedVariables: body.referencedVariables
    });
}

function maybeAssignFragmentName(
    registry: FieldOptionsRegistry,
    objectSchema: StrictObjectSchema<FieldShape>,
    context: BuildContext
): string | null {
    const existing = context.nameForSchema.get(objectSchema);
    if (existing !== undefined) {
        return existing;
    }
    const allocation = tryAllocateFragmentForSchema(registry, objectSchema, context);
    if (allocation === null) {
        return null;
    }
    storeFragmentDefinition(registry, allocation, objectSchema, context);
    return allocation.fragmentName;
}

function serializeObjectSchemaInline(
    registry: FieldOptionsRegistry,
    objectSchema: FragmentUnionOptionSchema | StrictObjectSchema<FieldShape>,
    context: BuildContext
): NormalizedGraphqlValue {
    const entries = Object.entries(objectSchema._zod.def.shape);
    let referencedVariables = new Set<string>();
    const serializedEntries: string[] = [];
    for (const [fieldName, fieldSchema] of entries) {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define -- recursion
        const serializedField = serializeFieldSchema(registry, fieldName, fieldSchema, context);
        referencedVariables = mergeVariables(referencedVariables, serializedField.referencedVariables);
        serializedEntries.push(serializedField.serializedValue);
    }
    return {
        serializedValue: ` { ${serializedEntries.join(', ')} }`,
        referencedVariables
    };
}

function serializeFragmentReference(
    assignedName: string,
    context: BuildContext
): NormalizedGraphqlValue {
    const definition = context.definitions.get(assignedName);
    return {
        serializedValue: `...${assignedName}`,
        referencedVariables: definition?.referencedVariables ?? new Set()
    };
}

function wrapFragmentReferenceAsBody(
    assignedName: string,
    context: BuildContext
): NormalizedGraphqlValue {
    const reference = serializeFragmentReference(assignedName, context);
    return {
        serializedValue: ` { ${reference.serializedValue} }`,
        referencedVariables: reference.referencedVariables
    };
}

function lookupDiscriminatorName(
    discriminatorNames: readonly unknown[],
    index: number
): DiscriminatorValue {
    const value = discriminatorNames[index];
    if (value === undefined || value === null) {
        throw new Error(`Fragment name for index ${index} is undefined`);
    }
    return value as DiscriminatorValue;
}

function serializeInlineUnionOption(
    registry: FieldOptionsRegistry,
    discriminatorName: DiscriminatorValue,
    fragmentSchema: FragmentUnionOptionSchema,
    context: BuildContext
): NormalizedGraphqlValue {
    const serializedFragment = serializeObjectSchemaInline(registry, fragmentSchema, context);
    return {
        serializedValue: `... on ${discriminatorName.toString()}${serializedFragment.serializedValue}`,
        referencedVariables: serializedFragment.referencedVariables
    };
}

function serializeFragmentUnionOption(
    registry: FieldOptionsRegistry,
    discriminatorName: DiscriminatorValue,
    fragmentSchema: FragmentUnionOptionSchema,
    context: BuildContext
): NormalizedGraphqlValue {
    const assignedName = maybeAssignFragmentName(registry, fragmentSchema, context);
    if (assignedName !== null) {
        return serializeFragmentReference(assignedName, context);
    }
    return serializeInlineUnionOption(registry, discriminatorName, fragmentSchema, context);
}

function serializeFragments(
    registry: FieldOptionsRegistry,
    discriminatorMap: util.PropValues,
    unionOptions: readonly FragmentUnionOptionSchema[],
    context: BuildContext
): NormalizedGraphqlValue {
    let referencedVariables = new Set<string>();
    const serializedFragments: string[] = [];
    const discriminatorNames = Array.from(discriminatorMap.__typename ?? []);
    for (const [index, fragmentSchema] of unionOptions.entries()) {
        const discriminatorName = lookupDiscriminatorName(discriminatorNames, index);
        const optionResult = serializeFragmentUnionOption(registry, discriminatorName, fragmentSchema, context);
        referencedVariables = mergeVariables(referencedVariables, optionResult.referencedVariables);
        serializedFragments.push(optionResult.serializedValue);
    }
    return {
        serializedValue: ` { ${serializedFragments.join(', ')} }`,
        referencedVariables
    };
}

function serializeObjectField(
    registry: FieldOptionsRegistry,
    fieldSelector: NormalizedGraphqlValue,
    objectSchema: StrictObjectSchema<FieldShape>,
    context: BuildContext
): NormalizedGraphqlValue {
    const assignedName = maybeAssignFragmentName(registry, objectSchema, context);
    if (assignedName !== null) {
        return combineFieldSelectorAndFieldBody(
            fieldSelector,
            wrapFragmentReferenceAsBody(assignedName, context)
        );
    }
    return combineFieldSelectorAndFieldBody(
        fieldSelector,
        serializeObjectSchemaInline(registry, objectSchema, context)
    );
}

function serializeUnionField(
    registry: FieldOptionsRegistry,
    fieldSelector: NormalizedGraphqlValue,
    unionSchema: FragmentsSchema,
    context: BuildContext
): NormalizedGraphqlValue {
    return combineFieldSelectorAndFieldBody(
        fieldSelector,
        serializeFragments(registry, unionSchema._zod.propValues, unionSchema._zod.def.options, context)
    );
}

function trySerializeObjectField(
    registry: FieldOptionsRegistry,
    fieldSelector: NormalizedGraphqlValue,
    unwrapped: NonWrappedFieldSchema,
    context: BuildContext
): NormalizedGraphqlValue | null {
    if (!isObjectOrListSchema(unwrapped)) {
        return null;
    }
    const objectSchema = getObjectSchema(unwrapped);
    if (objectSchema === null) {
        return null;
    }
    return serializeObjectField(registry, fieldSelector, objectSchema, context);
}

function trySerializeUnionField(
    registry: FieldOptionsRegistry,
    fieldSelector: NormalizedGraphqlValue,
    unwrapped: NonWrappedFieldSchema,
    context: BuildContext
): NormalizedGraphqlValue | null {
    if (!isUnionOrListSchema(unwrapped)) {
        return null;
    }
    const unionSchema = getUnionSchema(unwrapped);
    if (unionSchema === null) {
        return null;
    }
    return serializeUnionField(registry, fieldSelector, unionSchema, context);
}

function serializeUnwrappedFieldBody(
    registry: FieldOptionsRegistry,
    fieldSelector: NormalizedGraphqlValue,
    unwrapped: NonWrappedFieldSchema,
    context: BuildContext
): NormalizedGraphqlValue | null {
    if (unwrapped instanceof $ZodUndefined) {
        return { serializedValue: '', referencedVariables: new Set() };
    }
    return trySerializeObjectField(registry, fieldSelector, unwrapped, context) ??
        trySerializeUnionField(registry, fieldSelector, unwrapped, context);
}

function serializeFieldSchema(
    registry: FieldOptionsRegistry,
    fieldName: string,
    fieldSchema: FieldSchema,
    context: BuildContext
): NormalizedGraphqlValue {
    const fieldSelector = serializedFieldSelector(registry, fieldName, fieldSchema);
    if (isCustomScalarSchema(fieldSchema)) {
        return fieldSelector;
    }
    const unwrapped = unwrapFieldSchema(fieldSchema);
    return serializeUnwrappedFieldBody(registry, fieldSelector, unwrapped, context) ?? fieldSelector;
}

export function serializeRootShape(
    registry: FieldOptionsRegistry,
    rootShape: FieldShape,
    context: BuildContext
): SerializedRootShape {
    let referencedVariables = new Set<string>();
    const bodyEntries: string[] = [];
    for (const [fieldName, fieldSchema] of Object.entries(rootShape)) {
        const serializedField = serializeFieldSchema(registry, fieldName, fieldSchema, context);
        if (serializedField.serializedValue.length > 0) {
            bodyEntries.push(serializedField.serializedValue);
        }
        referencedVariables = mergeVariables(referencedVariables, serializedField.referencedVariables);
    }
    return { bodyEntries, referencedVariables };
}
