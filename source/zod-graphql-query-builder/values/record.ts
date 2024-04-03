export function hasProperty<Value extends Record<string, unknown>, Property extends string>(
    value: Value,
    property: Property
): value is Record<Property, unknown> & Value {
    return Object.hasOwn(value, property);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
