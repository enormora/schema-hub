const graphqlNamePattern = /^[A-Z_a-z]\w*$/;

export function isValidGraphqlName(value: string): boolean {
    return graphqlNamePattern.test(value);
}
