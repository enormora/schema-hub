/* eslint-disable no-underscore-dangle -- we need to access _zod */
/* eslint-disable @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-object-type -- using an interface to avoid circular reference */
import {
    type $strict,
    $ZodArray,
    type $ZodArrayDef,
    type $ZodBoolean,
    $ZodDiscriminatedUnion,
    type $ZodDiscriminatedUnionDef,
    $ZodLazy,
    type $ZodLazyDef,
    type $ZodLiteral,
    type $ZodNull,
    $ZodNullable,
    type $ZodNullableDef,
    type $ZodNumber,
    $ZodObject,
    type $ZodObjectConfig,
    type $ZodObjectDef,
    $ZodPipe,
    $ZodReadonly,
    type $ZodReadonlyDef,
    type $ZodShape,
    type $ZodString,
    type $ZodTransform,
    $ZodTuple,
    type $ZodTupleDef,
    type $ZodType,
    type $ZodTypeInternals,
    type $ZodUndefined,
    type $ZodUnionDef,
    type util as zodUtil
} from 'zod/v4/core';
import { type CustomScalarSchema, isCustomScalarSchema } from './custom-scalar.js';

/*
 * Drop-in replacements for the zod-v4 schema types whose `_zod` derivations
 * blow the TypeScript instantiation depth when used in a recursive union (see
 * enormora/schema-hub#285). Two upstream bugs are involved:
 *
 *   - colinhacks/zod#4611 — the wrappers $ZodLazy/$ZodNullable/$ZodReadonly/
 *     $ZodPipe bubble `optin`/`optout`/`values`/`pattern`/`propValues` from
 *     their inner generic. The maintainer is "not planning to pursue a fix."
 *
 *   - colinhacks/zod#6015 — $ZodObject/$ZodArray/$ZodUnion/$ZodTuple/
 *     $ZodDiscriminatedUnion derive their `_zod.output`/`_zod.input` from
 *     their inner generic, which cycles in recursive unions once
 *     materialization is forced.
 *
 * Each interface only models the slice of `_zod.def` the builder reads at
 * runtime, which is enough for structural assignability from the real
 * `$Zod*` class. When the matching upstream issue is fixed, search for
 * `Gh4611` / `Gh6015` and swap that group back to the original `$Zod*<...>`
 * types — the deletion is mechanical.
 */
interface ZodLazyGh4611IssueWorkaround<T extends $ZodType = $ZodType> extends $ZodType {
    readonly _zod: $ZodTypeInternals & { readonly def: $ZodLazyDef<T>; };
}
interface ZodNullableGh4611IssueWorkaround<T extends $ZodType = $ZodType> extends $ZodType {
    readonly _zod: $ZodTypeInternals & { readonly def: $ZodNullableDef<T>; };
}
interface ZodReadonlyGh4611IssueWorkaround<T extends $ZodType = $ZodType> extends $ZodType {
    readonly _zod: $ZodTypeInternals & { readonly def: $ZodReadonlyDef<T>; };
}
interface ZodPipeGh4611IssueWorkaround<A extends $ZodType = $ZodType, B extends $ZodType = $ZodType> extends $ZodType {
    readonly _zod: $ZodTypeInternals & {
        readonly def: { readonly type: 'pipe'; readonly in: A; readonly out: B; };
    };
}
interface ZodObjectGh6015IssueWorkaround<
    Shape extends $ZodShape = $ZodShape,
    Config extends $ZodObjectConfig = $ZodObjectConfig
> extends $ZodType {
    readonly _zod: $ZodTypeInternals & { readonly def: $ZodObjectDef<Shape>; readonly config: Config; };
}
interface ZodArrayGh6015IssueWorkaround<T extends $ZodType = $ZodType> extends $ZodType {
    readonly _zod: $ZodTypeInternals & { readonly def: $ZodArrayDef<T>; };
}
interface ZodUnionGh6015IssueWorkaround<T extends readonly $ZodType[] = readonly $ZodType[]> extends $ZodType {
    readonly _zod: $ZodTypeInternals & { readonly def: $ZodUnionDef<T>; };
}
interface ZodDiscriminatedUnionGh6015IssueWorkaround<
    Options extends readonly $ZodType[] = readonly $ZodType[],
    Disc extends string = string
