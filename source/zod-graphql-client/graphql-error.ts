import { z } from 'zod';
import { mapTuple, type NonEmptyArray } from '../tuple/non-empty-array.js';

const locationSchema = z
    .object({
        line: z.number().int().positive(),
        column: z.number().int().positive()
    })
    .strict();

type Location = z.infer<typeof locationSchema>;

const pathSegmentSchema = z.union([z.string(), z.number()]);

type PathSegment = z.infer<typeof pathSegmentSchema>;

export const graphqlErrorSchema = z
    .object({
        message: z.string(),
        locations: z.array(locationSchema).optional(),
        path: z.array(pathSegmentSchema).optional()
    })
    .strip();

export type GraphqlError = z.infer<typeof graphqlErrorSchema>;

function formatLocations(locations?: Location[]): string {
    if (locations === undefined) {
        return '';
    }

    const [firstLocation] = locations;
    if (firstLocation === undefined) {
        return '';
    }
    return `${firstLocation.line}:${firstLocation.column}`;
}

function formatPath(path?: PathSegment[]): string {
    return path === undefined ? '' : path.join('.');
}

function formatPrefix(error: GraphqlError): string {
    const formattedPath = formatPath(error.path);
    const formattedLocation = formatLocations(error.locations);

    if (formattedPath.length > 0 && formattedLocation.length > 0) {
        return `Error at ${formattedPath}:${formattedLocation} - `;
    }
    if (formattedPath.length > 0) {
        return `Error at ${formattedPath} - `;
    }
    if (formattedLocation.length > 0) {
        return `Error at ${formattedLocation} - `;
    }
    return '';
}

function formatGraphqlError(error: GraphqlError): string {
    const prefix = formatPrefix(error);
    return `${prefix}${error.message}`;
}

export function formatAllErrors(
    errors: NonEmptyArray<GraphqlError>
): NonEmptyArray<string> {
    return mapTuple(errors, formatGraphqlError);
}
