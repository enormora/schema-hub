import { z } from 'zod/v4-mini';
import type { $ZodType } from 'zod/v4/core';
import { safeParse, type SafeParseResult } from '../zod-error-formatter/formatter.js';
import {
    type GraphqlVariablePlaceholder,
    variablePlaceholder
} from '../zod-graphql-query-builder/values/variable-placeholder.js';
import { inferGraphqlType } from './infer-graphql-type.js';
import {
    type EntryValueType,
    getEntrySchema,
    isExplicitVariableEntry,
    type VariableEntry
} from './variable-entry.js';

export type VariableValues<Map extends Record<string, VariableEntry>> = {
    [Name in keyof Map]: EntryValueType<Map[Name]>;
};

const variableMapMetadataKey = Symbol('variable-map-metadata');

type AnyVariableMapMetadata = {
    readonly definitions: Readonly<Record<string, string>>;
    readonly parse: (input: unknown) => SafeParseResult<Record<string, unknown>>;
};

type VariableMapMetadata<Map extends Record<string, VariableEntry>> = {
    readonly definitions: Readonly<Record<string, string>>;
    readonly parse: (input: unknown) => SafeParseResult<VariableValues<Map>>;
};

declare const variableMapHandleBrand: unique symbol;

export type AnyVariableMapHandle = {
    readonly [variableMapHandleBrand]?: true;
    readonly [variableMapMetadataKey]: AnyVariableMapMetadata;
};

export type MaybeVariables = AnyVariableMapHandle | undefined;

export type VariableMapHandle<Map extends Record<string, VariableEntry>> =
    & AnyVariableMapHandle
    & Readonly<Record<string & keyof Map, GraphqlVariablePlaceholder>>
    & {
        readonly [variableMapMetadataKey]: VariableMapMetadata<Map>;
    };

type MapOfHandle<Handle> = Handle extends VariableMapHandle<infer Map> ? Map : never;

export type ValuesOfVariableMapHandle<Handle extends AnyVariableMapHandle> = VariableValues<MapOfHandle<Handle>>;

export function getVariableMapMetadata(handle: AnyVariableMapHandle): AnyVariableMapMetadata {
    return handle[variableMapMetadataKey];
}

type PreparedMap = {
    readonly definitions: Record<string, string>;
    readonly schemaShape: Record<string, $ZodType>;
    readonly placeholders: Record<string, GraphqlVariablePlaceholder>;
};

function prepareVariableMap(map: Record<string, VariableEntry>): PreparedMap {
    const definitions: Record<string, string> = {};
    const schemaShape: Record<string, $ZodType> = {};
    const placeholders: Record<string, GraphqlVariablePlaceholder> = {};

    for (const [name, entry] of Object.entries(map)) {
        const placeholderName = `$${name}`;
        placeholders[name] = variablePlaceholder(placeholderName);
        definitions[placeholderName] = isExplicitVariableEntry(entry) ? entry.type : inferGraphqlType(entry);
        schemaShape[name] = getEntrySchema(entry);
    }

    return { definitions, schemaShape, placeholders };
}

export function defineVariables<Map extends Record<string, VariableEntry>>(map: Map): VariableMapHandle<Map> {
    const { definitions, schemaShape, placeholders } = prepareVariableMap(map);
    const combinedSchema = z.object(schemaShape);

    const metadata: VariableMapMetadata<Map> = {
        definitions: Object.freeze(definitions),
        parse(input: unknown): SafeParseResult<VariableValues<Map>> {
            return safeParse(combinedSchema, input) as SafeParseResult<VariableValues<Map>>;
        }
    };

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- combined placeholder map + metadata symbol can't be inferred to VariableMapHandle<Map> structurally
    const handle = {
        ...placeholders,
        [variableMapMetadataKey]: metadata
    } as VariableMapHandle<Map>;
    return handle;
}
