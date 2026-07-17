# stryker-zod-mutator

Adds Zod-specific schema mutations to StrykerJS.

## Installation

```bash
npm install --save-dev @schema-hub/stryker-zod-mutator
```

The package supports StrykerJS `>=9.6.0 <10` and Zod v4.

## Usage

```javascript
import { withDefaultZodMutators } from '@schema-hub/stryker-zod-mutator';

export default await withDefaultZodMutators({
    mutate: [ 'source/**/*.ts' ],
    testRunner: 'command',
    commandRunner: { command: 'npm test' }
});
```

Use `await` in the config file. Stryker’s mutator registry is ESM-only and not part of its public plugin API.

## Default Config

`withDefaultZodMutators` enables every Zod mutation category and every Zod mutation operator.

```javascript
{
    includedCategories: [
        'primitive',
        'presence',
        'readonly',
        'object',
        'string',
        'number',
        'collection',
        'union',
        'fallback',
        'coercion'
    ],
    includedOperators: [
        'ZodPrimitiveFactorySwap',
        'ZodOptionalAdd',
        'ZodOptionalRemove',
        'ZodNullableAdd',
        'ZodNullableRemove',
        'ZodNullishRemove',
        'ZodNullishToNullable',
        'ZodNullishToOptional',
        'ZodNonoptionalRemove',
        'ZodReadonlyAdd',
        'ZodReadonlyRemove',
        'ZodObjectPolicyAdd',
        'ZodObjectPolicyRemove',
        'ZodObjectFactorySwap',
        'ZodObjectCatchallRemove',
        'ZodObjectFieldRemove',
        'ZodObjectFieldOptionalAdd',
        'ZodObjectFieldNullableAdd',
        'ZodStringCheckRemove',
        'ZodStringBoundaryChange',
        'ZodStringFormatToString',
        'ZodNumberCheckRemove',
        'ZodNumberBoundaryChange',
        'ZodNumberStrictnessSwap',
        'ZodCollectionCheckRemove',
        'ZodCollectionBoundaryChange',
        'ZodArrayToTuple',
        'ZodTupleToArray',
        'ZodTupleItemRemove',
        'ZodTupleRestAdd',
        'ZodTupleRestRemove',
        'ZodRecordFactorySwap',
        'ZodUnionOptionRemove',
        'ZodEnumValueRemove',
        'ZodNumericLiteralChange',
        'ZodFallbackRemove',
        'ZodCustomBehaviorRemove',
        'ZodCoercionRemove'
    ]
}
```

## Selecting Mutations

```javascript
import { withZodMutators } from '@schema-hub/stryker-zod-mutator';

export default await withZodMutators({
    mutate: [ 'source/**/*.ts' ],
    testRunner: 'command',
    commandRunner: { command: 'npm test' }
}, {
    includedCategories: [ 'presence', 'object', 'string' ],
    includedOperators: undefined
});
```

Available categories are `primitive`, `presence`, `readonly`, `object`, `string`, `number`, `collection`,
`union`, `fallback`, and `coercion`.

## Supported Zod Imports

The mutator detects namespace, `z`, alias, and direct factory imports from:

- `zod`
- `zod/v4`
- `zod/mini`
- `zod/v4-mini`
- `zod/v4/mini`

It supports classic chains like `z.string().optional()` and mini calls like `z.optional(z.string())`.

## Mutations

The default set enables every operator below.

