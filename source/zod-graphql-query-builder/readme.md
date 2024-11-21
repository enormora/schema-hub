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
query ($var: String!) { foo(anyParameterAssignedToPlainValue: "plain-string", anyParameterAssignedToEnumValue: foo, anyParameterReferencingAVariable: $var) }
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
mutation ($var: String!) { foo(anyParameterAssignedToPlainValue: "plain-string", anyParameterAssignedToEnumValue: foo, anyParameterReferencingAVariable: $var) }
```
