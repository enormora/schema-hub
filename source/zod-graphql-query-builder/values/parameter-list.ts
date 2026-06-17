import { isValidGraphqlName } from './name.ts';
import { type GraphqlValue, type NormalizedGraphqlValue, normalizeGraphqlValue } from './value.ts';
import { mergeVariables } from './variable-set.ts';

export function normalizeParameterList(parameters: Readonly<Record<string, GraphqlValue>>): NormalizedGraphqlValue {
    let referencedVariables = new Set<string>();
    const serializedParameters: string[] = [];

    const sortedEntries = Object
        .entries(parameters)
        .toSorted(function ([ nameA ], [ nameB ]) {
            return nameA.localeCompare(nameB);
        });

    for (const [ parameterName, parameterValue ] of sortedEntries) {
        if (!isValidGraphqlName(parameterName)) {
            throw new Error(`Parameter name "${parameterName}" is not a valid GraphQL parameter name`);
        }

        const normalizedParameterValue = normalizeGraphqlValue(parameterValue);
        serializedParameters.push(`${parameterName}: ${normalizedParameterValue.serializedValue}`);
        referencedVariables = mergeVariables(referencedVariables, normalizedParameterValue.referencedVariables);
    }

    return {
        serializedValue: serializedParameters.length > 0 ? `(${serializedParameters.join(', ')})` : '',
        referencedVariables
    };
}
