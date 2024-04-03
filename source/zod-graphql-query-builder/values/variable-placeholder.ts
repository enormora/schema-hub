import { hasProperty, isRecord } from './record.js';

export type GraphqlVariablePlaceholder = {
    readonly variableName: string;
    readonly tag: symbol;
};

const variablePlaceholderSymbol = Symbol('GraphQL Variable Placeholder');

export function isVariablePlaceholder(value: unknown): value is GraphqlVariablePlaceholder {
    return isRecord(value) && hasProperty(value, 'tag') && value.tag === variablePlaceholderSymbol;
}

const graphqlVariableIdentifierPattern = /^\$[A-Z_a-z]\w*$/;

export function isValidVariableIdentifier(value: string): boolean {
    return graphqlVariableIdentifierPattern.test(value);
}

export function variablePlaceholder(variableName: string): GraphqlVariablePlaceholder {
    if (!isValidVariableIdentifier(variableName)) {
        throw new Error(`Variable "${variableName}" is not a valid variable name`);
    }

    return {
        variableName,
        tag: variablePlaceholderSymbol
    };
}
