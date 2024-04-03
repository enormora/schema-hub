import { isValidVariableIdentifier } from './values/variable-placeholder.js';
import { isValidGraphqlType } from './variable-type.js';

export type VariableDefinitions = Record<string, string>;

type VariableDefinitionPair = readonly [variableName: string, variableType: string];

function ensureValidVariableDefinition(variableDefinition: VariableDefinitionPair): void {
    const [variableName, variableType] = variableDefinition;

    if (!isValidVariableIdentifier(variableName)) {
        throw new Error(`Variable name "${variableName}" is not a valid GraphQL variable name`);
    }
    if (!isValidGraphqlType(variableType)) {
        throw new Error(`Type "${variableType}" for variable "${variableName}" is invalid`);
    }
}

function serializeVariableDefinitionPair(variableDefinition: VariableDefinitionPair): string {
    const [variableName, variableType] = variableDefinition;
    return `${variableName}: ${variableType}`;
}

export function serializeVariableDefinitions(definitions: VariableDefinitions): string {
    const entries = Object.entries(definitions);

    if (entries.length === 0) {
        return '';
    }

    entries.forEach(ensureValidVariableDefinition);
    const serializedEntries = entries.map(serializeVariableDefinitionPair);

    return `(${serializedEntries.join(', ')})`;
}