| Operator                      | Example input                                | Example mutant                            |
| ----------------------------- | -------------------------------------------- | ----------------------------------------- |
| `ZodPrimitiveFactorySwap`     | `z.string()`                                 | `z.number()`                              |
| `ZodOptionalAdd`              | `z.string()`                                 | `z.string().optional()`                   |
| `ZodOptionalRemove`           | `z.string().optional()`                      | `z.string()`                              |
| `ZodNullableAdd`              | `z.string()`                                 | `z.string().nullable()`                   |
| `ZodNullableRemove`           | `z.string().nullable()`                      | `z.string()`                              |
| `ZodNullishRemove`            | `z.string().nullish()`                       | `z.string()`                              |
| `ZodNullishToNullable`        | `z.string().nullish()`                       | `z.string().nullable()`                   |
| `ZodNullishToOptional`        | `z.nullish(z.string())`                      | `z.optional(z.string())`                  |
| `ZodNonoptionalRemove`        | `z.string().nonoptional()`                   | `z.string()`                              |
| `ZodReadonlyAdd`              | `z.object({ id: z.string() })`               | `z.object({ id: z.string() }).readonly()` |
| `ZodReadonlyRemove`           | `z.object({ id: z.string() }).readonly()`    | `z.object({ id: z.string() })`            |
| `ZodObjectPolicyAdd`          | `z.object({ id: z.string() })`               | `z.object({ id: z.string() }).strict()`   |
| `ZodObjectPolicyRemove`       | `z.object({}).passthrough()`                 | `z.object({})`                            |
| `ZodObjectFactorySwap`        | `z.object({})`                               | `z.strictObject({})`                      |
| `ZodObjectCatchallRemove`     | `z.object({}).catchall(z.string())`          | `z.object({})`                            |
| `ZodObjectFieldRemove`        | `z.object({ a: z.string(), b: z.number() })` | `z.object({ b: z.number() })`             |
| `ZodObjectFieldOptionalAdd`   | `z.object({ a: z.string() })`                | `z.object({ a: z.string().optional() })`  |
| `ZodObjectFieldNullableAdd`   | `z.object({ a: z.string() })`                | `z.object({ a: z.string().nullable() })`  |
| `ZodStringCheckRemove`        | `z.string().min(2)`                          | `z.string()`                              |
| `ZodStringBoundaryChange`     | `z.string().min(2)`                          | `z.string().min(1)`                       |
| `ZodStringFormatToString`     | `z.email()`                                  | `z.string()`                              |
| `ZodNumberCheckRemove`        | `z.number().int()`                           | `z.number()`                              |
| `ZodNumberBoundaryChange`     | `z.number().gt(5)`                           | `z.number().gt(4)`                        |
| `ZodNumberStrictnessSwap`     | `z.number().gt(5)`                           | `z.number().gte(5)`                       |
| `ZodCollectionCheckRemove`    | `z.array(z.string()).nonempty()`             | `z.array(z.string())`                     |
| `ZodCollectionBoundaryChange` | `z.array(z.string()).min(2)`                 | `z.array(z.string()).min(1)`              |
| `ZodArrayToTuple`             | `z.array(z.string())`                        | `z.tuple([z.string()])`                   |
| `ZodTupleToArray`             | `z.tuple([z.string()])`                      | `z.array(z.string())`                     |
| `ZodTupleItemRemove`          | `z.tuple([z.string(), z.number()])`          | `z.tuple([z.number()])`                   |
| `ZodTupleRestAdd`             | `z.tuple([z.string()])`                      | `z.tuple([z.string()], z.string())`       |
| `ZodTupleRestRemove`          | `z.tuple([z.string()], z.number())`          | `z.tuple([z.string()])`                   |
| `ZodRecordFactorySwap`        | `z.record(z.string(), z.string())`           | `z.partialRecord(z.string(), z.string())` |
| `ZodUnionOptionRemove`        | `z.union([z.string(), z.number()])`          | `z.union([z.number()])`                   |
| `ZodEnumValueRemove`          | `z.enum(['a', 'b'])`                         | `z.enum(['b'])`                           |
| `ZodNumericLiteralChange`     | `z.literal(2)`                               | `z.literal(1)`                            |
| `ZodFallbackRemove`           | `z.string().default('x')`                    | `z.string()`                              |
| `ZodCustomBehaviorRemove`     | `z.string().transform(String)`               | `z.string()`                              |
| `ZodCoercionRemove`           | `z.coerce.number()`                          | `z.number()`                              |

`ZodPrimitiveFactorySwap` swaps zero-argument calls among `z.string()`, `z.number()`, `z.bigint()`,
`z.boolean()`, `z.date()`, `z.symbol()`, `z.null()`, `z.undefined()`, `z.void()`, `z.never()`, `z.any()`,
and `z.unknown()`. It skips swaps between `z.any()` and `z.unknown()`, and between `z.void()` and
`z.undefined()`, because those pairs validate identically at runtime and would only produce equivalent
mutants. A `z.string()` used as a record key is never swapped to `z.any()` or `z.unknown()`, because object
keys are always strings, so those accept exactly the same keys.

`ZodObjectPolicyAdd` applies only to the `object`, `strictObject`, and `looseObject` factories, and never
adds the policy that already matches the factory default (`strip` for `object`, `strict` for
`strictObject`, `passthrough` for `looseObject`), since that has no runtime effect.

`ZodRecordFactorySwap` skips records whose key is `z.string()`, because `record`, `partialRecord`, and
`looseRecord` behave identically for an unbounded string key domain (the swap only matters for finite keys
such as an `enum`).

