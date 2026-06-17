import type { VariableDefinitions } from './variable-definition.ts';

export function ensureValidVariableCorrelations(
    variableDefinitions: VariableDefinitions,
    referencedVariables: ReadonlySet<string>
): void {
    const unusedVariableDefinitions = new Set(Object.keys(variableDefinitions));

    for (const referencedVariable of referencedVariables) {
        unusedVariableDefinitions.delete(referencedVariable);
        if (!Object.hasOwn(variableDefinitions, referencedVariable)) {
            throw new Error(`Referenced variable "${referencedVariable}" is missing in variableDefinitions`);
        }
    }

    const [ firstUnusedVariable ] = Array.from(unusedVariableDefinitions);
    if (firstUnusedVariable !== undefined) {
        throw new Error(`Variable definition for "${firstUnusedVariable}" is never referenced`);
    }
}
