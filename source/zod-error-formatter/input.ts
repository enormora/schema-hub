export function formatInput(input: unknown): string {
    if (Array.isArray(input)) {
        return 'array';
    }
    if (input === null) {
        return 'null';
    }

    return typeof input;
}
