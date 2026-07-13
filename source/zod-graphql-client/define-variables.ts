import { z } from 'zod/v4-mini';
import type { $ZodType } from 'zod/v4/core';
import { safeParse, type SafeParseResult } from '../zod-error-formatter/formatter.ts';
import {
    type GraphqlVariablePlaceholder,
    variablePlaceholder
} from '../zod-graphql-query-builder/values/variable-placeholder.ts';
import { inferGraphqlType } from './infer-graphql-type.ts';
import {
    type EntryValueType,
    getEntrySchema,
    isExplicitVariableEntry,
    type VariableEntry
} from './variable-entry.ts';

export type VariableValues<Variables extends Record<string, VariableEntry>> = {
    readonly [Name in keyof Variables]: EntryValueType<Variables[Name]>;
};

const variableMapMetadataKey = Symbol('variable-map-metadata');

type AnyVariableMapMetadata = {
    readonly definitions: Readonly<Record<string, string>>;
    readonly parse: (input: unknown) => SafeParseResult<Readonly<Record<string, unknown>>>;
};

type VariableMapMetadata<Variables extends Record<string, VariableEntry>> = {
    readonly definitions: Readonly<Record<string, string>>;
    readonly parse: (input: unknown) => SafeParseResult<VariableValues<Variables>>;
};

declare const variableMapHandleBrand: unique symbol;

export type AnyVariableMapHandle = {
    readonly [variableMapHandleBrand]?: true;
    readonly [variableMapMetadataKey]: AnyVariableMapMetadata;
};

export type MaybeVariables = AnyVariableMapHandle | undefined;

export type VariableMapHandle<Variables extends Record<string, VariableEntry>> =
    & AnyVariableMapHandle
    & Readonly<Record<string & keyof Variables, GraphqlVariablePlaceholder>>
    & {
        readonly [variableMapMetadataKey]: VariableMapMetadata<Variables>;
    };

type MapOfHandle<Handle> = Handle extends VariableMapHandle<infer Variables> ? Variables : never;

export type ValuesOfVariableMapHandle<Handle extends AnyVariableMapHandle> = VariableValues<MapOfHandle<Handle>>;

export function getVariableMapMetadata(handle: AnyVariableMapHandle): AnyVariableMapMetadata {
    return handle[variableMapMetadataKey];
}

type PreparedMap = {
    readonly definitions: Readonly<Record<string, string>>;
    readonly schemaShape: Readonly<Record<string, $ZodType>>;
    readonly placeholders: Readonly<Record<string, GraphqlVariablePlaceholder>>;
};

function prepareVariableMap(map: Readonly<Record<string, VariableEntry>>): PreparedMap {
    const definitions: Record<string, string> = {};
    const schemaShape: Record<string, $ZodType> = {};
    const placeholders: Record<string, GraphqlVariablePlaceholder> = {};

    for (const [ name, entry ] of Object.entries(map)) {
        const placeholderName = `$${name}`;
        placeholders[name] = variablePlaceholder(placeholderName);
        definitions[placeholderName] = isExplicitVariableEntry(entry) ? entry.type : inferGraphqlType(entry);
        schemaShape[name] = getEntrySchema(entry);
    }

    return { definitions, schemaShape, placeholders };
}

export function defineVariables<Variables extends Record<string, VariableEntry>>(
    map: Variables
): VariableMapHandle<Variables> {
    const { definitions, schemaShape, placeholders } = prepareVariableMap(map);
    const combinedSchema = z.object(schemaShape);

    const metadata: VariableMapMetadata<Variables> = {
        definitions: Object.freeze(definitions),
        parse(input: unknown): SafeParseResult<VariableValues<Variables>> {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the dynamically built schema parses into VariableValues<Variables>
            return safeParse(combinedSchema, input) as SafeParseResult<VariableValues<Variables>>;
        }
    };

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unsafe-type-assertion -- combined placeholder map + metadata symbol can't be inferred to VariableMapHandle<Variables> structurally
    const handle = {
        ...placeholders,
        [variableMapMetadataKey]: metadata
    } as VariableMapHandle<Variables>;
    return handle;
}
