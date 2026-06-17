import { type GraphqlEnumValue, isEnumValue } from './enum.ts';
import { isValidGraphqlName } from './name.ts';
import { isRecord } from './record.ts';
import { type GraphqlVariablePlaceholder, isVariablePlaceholder } from './variable-placeholder.ts';
import { mergeVariables } from './variable-set.ts';

type GraphqlObjectValue = { readonly [Key: string]: GraphqlValue; };

function isObjectValue(value: GraphqlValue): value is GraphqlObjectValue {
    return isRecord(value) && !isEnumValue(value) && !isVariablePlaceholder(value);
}

type GraphqlPrimitiveValue = boolean | number | string | null;

function isPrimitive(value: GraphqlValue): value is GraphqlPrimitiveValue {
    const type = typeof value;
    return value === null || type === 'number' || type === 'string' || type === 'boolean';
}

export type GraphqlValue =
    | GraphqlEnumValue
    | GraphqlObjectValue
    | GraphqlPrimitiveValue
    | GraphqlVariablePlaceholder
    | readonly GraphqlValue[];

export type NormalizedGraphqlValue = {
    readonly serializedValue: string;
    readonly referencedVariables: ReadonlySet<string>;
};

function serializePrimitiveValue(value: GraphqlPrimitiveValue): string {
    return JSON.stringify(value);
}

function normalizeObjectValue(value: GraphqlObjectValue): NormalizedGraphqlValue {
    let referencedVariables = new Set<string>();
    const serializedFields: string[] = [];

    const sortedEntries = Object
        .entries(value)
        .toSorted(function ([ nameA ], [ nameB ]) {
            return nameA.localeCompare(nameB);
        });

    for (const [ fieldName, fieldValue ] of sortedEntries) {
        if (!isValidGraphqlName(fieldName)) {
            throw new Error(`Field name "${fieldName}" is not a valid GraphQL field name`);
        }
        // eslint-disable-next-line @typescript-eslint/no-use-before-define -- mutual recursion
        const normalizedFieldValue = normalizeGraphqlValue(fieldValue);
        serializedFields.push(`${fieldName}: ${normalizedFieldValue.serializedValue}`);
        referencedVariables = mergeVariables(referencedVariables, normalizedFieldValue.referencedVariables);
    }

    return {
        serializedValue: `{${serializedFields.join(', ')}}`,
        referencedVariables
    };
}

function normalizeListValue(value: readonly GraphqlValue[]): NormalizedGraphqlValue {
    let referencedVariables = new Set<string>();
    const serializedItems: string[] = [];

    for (const item of value) {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define -- mutual recursion
        const normalizedItem = normalizeGraphqlValue(item);
        serializedItems.push(normalizedItem.serializedValue);
        referencedVariables = mergeVariables(referencedVariables, normalizedItem.referencedVariables);
    }

    return {
        serializedValue: `[${serializedItems.join(', ')}]`,
        referencedVariables
    };
}
export function normalizeGraphqlValue(value: GraphqlValue): NormalizedGraphqlValue {
    const referencedVariables = new Set<string>();

    if (isPrimitive(value)) {
        return {
            serializedValue: serializePrimitiveValue(value),
            referencedVariables
        };
    }
    if (isEnumValue(value)) {
        return {
            serializedValue: value.enumValue,
            referencedVariables
        };
    }
    if (isVariablePlaceholder(value)) {
        return {
            serializedValue: value.variableName,
            referencedVariables: new Set([ ...referencedVariables, value.variableName ])
        };
    }
    if (isObjectValue(value)) {
        return normalizeObjectValue(value);
    }

    return normalizeListValue(value);
}
