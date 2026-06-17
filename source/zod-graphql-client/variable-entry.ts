import { $ZodType, type output as TypeOf } from 'zod/v4/core';

export type ExplicitVariableEntry<Schema extends $ZodType = $ZodType> = {
    readonly type: string;
    readonly schema: Schema;
};

// eslint-disable-next-line functional/type-declaration-immutability -- $ZodType is a third-party mutable type
export type VariableEntry = $ZodType | ExplicitVariableEntry;

type SchemaFromZodType<Entry> = Entry extends $ZodType ? Entry : never;

export type EntrySchema<Entry extends VariableEntry> = Entry extends ExplicitVariableEntry<infer Schema> ? Schema
    : SchemaFromZodType<Entry>;

export type EntryValueType<Entry extends VariableEntry> = TypeOf<EntrySchema<Entry>>;

export function isExplicitVariableEntry(entry: VariableEntry): entry is ExplicitVariableEntry {
    return !(entry instanceof $ZodType);
}

export function getEntrySchema(entry: VariableEntry): $ZodType {
    return isExplicitVariableEntry(entry) ? entry.schema : entry;
}

export function variable<Schema extends $ZodType>(type: string, schema: Schema): ExplicitVariableEntry<Schema> {
    return { type, schema };
}
