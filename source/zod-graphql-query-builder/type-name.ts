/* eslint-disable no-underscore-dangle -- we need to access _zod */
import { $ZodLiteral } from 'zod/v4/core';
import {
    type FieldSchema,
    type FieldShape,
    type StrictObjectSchema,
    unwrapFieldSchema
} from './query-schema.ts';
import { isValidGraphqlName } from './values/name.ts';
import type { GraphqlValue } from './values/value.ts';

export type GraphqlFieldOptions = {
    readonly aliasFor?: string;
    readonly parameters?: Readonly<Record<string, GraphqlValue>>;
    readonly typeName?: string;
};

export type FieldOptionsRegistry = WeakMap<FieldSchema, GraphqlFieldOptions>;

function extractLiteralStringValue(schema: FieldSchema): string | null {
    const unwrapped = unwrapFieldSchema(schema);
    if (!(unwrapped instanceof $ZodLiteral)) {
        return null;
    }
    const { values } = unwrapped._zod.def;
    if (values.length !== 1) {
        return null;
    }
    const [ value ] = values;
    if (typeof value !== 'string') {
        return null;
    }
    return value;
}

function inferTypeNameFromShape(schema: StrictObjectSchema<FieldShape>): string | null {
    const typenameField = schema._zod.def.shape.__typename;
    if (typenameField === undefined) {
        return null;
    }
    const value = extractLiteralStringValue(typenameField);
    if (value === null || !isValidGraphqlName(value)) {
        return null;
    }
    return value;
}

function assertNoTypeNameConflict(explicit: string | null, inferred: string | null): void {
    if (explicit === null || inferred === null || explicit === inferred) {
        return;
    }
    const prefix = `Conflicting GraphQL type name for schema: registered as "${explicit}" but `;
    const suffix = `\`__typename\` literal is "${inferred}".`;
    throw new Error(prefix + suffix);
}

export function resolveTypeName(
    registry: FieldOptionsRegistry,
    schema: StrictObjectSchema<FieldShape>
): string | null {
    const explicit = registry.get(schema)?.typeName ?? null;
    const inferred = inferTypeNameFromShape(schema);
    assertNoTypeNameConflict(explicit, inferred);
    return explicit ?? inferred;
}
