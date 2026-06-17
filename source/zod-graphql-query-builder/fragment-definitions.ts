export type FragmentDefinition = {
    readonly typeName: string;
    readonly body: string;
    readonly referencedVariables: ReadonlySet<string>;
};

export function formatFragmentDefinitions(definitions: ReadonlyMap<string, FragmentDefinition>): string {
    if (definitions.size === 0) {
        return '';
    }
    const sortedEntries = Array
        .from(definitions)
        .toSorted(function ([ nameA ], [ nameB ]) {
            return nameA.localeCompare(nameB);
        });
    const formatted = sortedEntries.map(function ([ name, definition ]) {
        return `fragment ${name} on ${definition.typeName}${definition.body}`;
    });
    return ` ${formatted.join(' ')}`;
}
