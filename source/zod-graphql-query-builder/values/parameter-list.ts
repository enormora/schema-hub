import { isValidGraphqlName } from './name.js';
import { type GraphqlValue, type NormalizedGraphqlValue, normalizeGraphqlValue } from './value.js';

export function normalizeParameterList(parameters: Record<string, GraphqlValue>): NormalizedGraphqlValue {
    let referencedVariables = new Set<string>();
    const serializedParameters: string[] = [];

    for (const [parameterName, parameterValue] of Object.entries(parameters)) {
        if (!isValidGraphqlName(parameterName)) {
            throw new Error(`Parameter name "${parameterName}" is not a valid GraphQL parameter name`);
        }

        const normalizedParameterValue = normalizeGraphqlValue(parameterValue);
        serializedParameters.push(`${parameterName}: ${normalizedParameterValue.serializedValue}`);
        referencedVariables = new Set([...referencedVariables, ...normalizedParameterValue.referencedVariables]);
    }

    return {
        serializedValue: serializedParameters.length > 0 ? `(${serializedParameters.join(', ')})` : '',
        referencedVariables
    };
}
