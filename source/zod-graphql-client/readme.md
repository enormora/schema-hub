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

### Sending a Query

```typescript
import { createGraphqlClient, graphqlFieldOptions, variablePlaceholder } from '@schema-hub/zod-graphql-client';
import { z } from 'zod';

// Define your query schema using Zod
const schema = z
    .object({
        // Provide graphql-specific metadata to your zod schema
        foo: graphqlFieldOptions(z.string(), {
            parameters: {
                bar: variablePlaceholder('$bar')
            }
        })
    })
    .strict();

// Send the query using the client
const client = createGraphqlClient({ endpoint: 'https://example.com/graphql' });
const result = await client.query(schema, {
    operationName: 'YourQueryName', // Optional query name
    variables: {
        bar: {
            type: 'String!',
            value: 'the-actual-value-for-bar'
        }
    }
});

console.log(result);
```

### Sending a Mutation

```typescript
import { createGraphqlClient, graphqlFieldOptions, variablePlaceholder } from '@schema-hub/zod-graphql-client';
import { z } from 'zod';

// Define your mutation schema using Zod
const schema = z
    .object({
        // Provide graphql-specific metadata to your zod schema
        foo: graphqlFieldOptions(z.string(), {
            parameters: {
                bar: variablePlaceholder('$bar')
            }
        })
    })
    .strict();

// Send the mutation using the client
const client = createGraphqlClient({ endpoint: 'https://example.com/graphql' });
const result = await client.mutate(schema, {
    operationName: 'YourMutationName', // Optional mutation name
    variables: {
        bar: {
            type: 'String!',
            value: 'the-actual-value-for-bar'
        }
    }
});

console.log(result);
```

### Options for Queries and Mutations

- `operationName` (optional): The name of the query or mutation. This is useful for debugging and introspection purposes.
- `variables` (optional): A record of all variable values and types that should be included in the query or mutation. This allows you to parameterize your operations and provide dynamic values at runtime.
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

### Re-exported Functions

Some functions from `@schema-hub/zod-graphql-query-builder` are re-exported for convenience:

- `graphqlFieldOptions()`
- `enumValue()`
- `variablePlaceholder()`

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
