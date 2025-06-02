/* eslint-disable no-underscore-dangle -- we need to access _zod */
/* eslint-disable @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-object-type -- using an interface to avoid circular reference */
import {
    type $strict,
    $ZodArray,
    type $ZodBoolean,
    $ZodDiscriminatedUnion,
    $ZodLazy,
    type $ZodLiteral,
    type $ZodNull,
    $ZodNullable,
    type $ZodNumber,
    $ZodObject,
    $ZodPipe,
    $ZodReadonly,
    type $ZodShape,
    type $ZodString,
    type $ZodTransform,
    $ZodTuple,
    type $ZodType,
    type $ZodUndefined,
    type $ZodUnion
} from 'zod/v4/core';
import { type CustomScalarSchema, isCustomScalarSchema } from './custom-scalar.js';

export interface StrictObjectSchema<Shape extends $ZodShape> extends $ZodObject<Shape, $strict> {}

// @ts-expect-error -- ok in this case
export function isStrictObjectSchema(schema: unknown): schema is StrictObjectSchema<FieldShape> {
    return schema instanceof $ZodObject;
}

type LiteralSchema = $ZodLiteral<boolean> | $ZodLiteral<null> | $ZodLiteral<number> | $ZodLiteral<string>;
type PrimitiveSchema = $ZodBoolean | $ZodNull | $ZodNumber | $ZodString | $ZodUndefined | LiteralSchema;

export type FragmentTypeName = boolean | number | string | null;

export interface FragmentUnionOptionSchema extends
    StrictObjectSchema<
        & FieldShape
        & {
            __typename: PrimitiveSchema;
        }
    > {}

interface FieldTuple extends $ZodTuple<readonly [FieldSchema, ...(readonly FieldSchema[])]> {}
export interface FieldArray extends $ZodArray<FieldSchema> {}
interface FieldDiscriminatedUnion extends $ZodDiscriminatedUnion<FragmentUnionOptionSchema[]> {}
interface FieldUnion extends $ZodUnion<readonly [PrimitiveSchema, ...(readonly PrimitiveSchema[])]> {}
export type NonWrappedFieldSchema =
    | CustomScalarSchema<$ZodType>
    | FieldArray
    | FieldDiscriminatedUnion
    | FieldTuple
    | FieldUnion
    | PrimitiveSchema
    | StrictObjectSchema<FieldShape>;
interface FieldLazy extends $ZodLazy<FieldSchema> {}
interface FieldNullable extends $ZodNullable<FieldSchema> {}
interface FieldReadonly extends $ZodReadonly<FieldSchema> {}
interface FieldPipe extends $ZodPipe<FieldSchema, $ZodTransform> {}
export type WrappedFieldSchema =
    | FieldLazy
    | FieldNullable
    | FieldPipe
    | FieldReadonly;
export type FieldSchema = NonWrappedFieldSchema | WrappedFieldSchema;

function isWrappedFieldSchema(schema: FieldSchema): schema is WrappedFieldSchema {
    if (isCustomScalarSchema(schema)) {
        return false;
    }

    return schema instanceof $ZodLazy || schema instanceof $ZodPipe || schema instanceof $ZodNullable ||
        schema instanceof $ZodReadonly;
}

type UnwrappedChainResult = {
    unwrappedSchema: NonWrappedFieldSchema;
    wrapperElements: WrappedFieldSchema[];
};

// eslint-disable-next-line max-statements,complexity -- no idea how to refactor for now
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

    if (parent instanceof $ZodLazy) {
        unwrapped = parent._zod.def.getter() as FieldSchema;
    } else if (parent instanceof $ZodPipe) {
        unwrapped = parent._zod.def.in as FieldSchema;
    } else if (parent instanceof $ZodNullable) {
        unwrapped = parent._zod.def.innerType;
    } else if (parent instanceof $ZodReadonly) {
        unwrapped = parent._zod.def.innerType as FieldSchema;
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

// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style -- using an interface to avoid circular reference
export interface FieldShape {
    [key: string]: FieldSchema;
}
export type QuerySchema = $ZodReadonly<StrictObjectSchema<FieldShape>> | StrictObjectSchema<FieldShape>;

type FieldSchemaTupleItems = readonly [FieldSchema, ...FieldSchema[]];
export type FieldSchemaTuple = $ZodTuple<FieldSchemaTupleItems, FieldSchema | null>;

export type ObjectOrListSchema =
    | FieldArray
    | FieldSchemaTuple
    | StrictObjectSchema<FieldShape>;

export function isObjectOrListSchema(schema: FieldSchema): schema is ObjectOrListSchema {
    return isStrictObjectSchema(schema) || schema instanceof $ZodArray || schema instanceof $ZodTuple;
}

export type FragmentsSchema = $ZodDiscriminatedUnion<FragmentUnionOptionSchema[]>;

export function isFragmentsSchema(schema: FieldSchema): schema is FragmentsSchema {
    return schema instanceof $ZodDiscriminatedUnion;
}

export type UnionOrListSchema =
    | FieldArray
    | FieldSchemaTuple
    | FragmentsSchema;

export function isUnionOrListSchema(schema: FieldSchema): schema is UnionOrListSchema {
    return isFragmentsSchema(schema) || schema instanceof $ZodArray || schema instanceof $ZodTuple;
}
