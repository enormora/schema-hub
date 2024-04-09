import { type GraphqlEnumValue, isEnumValue } from './enum.js';
import { isValidGraphqlName } from './name.js';
import { isRecord } from './record.js';
import { type GraphqlVariablePlaceholder, isVariablePlaceholder } from './variable-placeholder.js';

// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style -- see https://github.com/microsoft/TypeScript/pull/57293
type GraphqlObjectValue = { [Key: string]: GraphqlValue; };

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
    | GraphqlValue[]
    | GraphqlVariablePlaceholder;

export type NormalizedGraphqlValue = {
    serializedValue: string;
    referencedVariables: Set<string>;
};

function serializePrimitiveValue(value: GraphqlPrimitiveValue): string {
    return JSON.stringify(value);
}

function normalizeObjectValue(value: GraphqlObjectValue): NormalizedGraphqlValue {
    let referencedVariables = new Set<string>();
    const serializedFields: string[] = [];

    for (const [fieldName, fieldValue] of Object.entries(value)) {
        if (!isValidGraphqlName(fieldName)) {
            throw new Error(`Field name "${fieldName}" is not a valid GraphQL field name`);
        }
        // eslint-disable-next-line @typescript-eslint/no-use-before-define -- mutual recursion
        const normalizedFieldValue = normalizeGraphqlValue(fieldValue);
        serializedFields.push(`${fieldName}: ${normalizedFieldValue.serializedValue}`);
        referencedVariables = new Set([...referencedVariables, ...normalizedFieldValue.referencedVariables]);
    }

    return {
        serializedValue: `{${serializedFields.join(', ')}}`,
        referencedVariables
    };
}

function normalizeListValue(value: GraphqlValue[]): NormalizedGraphqlValue {
    let referencedVariables = new Set<string>();
    const serializedItems: string[] = [];

    for (const item of value) {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define -- mutual recursion
        const normalizedItem = normalizeGraphqlValue(item);
        serializedItems.push(normalizedItem.serializedValue);
        referencedVariables = new Set([...referencedVariables, ...normalizedItem.referencedVariables]);
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
            referencedVariables: new Set([...referencedVariables, value.variableName])
        };
    }
    if (isObjectValue(value)) {
        return normalizeObjectValue(value);
    }

    return normalizeListValue(value);
}
