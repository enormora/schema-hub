export function mergeVariables(first: ReadonlySet<string>, second: ReadonlySet<string>): Set<string> {
    return new Set([...first, ...second]);
}
