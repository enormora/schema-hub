import { parseType } from 'graphql';

export function isValidGraphqlType(type: string): boolean {
    try {
        parseType(type);
        return true;
    } catch {
        return false;
    }
}
