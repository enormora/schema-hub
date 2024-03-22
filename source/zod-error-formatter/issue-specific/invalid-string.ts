import type { ZodInvalidStringIssue } from 'zod';

function hasProperty<ObjectType extends Record<string, unknown>, Key extends string>(
    object: ObjectType,
    key: Key
): object is Extract<ObjectType, Record<Key, unknown>> {
    return Object.hasOwn(object, key);
}

function formatIncludesValidation(includes: string, position?: number): string {
    if (position !== undefined) {
        return `string must include "${includes}" at one ore more positions greater than or equal to ${position}`;
    }

    return `string must include "${includes}"`;
}

export function formatInvalidStringIssueMessage(issue: ZodInvalidStringIssue): string {
    const { validation } = issue;

    if (validation === 'regex') {
        return 'string doesn’t match expected pattern';
    }
    if (typeof validation === 'string') {
        return `invalid ${validation}`;
    }
    if (hasProperty(validation, 'includes')) {
        return formatIncludesValidation(validation.includes, validation.position);
    }
    if (hasProperty(validation, 'startsWith')) {
        return `string must start with "${validation.startsWith}"`;
    }
    return `string must end with "${validation.endsWith}"`;
}
