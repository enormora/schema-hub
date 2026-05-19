# zod-graphql-fake-client

A fake GraphQL client for testing purposes, compatible with the [`@schema-hub/zod-graphql-client`](../zod-graphql-client/readme.md).

## Installation

Install `@schema-hub/zod-graphql-fake-client` via npm:

```bash
npm install --dev @schema-hub/zod-graphql-fake-client
```

## Usage

To use the fake GraphQL client in tests, import it and create an instance with custom configurations:

```typescript
import { createFakeGraphqlClient } from '@schema-hub/zod-graphql-fake-client';

const client = createFakeGraphqlClient();
```

It works best with dependency injection, so it's recommended to inject a new client instance for every test case.

### Customizing Operation Results

Specify custom operation results for individual operations by passing an array of `FakeResult` objects to `createFakeGraphqlClient`. Each `FakeResult` can contain either a successful data payload or an error object, allowing simulation of various scenarios in tests.

```typescript
import { createFakeGraphqlClient } from '@schema-hub/zod-graphql-fake-client';

const customResults = [
    { data: { foo: 'bar' } }, // Successful response
    { error: { type: 'network', message: 'Request timed out' } }, // Network error
    {
        error: {
            type: 'server',
            statusCode: 500,
            message: 'Internal server error'
        }
    } // Server error
    // Add more custom results as needed...
];

const client = createFakeGraphqlClient({ results: customResults });
```

The order of the array matters, so the first result will be returned by the first `query()` or `mutate()` call.

### Inspecting Operations

The fake GraphQL client keeps track of every operation sent to it (without actually making any network calls), allowing inspection during tests. Each recorded operation captures the schema, the resolved request payload, the parsed variable values, the operation name, and the per-call options.

```typescript
import { createFakeGraphqlClient } from '@schema-hub/zod-graphql-fake-client';

const client = createFakeGraphqlClient();

// Inspect just the request payload of the first operation
const firstPayload = client.inspectFirstOperationPayload();
console.log(firstPayload);

// Inspect the full recorded operation (payload + values + options + schema)
const firstOperation = client.inspectFirstOperation();
console.log(firstOperation);

// Inspect by index
const secondOperation = client.inspectOperation(1);
console.log(secondOperation);
```

`findOperation`, `findAllOperations`, and `findOperationOrThrow` accept a matcher that can filter recorded operations by `operationName`, `type`, `schema`, or a custom predicate function.
