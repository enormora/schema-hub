# zod-graphql-query-builder

This library transforms a [`zod`](https://github.com/colinhacks/zod) schema into a GraphQL query or mutation.

## Example

**Input:**

```typescript
import { buildGraphqlQuery } from '@schema-hub/zod-graphql-query-builder';
import { z } from 'zod';

const mySchema = z.object({ foo: z.string() }).strict();
const query = buildGraphqlQuery(mySchema);
```

**Built query:**

```graphql
query { foo }
```

## Why?

- GraphQL has its own type system, requiring effort to map it to other type systems like TypeScript.
- Common alternatives, like code generation, suffer from issues such as potential out-of-sync generated code and lack of runtime validation.
- Utilizing `zod` schemas enables easy use of schemas for runtime validation.
- Even if we own the GraphQL server, we cannot always trust the types due to potential modifications by browser extensions or proxies. Hence, strict runtime verification of incoming data is crucial for robustness and debugging.

## Installation

```bash
npm install @schema-hub/zod-graphql-query-builder
```

## Usage

### Query Name

**Input:**

```typescript
import { buildGraphqlQuery } from '@schema-hub/zod-graphql-query-builder';
import { z } from 'zod';

const mySchema = z.object({ foo: z.string() }).strict();
const query = buildGraphqlQuery(mySchema, { operationName: 'MyQuery' });
```

**Built query:**

```graphql
query MyQuery { foo }
```

### Defining an Alias

**Input:**

```typescript
import { buildGraphqlQuery, graphqlFieldOptions } from '@schema-hub/zod-graphql-query-builder';
import { z } from 'zod';

const mySchema = z.object({ foo: graphqlFieldOptions(z.string(), { aliasFor: 'bar' }) }).strict();
const query = buildGraphqlQuery(mySchema);
```

**Built query:**

```graphql
query { foo: bar }
```

### Defining Field Arguments / Parameters

**Input:**

```typescript
import {
    buildGraphqlQuery,
    enumValue,
    graphqlFieldOptions,
    variablePlaceholder
} from '@schema-hub/zod-graphql-query-builder';
import { z } from 'zod';

const mySchema = z
    .object({
        foo: graphqlFieldOptions(z.string(), {
            parameters: {
                anyParameterAssignedToPlainValue: 'plain-string',
                anyParameterAssignedToEnumValue: enumValue('foo'),
                anyParameterReferencingAVariable: variablePlaceholder('$var')
            }
        })
    })
    .strict();
const query = buildGraphqlQuery(mySchema, { variableDefinitions: { $var: 'String!' } });
```

**Built query:**

```graphql
query ($var: String!) { foo(anyParameterAssignedToEnumValue: foo, anyParameterAssignedToPlainValue: "plain-string", anyParameterReferencingAVariable: $var) }
```

### Defining Fragments

**Input:**

```typescript
import { buildGraphqlQuery } from '@schema-hub/zod-graphql-query-builder';
import { z } from 'zod';

const mySchema = z
    .object({
        foo: z.discriminatedUnion('__typename', [
            z.object({ __typename: 'A', valueA: z.string() }).strict(),
            z.object({ __typename: 'B', valueB: z.number() }).strict()
        ])
    })
    .strict();
const query = buildGraphqlQuery(mySchema);
```

**Built query:**

```graphql
query { foo { ... on A { __typename, valueA }, ... on B { __typename, valueB } } }
```

### Named Fragments / Reusing Schemas

When the same object schema reference is used in more than one place in a single operation, the builder
automatically hoists its body into a named fragment to keep the produced query small. Two ways to opt in
to this behavior — both rely on the builder being able to resolve a GraphQL type name for the schema.

1. Register a `typeName` explicitly via `graphqlFieldOptions`, or
2. Include `__typename: z.literal('TheTypeName')` in the strict-object's shape.

If both are present and disagree the build throws. Schemas without a resolvable type name stay inlined at
every use site exactly as before, so this feature is purely additive.

**Input (explicit `typeName`):**

```typescript
import { buildGraphqlQuery, graphqlFieldOptions } from '@schema-hub/zod-graphql-query-builder';
import { z } from 'zod';

const userSchema = graphqlFieldOptions(
    z.strictObject({ id: z.string(), name: z.string() }),
    { typeName: 'User' }
);
const mySchema = z.strictObject({ me: userSchema, you: userSchema });
const query = buildGraphqlQuery(mySchema);
```

**Built query:**

```graphql
query { me { ...User_1 }, you { ...User_1 } } fragment User_1 on User { id, name }
```

**Input (`typeName` inferred from `__typename` literal):**

```typescript
const userSchema = z.strictObject({
    __typename: z.literal('User'),
    id: z.string()
});
const mySchema = z.strictObject({ me: userSchema, you: userSchema });
const query = buildGraphqlQuery(mySchema);
```

**Built query:**

```graphql
query { me { ...User_1 }, you { ...User_1 } } fragment User_1 on User { __typename, id }
```

Fragment names follow the pattern `<TypeName>_<index>`, where the index is a counter scoped to one
`buildGraphqlQuery` / `buildGraphqlMutation` call. Two distinct schemas registered with the same `typeName`
are disambiguated by the counter (`User_1`, `User_2`).

**Cyclic schemas.** Self-referential schemas — which would otherwise be inexpressible as a finite inline
selection — work as long as a type name is resolvable for them. The cyclic reference is emitted as a
self-recursive fragment:

```typescript
type User = { id: string; friends: User[]; };
const userSchema: z.ZodMiniType<User> = graphqlFieldOptions(
    z.strictObject({
        id: z.string(),
        friends: z.array(z.lazy(() => userSchema))
    }),
    { typeName: 'User' }
);
const query = buildGraphqlQuery(z.strictObject({ me: userSchema }));
```

**Built query:**

```graphql
query { me { ...User_1 } } fragment User_1 on User { friends { ...User_1 }, id }
```

A cyclic schema without a resolvable type name is rejected at build time with an explicit error so the
builder never enters an infinite recursion.

### Working with custom scalars

**Input:**

```typescript
import { buildGraphqlQuery, customScalar } from '@schema-hub/zod-graphql-query-builder';
import { z } from 'zod';

const mySchema = z
    .object({
        foo: customScalar(
            z
                .object({
                    bar: z.record(z.string())
                })
                .strip()
        )
    })
    .strict();
const query = buildGraphqlQuery(mySchema);
```

**Built query:**

```graphql
query { foo }
```

## Mutations

### Basic Mutation

**Input:**

```typescript
import { buildGraphqlMutation } from '@schema-hub/zod-graphql-query-builder';
import { z } from 'zod';

const mySchema = z.object({ foo: z.string() }).strict();
const mutation = buildGraphqlMutation(mySchema);
```

**Built mutation:**

```graphql
mutation { foo }
```

### Mutation with Name

**Input:**

```typescript
import { buildGraphqlMutation } from '@schema-hub/zod-graphql-query-builder';
import { z } from 'zod';

const mySchema = z.object({ foo: z.string() }).strict();
const mutation = buildGraphqlMutation(mySchema, { operationName: 'MyMutation' });
```

**Built mutation:**

```graphql
mutation MyMutation { foo }
```

### Mutation with Variables

**Input:**

```typescript
import {
    buildGraphqlMutation,
    enumValue,
    graphqlFieldOptions,
    variablePlaceholder
} from '@schema-hub/zod-graphql-query-builder';
import { z } from 'zod';

const mySchema = z
    .object({
        foo: graphqlFieldOptions(z.string(), {
            parameters: {
                anyParameterAssignedToPlainValue: 'plain-string',
                anyParameterAssignedToEnumValue: enumValue('foo'),
                anyParameterReferencingAVariable: variablePlaceholder('$var')
            }
        })
    })
    .strict();
const mutation = buildGraphqlMutation(mySchema, { variableDefinitions: { $var: 'String!' } });
```

**Built mutation:**

```graphql
mutation ($var: String!) { foo(anyParameterAssignedToEnumValue: foo, anyParameterAssignedToPlainValue: "plain-string", anyParameterReferencingAVariable: $var) }
```
