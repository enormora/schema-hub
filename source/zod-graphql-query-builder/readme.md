# zod-graphql-query-builder

This library transforms a [`zod`](https://github.com/colinhacks/zod) schema into a GraphQL query.

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
const query = buildGraphqlQuery(mySchema, { queryName: 'MyQuery' });
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
query MyQuery { foo: bar }
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
                plainValue: 'plain-string',
                enumParameter: enumValue('foo'),
                variable: variablePlaceholder('$var')
            }
        })
    })
    .strict();
const query = buildGraphqlQuery(mySchema, { variableDefinitions: { $var: 'String!' } });
```

**Built query:**

```graphql
query ($var: String!) { foo(plainValue: "plain-string", enumParameter: foo, variable: $var) }
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
query { foo: { ... on A { __typename, valueA }, ... on B { __typename, valueB } } }
```
