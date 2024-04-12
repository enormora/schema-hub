type Variable = {
    type: string;
    value: unknown;
};

export type Variables = Record<string, Variable>;

export function extractVariableDefinitions(variables: Variables): Record<string, string> {
    const entries = Object.entries(variables);
    const entriesWithTypeOnly = entries.map(([name, variable]): [string, string] => {
        return [`$${name}`, variable.type];
    });
    return Object.fromEntries(entriesWithTypeOnly);
}

export function extractVariableValues(variables: Variables): Record<string, unknown> {
    const entries = Object.entries(variables);
    const entriesWithTypeOnly = entries.map(([name, variable]): [string, unknown] => {
        return [name, variable.value];
    });
    return Object.fromEntries(entriesWithTypeOnly);
}
