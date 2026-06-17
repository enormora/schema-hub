import type { FragmentDefinition } from './fragment-definitions.ts';
import type { FieldSchema, FieldShape } from './query-schema.ts';
import { collectSchemaReferences } from './serializer.ts';
import type { FieldOptionsRegistry } from './type-name.ts';

// StrictObjectSchema<FieldShape> as a Map key triggers TS2589 (excessively deep). The shape
// of the schema is irrelevant for identity-based lookups, so we widen to FieldSchema here.
/* eslint-disable functional/type-declaration-immutability, enormora-typescript/prefer-readonly-types -- mutable accumulator threaded through the recursive serializer */
export type BuildContext = {
    counts: ReadonlyMap<FieldSchema, number>;
    nameForSchema: Map<FieldSchema, string>;
    counterPerTypeName: Map<string, number>;
    definitions: Map<string, FragmentDefinition>;
};
/* eslint-enable functional/type-declaration-immutability, enormora-typescript/prefer-readonly-types -- end of the mutable accumulator type */

export function createBuildContext(
    registry: FieldOptionsRegistry,
    rootShape: FieldShape
): BuildContext {
    return {
        counts: collectSchemaReferences(registry, rootShape),
        nameForSchema: new Map(),
        counterPerTypeName: new Map(),
        definitions: new Map()
    };
}