`ZodStringCheckRemove`, `ZodCollectionCheckRemove`, `ZodStringBoundaryChange`, and
`ZodCollectionBoundaryChange` treat a length lower bound of zero or less (`min(0)`, `minLength(0)`,
`minSize(0)`) as vacuous: removing it changes nothing, and lowering it further keeps it vacuous, so neither
mutation is emitted. Raising it (e.g. `min(0)` to `min(1)`) is still emitted, and numeric bounds such as
`z.number().min(0)` are untouched because there negative values are meaningful.

`ZodOptionalAdd` and `ZodObjectFieldOptionalAdd` skip schemas that already accept `undefined` (`z.any()`,
`z.unknown()`, `z.undefined()`, `z.void()`, `z.nullish()`, a `default`/`prefault` schema, and anything
already `optional`), and `ZodNullableAdd` and `ZodObjectFieldNullableAdd` skip schemas that already accept
`null` (`z.any()`, `z.unknown()`, `z.null()`, `z.nullish()`, and anything already `nullable`), because
wrapping them changes nothing at runtime. Both also see through `optional`/`nullable` (and other
value-preserving wrappers) to an `z.any()`/`z.unknown()` leaf, so e.g. `z.nullable(z.optional(z.unknown()))`
is not emitted. `ZodOptionalRemove` and `ZodNullableRemove` likewise skip removals whose remaining
schema still admits the value (e.g. removing `.optional()` from `z.unknown().optional()`). `ZodOptionalAdd`
and `ZodNullableAdd` also wrap only at the root of a schema value chain, so `z.string().min(2)` yields
`z.string().min(2).optional()` rather than the invalid `z.string().optional().min(2)`. They also skip a
`z.string()` part of a `z.templateLiteral([...])`, because a template part compiles to a regex fragment
and `z.string()` already matches both the empty string and `"null"`, so wrapping it changes nothing. Other
part types (e.g. `z.number()`) are still wrapped, since there the wrappers are observable.

`ZodReadonlyAdd` only targets schemas whose parsed value is frozen observably at runtime, namely the
object, `array`, `tuple`, and record families, including those wrapped in `optional`, `nullable`, `nullish`,
`nonoptional`, `default`, `prefault`, or `catch`. Primitives and other schemas are skipped because freezing
them has no effect. It emits a single mutant per schema value and skips schemas that already apply
`readonly` anywhere in that chain, so it never produces a redundant double `readonly`. `ZodReadonlyRemove`
mirrors this: it removes `readonly` only when the underlying value is one of those freezable families, since
removing it from a frozen primitive has no observable effect.

Boolean and string literal values are left to Stryker’s built-in literal mutators.

## Limits

This package monkeypatches Stryker internals because StrykerJS does not currently expose a custom mutator
plugin API. It only mutates schema expressions that are visibly rooted in a detected Zod import.

The guiding rule for every operator: emit a mutant unless it can be _proven_ unkillable from the current
module. A mutant we cannot prove equivalent is always emitted, even if it duplicates a wrapper already
applied elsewhere. Suppressing a mutant that some test could kill is never acceptable.

`ZodOptionalAdd` and `ZodNullableAdd` apply this with a module-local check: when the mutated node is the
whole value of, or a `union`/`discriminatedUnion` branch of, a **non-exported** `const`, and every
reference to that `const` in the module already applies the same wrapper (e.g. `const t = z.union([...])`
used only as `z.nullable(t)`), no test can observe the added wrapper, so it is skipped. Because the `const`
is not exported (nor re-exported via `export { t }` or `export default t`, both of which count as unmasked
uses), every use is visible in the one module and the proof is sound. Exported consts, or any unmasked or
unresolved reference, cause the mutant to be emitted.

## Binding resolution

Deciding whether a mutant is equivalent often needs the schema's real shape, which is not always written
inline. When an operator reaches a reference instead of a schema call (for example `z.optional(user)` where
`user` is a `const`), it resolves that reference back to its definition and continues the analysis there.
Resolution follows aliases (`const t = other`), object and array destructuring (`const { t } = shapes`),
member access into object literals (`const t = shapes.user`), and imports, including across modules: an
imported name is resolved by loading the source module, mapping the export back to its local definition
(named, aliased, or default), and recursing.

Cross-module resolution reads and parses the imported file. Module specifiers are resolved with the
TypeScript compiler API using the nearest discovered `tsconfig.json`, so `paths`, `baseUrl`, and extension
rewriting behave as they do in the project. This stays faithful to the guiding rule: anything that cannot
be resolved (a missing file, a `paths` alias with no matching config, a reference that turns out not to be
a schema, or a namespace import) is treated as unknown and the mutant is emitted rather than suppressed.
Only same-module (`export`) analysis is complete; a schema imported elsewhere and tested there is never
assumed unkillable.