> extends $ZodType {
    readonly _zod: $ZodTypeInternals & {
        readonly def: $ZodDiscriminatedUnionDef<Options, Disc>;
        readonly propValues: zodUtil.PropValues;
    };
}
interface ZodTupleGh6015IssueWorkaround<
    T extends zodUtil.TupleItems = readonly $ZodType[],
    Rest extends $ZodType | null = $ZodType | null
> extends $ZodType {
    readonly _zod: $ZodTypeInternals & { readonly def: $ZodTupleDef<T, Rest>; };
}

export interface StrictObjectSchema<Shape extends $ZodShape> extends ZodObjectGh6015IssueWorkaround<Shape, $strict> {}

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

interface FieldTuple extends ZodTupleGh6015IssueWorkaround<readonly [FieldSchema, ...(readonly FieldSchema[])]> {}
export interface FieldArray extends ZodArrayGh6015IssueWorkaround<FieldSchema> {}
interface FieldDiscriminatedUnion extends ZodDiscriminatedUnionGh6015IssueWorkaround<FragmentUnionOptionSchema[]> {}
interface FieldUnion
    extends ZodUnionGh6015IssueWorkaround<readonly [PrimitiveSchema, ...(readonly PrimitiveSchema[])]> {}
export type NonWrappedFieldSchema =
    | CustomScalarSchema<$ZodType>
    | FieldArray
    | FieldDiscriminatedUnion
    | FieldTuple
    | FieldUnion
    | PrimitiveSchema
    | StrictObjectSchema<FieldShape>;
interface FieldLazy extends ZodLazyGh4611IssueWorkaround<FieldSchema> {}
interface FieldNullable extends ZodNullableGh4611IssueWorkaround<FieldSchema> {}
interface FieldReadonly extends ZodReadonlyGh4611IssueWorkaround<FieldSchema> {}
interface FieldPipe extends ZodPipeGh4611IssueWorkaround<FieldSchema, $ZodTransform> {}
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

export interface FieldShape {
    [key: string]: FieldSchema;
}
export type QuerySchema =
    | StrictObjectSchema<FieldShape>
    | ZodReadonlyGh4611IssueWorkaround<StrictObjectSchema<FieldShape>>;

type FieldSchemaTupleItems = readonly [FieldSchema, ...FieldSchema[]];
export type FieldSchemaTuple = ZodTupleGh6015IssueWorkaround<FieldSchemaTupleItems, FieldSchema | null>;

export type ObjectOrListSchema =
    | FieldArray
    | FieldSchemaTuple
    | StrictObjectSchema<FieldShape>;

export function isFieldArraySchema(schema: FieldSchema): schema is FieldArray {
    return schema instanceof $ZodArray;
}

export function isFieldTupleSchema(schema: FieldSchema): schema is FieldSchemaTuple {
    return schema instanceof $ZodTuple;
}

export function isObjectOrListSchema(schema: FieldSchema): schema is ObjectOrListSchema {
    return isStrictObjectSchema(schema) || isFieldArraySchema(schema) || isFieldTupleSchema(schema);
}

export type FragmentsSchema = ZodDiscriminatedUnionGh6015IssueWorkaround<FragmentUnionOptionSchema[]>;

export function isFragmentsSchema(schema: FieldSchema): schema is FragmentsSchema {
    return schema instanceof $ZodDiscriminatedUnion;
}

export type UnionOrListSchema =
    | FieldArray
    | FieldSchemaTuple
    | FragmentsSchema;

export function isUnionOrListSchema(schema: FieldSchema): schema is UnionOrListSchema {
    return isFragmentsSchema(schema) || isFieldArraySchema(schema) || isFieldTupleSchema(schema);
}
