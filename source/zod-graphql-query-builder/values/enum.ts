import { isValidGraphqlName } from './name.js';
import { hasProperty, isRecord } from './record.js';

export type GraphqlEnumValue = {
    readonly enumValue: string;
    readonly tag: symbol;
};

const enumValueSymbol = Symbol('GraphQL enum value');

export function isEnumValue(value: unknown): value is GraphqlEnumValue {
    return isRecord(value) && hasProperty(value, 'tag') && value.tag === enumValueSymbol;
}

export function enumValue(value: string): GraphqlEnumValue {
    if (!isValidGraphqlName(value)) {
        throw new Error(`Enum value "${value}" is not a valid enum value`);
    }

    return {
        enumValue: value,
        tag: enumValueSymbol
    };
}
