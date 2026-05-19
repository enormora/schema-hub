# zod-graphql-client

A lightweight and type-safe GraphQL client. It utilizes [`zod`](https://github.com/colinhacks/zod) schemas to define GraphQL queries, providing developers with a single source of truth for their queries and enabling strict runtime validation.

## Key Benefits

- **Type Safety**: Define GraphQL queries using `zod` schemas, ensuring type safety and preventing hard-to-debug errors.
- **Single Source of Truth**: Keep your schema and queries in sync by using `zod` schemas for both runtime validation and query definition.
- **Ease of Use**: Simplify the process of sending GraphQL queries with a clean and intuitive API.
- **Error Handling**: Handle network errors, server errors, and response validation errors gracefully, providing detailed error messages for easy debugging.

## Example

```typescript
import { createGraphqlClient } from '@schema-hub/zod-graphql-client';
import { z } from 'zod';

// Create a GraphQL client
const client = createGraphqlClient({ endpoint: 'https://example.com/graphql' });

// Define a Zod schema for the GraphQL query
const querySchema = z
    .object({
        foo: z.string()
    })
    .strict();

// Send a GraphQL query using the client
const result = await client.query(querySchema);

// Output the result
console.log(result);
```

## Installation

```bash
npm install @schema-hub/zod-graphql-client
```

## Usage

### Creating a Client

```typescript
import { createGraphqlClient } from '@schema-hub/zod-graphql-client';

const client = createGraphqlClient({
    endpoint: 'https://example.com/graphql'
});
```

#### Options

- `endpoint` (required): The full URL of the GraphQL API endpoint. This is where the client will send its GraphQL requests.

You can further customize the client by providing additional options:

- `headers` (optional): A key-value map of additional headers that should be sent with every request. This can be useful for passing authentication tokens or other metadata to the server.
- `timeout` (optional): The request timeout in milliseconds. This determines how long the client will wait for a response before considering the request failed. If not specified, a default timeout of 10 seconds (10,000 milliseconds) will be used.
- `fetch` (optional): Allows you to inject a custom `fetch` function instead of using the global `fetch`. This can be useful in environments where the global `fetch` function is not available, or if you need to customize the behavior of the HTTP requests.
- `persistedQueries` (optional): Enables [Automatic Persisted Queries (APQ)](#automatic-persisted-queries-apq) for every operation. Defaults to `false`.

### Sending a Query

Bare-schema queries with no variables can be sent directly:

```typescript
import { createGraphqlClient } from '@schema-hub/zod-graphql-client';
import { z } from 'zod';

const schema = z.object({ foo: z.string() }).strict();
const client = createGraphqlClient({ endpoint: 'https://example.com/graphql' });
const result = await client.query(schema);

console.log(result);
```

For queries that take variables — or for queries that need a named operation — use `defineVariables` and `defineQuery` to bundle the schema, variable definitions, and operation name into a single typed operation handle. Variable values passed to `client.query` are then type-checked against the variable definitions:

```typescript
import {
    createGraphqlClient,
    defineQuery,
    defineVariables,
    graphqlFieldOptions
} from '@schema-hub/zod-graphql-client';
import { z } from 'zod';

const vars = defineVariables({ bar: z.string() });

const getFoo = defineQuery({
    operationName: 'YourQueryName',
    variables: vars,
    schema: z
        .object({
            foo: graphqlFieldOptions(z.string(), { parameters: { bar: vars.bar } })
        })
        .strict()
});

const client = createGraphqlClient({ endpoint: 'https://example.com/graphql' });
const result = await client.query(getFoo, { bar: 'the-actual-value-for-bar' });

console.log(result);
```

### Sending a Mutation

Mirror the query API with `defineMutation` and `client.mutate`:

```typescript
import {
    createGraphqlClient,
    defineMutation,
    defineVariables,
    graphqlFieldOptions
} from '@schema-hub/zod-graphql-client';
import { z } from 'zod';

const vars = defineVariables({ bar: z.string() });

const sendFoo = defineMutation({
    operationName: 'YourMutationName',
    variables: vars,
    schema: z
        .object({
            foo: graphqlFieldOptions(z.string(), { parameters: { bar: vars.bar } })
        })
        .strict()
});

const client = createGraphqlClient({ endpoint: 'https://example.com/graphql' });
const result = await client.mutate(sendFoo, { bar: 'the-actual-value-for-bar' });

console.log(result);
```

### Defining Variables

`defineVariables` accepts a map of variable names to either:

1. A Zod schema for a primitive, in which case the GraphQL type is **inferred** from the schema; or
2. A `variable(type, schema)` entry that declares the GraphQL type explicitly (use this for input objects, enums, custom scalars, and any non-primitive types).

Both forms produce typed placeholders that you reference from `graphqlFieldOptions.parameters`, and a `parse` step that **runtime-validates** the values you pass to `client.query`/`client.mutate` against the Zod schemas before sending the request.

Primitive inference rules:

| Zod schema                     | Inferred GraphQL type   |
| ------------------------------ | ----------------------- |
| `z.string()`                   | `String!`               |
| `z.number()`                   | `Float!`                |
| `z.int()` / `z.number().int()` | `Int!`                  |
| `z.boolean()`                  | `Boolean!`              |
| `z.array(inner)`               | `[<inner>]!`            |
| `.nullable()` / `.nullish()`   | strips the trailing `!` |

Anything outside this set (enums, objects, literals, unions, custom scalars, `ID`, …) cannot be inferred and must use the explicit form:

```typescript
import { defineVariables, variable } from '@schema-hub/zod-graphql-client';
import { z } from 'zod';

const vars = defineVariables({
    bar: z.string(), // inferred: String!
    count: z.int().nullable(), // inferred: Int
    filter: variable('FilterInput!', z.object({ query: z.string() })) // explicit type
});
```

### Operation Handles

`defineQuery` and `defineMutation` return an opaque `OperationHandle` that bundles the schema, variable map (if any), and operation name into a single artifact. `client.query` and `client.mutate` are overloaded so that:

- `client.query(schema)` / `client.query(handle)` — no values, used for variable-free operations.
- `client.query(handle, values)` — pass values for a handle that declares variables. `values` is statically type-checked against the variable map.

`operationName` lives on the handle, not on call-time options. To send the same schema under two different operation names, define two handles.

### Options for Queries and Mutations

- `headers` (optional): A key-value map of additional headers that should be sent with the request. These headers will be merged with any headers specified when creating the client.
- `timeout` (optional): The request timeout in milliseconds. This determines how long the client will wait for a response before considering the request failed. If not specified, the default timeout specified when creating the client will be used.

### Operation Result

When you send a query or mutation using the `query()` or `mutate()` method of the GraphQL client, you receive an `OperationResult` object representing the outcome of the operation. This object contains information about whether the operation was successful and, if so, the data returned by the GraphQL server.

The `OperationResult` object has the following structure:

```typescript
type FailureOperationResult = {
    success: false;
    errorDetails: OperationErrorDetails;
};

type SuccessOperationResult<Schema extends OperationSchema> = {
    success: true;
    data: z.infer<Schema>;
};

type OperationResult<Schema extends OperationSchema> = FailureOperationResult | SuccessOperationResult<Schema>;
```

- If the operation was successful, the `success` property will be `true`, and the `data` property will contain the response data, inferred based on the provided Zod schema.
- If the operation failed, the `success` property will be `false`, and the `errorDetails` property will contain information about the error encountered during the operation. This includes details such as the error type, status code (if applicable), and error message.

Here's how you can handle the operation result:

```typescript
const result = await client.query(schema, options);

if (result.success) {
    // Operation was successful, handle the response data
    console.log(result.data);
} else {
    // Operation failed, handle the error
    console.error('Operation failed:', result.errorDetails);
}
```

### Error Types

Errors are distinguishable based on the `type` property within the `errorDetails` object. The possible error types are:

- **`network`**: Occurs when there are issues with the network connection, such as timeouts or unexpected network problems.
- **`server`**: Indicates an error response from the server, typically due to unexpected status codes like `500`.
- **`graphql`**: Indicates errors in the GraphQL response, such as invalid query syntax or execution errors on the server.
- **`validation`**: Occurs when the data in the operation response does not match the given `zod` schema, indicating a validation failure.
- **`unknown`**: Represents any other unexpected errors that do not fall into the above categories.

### `queryOrThrow()` and `mutateOrThrow()`

The `queryOrThrow()` and `mutateOrThrow()` functions behaves similarly to `query()` and `mutate()`, but with one key difference in its return type. If the operation execution is successful, the function returns the operation result data directly. However, if an error occurs during the operation execution, it throws an instance of `GraphqlOperationError`. This custom error contains detailed information about the encountered error in its `details` property, which aligns with the `errorDetails` structure returned by the `operation()` function.

### Automatic Persisted Queries (APQ)

When `persistedQueries` is enabled on the client, every operation is first sent as the SHA-256 hash of the serialized query (no `query` body), following Apollo’s [Automatic Persisted Queries](https://www.apollographql.com/docs/apollo-server/performance/apq/) protocol:

```typescript
const client = createGraphqlClient({
    endpoint: 'https://example.com/graphql',
    persistedQueries: true
});
```

The request payload sent to the server uses the standard APQ extension format:

```json
{
    "operationName": "YourQueryName",
    "variables": {},
    "extensions": {
        "persistedQuery": {
            "version": 1,
            "sha256Hash": "<sha256 of the serialized query>"
        }
    }
}
```

The client automatically handles the two well-known APQ error responses:

- **`PersistedQueryNotFound`**: The server doesn’t yet know this query. The client retries the same operation, this time including both the `query` text and the `extensions.persistedQuery` envelope, so the server can register the query under its hash for future requests.
- **`PersistedQueryNotSupported`**: The server does not support APQ at all. The client retries the operation as a plain GraphQL request (no `extensions` field). Subsequent operations still attempt APQ — the client does not remember that the server doesn’t support it.

Detection of these error responses is resilient: the client matches both on `errors[].message` (`PersistedQueryNotFound` / `PersistedQueryNotSupported`) and on `errors[].extensions.code` (`PERSISTED_QUERY_NOT_FOUND` / `PERSISTED_QUERY_NOT_SUPPORTED`).

### Re-exported Functions

Some functions from `@schema-hub/zod-graphql-query-builder` are re-exported for convenience:

- `graphqlFieldOptions()`
- `enumValue()`
- `customScalar()`

For more details, see the [`@schema-hub/zod-graphql-query-builder` documentation](../zod-graphql-query-builder/readme.md).

### Testing

If you're writing tests for your code, consider using the `@schema-hub/zod-graphql-fake-client` package for testing. It provides a fake GraphQL client that can be used in place of the real client. This allows control over the client behavior and inspection of the queries and mutations sent without making actual network requests.

Here's a quick example of how to use it:

```typescript
import { createFakeGraphqlClient } from '@schema-hub/zod-graphql-fake-client';

// Create a fake GraphQL client for testing
const client = createFakeGraphqlClient();
```

Replace the real client with the fake client in the test environment to isolate tests and ensure predictable behavior.
