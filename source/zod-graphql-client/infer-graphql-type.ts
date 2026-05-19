/* eslint-disable no-underscore-dangle -- we need to access _zod */
import {
    $ZodArray,
    $ZodBoolean,
    $ZodNullable,
    $ZodNumber,
    $ZodOptional,
    $ZodString,
    type $ZodType
} from 'zod/v4/core';

export class GraphqlTypeInferenceError extends Error {
    public constructor(message: string) {
        super(message);
        // eslint-disable-next-line functional/no-this-expressions -- sub-classing errors is one of the few exceptions where classes are useful
        this.name = 'GraphqlTypeInferenceError';
    }
}

const integerNumberFormats = new Set(['safeint', 'int32', 'int64', 'uint32', 'uint64']);

type NumberDefShape = {
    format?: string;
    checks?: readonly { _zod: { def: { format?: string; }; }; }[];
};

function hasIntegerFormat(schema: $ZodNumber): boolean {
    const def = schema._zod.def as NumberDefShape;
    if (def.format !== undefined && integerNumberFormats.has(def.format)) {
        return true;
    }
    const { checks = [] } = def;
    return checks.some((check) => {
        const checkFormat = check._zod.def.format;
        return checkFormat !== undefined && integerNumberFormats.has(checkFormat);
    });
}

function unwrapNullable(schema: $ZodType): { readonly innerSchema: $ZodType; readonly isNullable: boolean; } {
    let current: $ZodType = schema;
    let isNullable = false;
    while (current instanceof $ZodNullable || current instanceof $ZodOptional) {
        current = current._zod.def.innerType;
        isNullable = true;
    }
    return { innerSchema: current, isNullable };
}

export function inferGraphqlType(schema: $ZodType): string {
    const { innerSchema, isNullable } = unwrapNullable(schema);
    // eslint-disable-next-line @typescript-eslint/no-use-before-define -- mutual recursion via arrays
    const nonNullType = inferNonNullType(innerSchema);
    return isNullable ? nonNullType : `${nonNullType}!`;
}

function inferPrimitiveType(schema: $ZodType): string | null {
    if (schema instanceof $ZodString) {
        return 'String';
    }
    if (schema instanceof $ZodBoolean) {
        return 'Boolean';
    }
    if (schema instanceof $ZodNumber) {
        return hasIntegerFormat(schema) ? 'Int' : 'Float';
    }
    return null;
}

function inferNonNullType(schema: $ZodType): string {
    if (schema instanceof $ZodArray) {
        return `[${inferGraphqlType(schema._zod.def.element)}]`;
    }
    const primitiveType = inferPrimitiveType(schema);
    if (primitiveType !== null) {
        return primitiveType;
    }
    // eslint-disable-next-line @typescript-eslint/no-use-before-define -- thrown only after the early-return paths are exhausted
    throw new GraphqlTypeInferenceError(buildInferenceErrorMessage(schema._zod.def.type));
}

function buildInferenceErrorMessage(kind: string): string {
    return [
        `Cannot infer a GraphQL type for Zod schema of kind "${kind}".`,
        'Use variable(type, schema) to declare the GraphQL type explicitly.'
    ]
        .join(' ');
}
