import type { FragmentDefinition } from './fragment-definitions.js';
import type { FieldSchema, FieldShape } from './query-schema.js';
import { collectSchemaReferences, type FieldOptionsRegistry } from './serializer.js';

// StrictObjectSchema<FieldShape> as a Map key triggers TS2589 (excessively deep). The shape
// of the schema is irrelevant for identity-based lookups, so we widen to FieldSchema here.
export type BuildContext = {
    counts: Map<FieldSchema, number>;
    nameForSchema: Map<FieldSchema, string>;
    counterPerTypeName: Map<string, number>;
    definitions: Map<string, FragmentDefinition>;
};

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
