import {
    ZodArray,
    type ZodBoolean,
    ZodDiscriminatedUnion,
    ZodEffects,
    ZodLazy,
    type ZodLiteral,
    type ZodNull,
    ZodNullable,
    type ZodNumber,
    ZodObject,
    type ZodRawShape,
    type ZodReadonly,
    type ZodString,
    ZodTuple,
    type ZodTypeAny,
    type ZodUndefined,
    type ZodUnion
} from 'zod';
import { type CustomScalarSchema, isCustomScalarSchema } from './custom-scalar.js';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions,@typescript-eslint/no-empty-object-type -- generic type alias can’t be circular
export interface StrictObjectSchema<Shape extends ZodRawShape>
    extends Omit<ZodObject<Shape, 'strict'>, 'deepPartial' | 'keyof'> {}

export function isStrictObjectSchema(schema: unknown): schema is StrictObjectSchema<FieldShape> {
    return schema instanceof ZodObject;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions,@typescript-eslint/no-empty-object-type -- generic type alias can’t be circular
interface EffectSchema<Schema extends ZodTypeAny> extends ZodEffects<Schema> {}

type LiteralSchema = ZodLiteral<boolean> | ZodLiteral<null> | ZodLiteral<number> | ZodLiteral<string>;
type PrimitiveSchema = LiteralSchema | ZodBoolean | ZodNull | ZodNumber | ZodString | ZodUndefined;

export type FragmentTypeName = boolean | number | string | null;

export declare type FragmentUnionOptionSchema = ZodObject<
    & FieldShape
    & {
        __typename: PrimitiveSchema;
    },
    'strict'
>;
// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style -- see https://github.com/microsoft/TypeScript/pull/57293
export type FieldShape = { readonly [FieldName: string]: FieldSchema; };
export type NonWrappedFieldSchema =
    | CustomScalarSchema<ZodTypeAny>
    | PrimitiveSchema
    | StrictObjectSchema<FieldShape>
    | ZodArray<FieldSchema>
    | ZodDiscriminatedUnion<'__typename', FragmentUnionOptionSchema[]>
    | ZodTuple<[FieldSchema, ...FieldSchema[]]>
    | ZodUnion<readonly [PrimitiveSchema, ...(readonly PrimitiveSchema[])]>;
export type WrappedFieldSchema =
    | EffectSchema<FieldSchema>
    | ZodLazy<FieldSchema>
    | ZodNullable<FieldSchema>
    | ZodReadonly<FieldSchema>;
export type FieldSchema = NonWrappedFieldSchema | WrappedFieldSchema;

function isWrappedFieldSchema(schema: FieldSchema): schema is WrappedFieldSchema {
    if (isCustomScalarSchema(schema)) {
        return false;
    }

    return schema instanceof ZodLazy || schema instanceof ZodEffects || schema instanceof ZodNullable;
}

type UnwrappedChainResult = {
    unwrappedSchema: NonWrappedFieldSchema;
    wrapperElements: WrappedFieldSchema[];
};

function recursiveUnwrapFieldSchemaChain(
    parent: FieldSchema,
    currentChain: WrappedFieldSchema[]
): UnwrappedChainResult {
    let unwrapped: FieldSchema = parent;

    if (!isWrappedFieldSchema(parent)) {
        return {
            unwrappedSchema: parent,
            wrapperElements: currentChain
        };
    }

    if (parent instanceof ZodLazy) {
        unwrapped = parent.schema;
    } else if (parent instanceof ZodEffects) {
        unwrapped = parent.innerType();
    } else if (parent instanceof ZodNullable) {
        unwrapped = parent.unwrap();
    }

    if (isWrappedFieldSchema(unwrapped)) {
        return recursiveUnwrapFieldSchemaChain(unwrapped, [...currentChain, parent]);
    }

    return {
        unwrappedSchema: unwrapped,
        wrapperElements: [...currentChain, parent]
    };
}

export function unwrapFieldSchemaChain(parent: FieldSchema): UnwrappedChainResult {
    return recursiveUnwrapFieldSchemaChain(parent, []);
}

export function unwrapFieldSchema(parent: FieldSchema): NonWrappedFieldSchema {
    const result = unwrapFieldSchemaChain(parent);
    return result.unwrappedSchema;
}

type QueryShape = Record<string, FieldSchema>;
export type QuerySchema = StrictObjectSchema<QueryShape>;

export type ObjectOrListSchema =
    | StrictObjectSchema<FieldShape>
    | ZodArray<FieldSchema>
    | ZodTuple<[FieldSchema, ...FieldSchema[]]>;

export function isObjectOrListSchema(schema: FieldSchema): schema is ObjectOrListSchema {
    return isStrictObjectSchema(schema) || schema instanceof ZodArray || schema instanceof ZodTuple;
}

export type FragmentsSchema = ZodDiscriminatedUnion<'__typename', FragmentUnionOptionSchema[]>;

export function isFragmentsSchema(schema: FieldSchema): schema is FragmentsSchema {
    return schema instanceof ZodDiscriminatedUnion;
}

export type UnionOrListSchema = FragmentsSchema | ZodArray<FieldSchema> | ZodTuple<[FieldSchema, ...FieldSchema[]]>;

export function isUnionOrListSchema(schema: FieldSchema): schema is UnionOrListSchema {
    return isFragmentsSchema(schema) || schema instanceof ZodArray || schema instanceof ZodTuple;
}
