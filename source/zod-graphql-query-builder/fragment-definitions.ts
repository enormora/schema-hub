export type FragmentDefinition = {
    typeName: string;
    body: string;
    referencedVariables: Set<string>;
};

export function formatFragmentDefinitions(definitions: Map<string, FragmentDefinition>): string {
    if (definitions.size === 0) {
        return '';
    }
    const sortedEntries = Array
        .from(definitions.entries())
        .toSorted(([nameA], [nameB]) => {
            return nameA.localeCompare(nameB);
        });
    const formatted = sortedEntries.map(([name, definition]) => {
        return `fragment ${name} on ${definition.typeName}${definition.body}`;
    });
    return ` ${formatted.join(' ')}`;
}
