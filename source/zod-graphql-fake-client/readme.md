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

### Inspecting Operation Payloads

The fake GraphQL client keeps track of all operation payloads sent to the server (without actually sending them), allowing inspection during tests. Retrieve individual operation payloads by index or inspect the first operation payload recorded.

```typescript
import { createFakeGraphqlClient } from '@schema-hub/zod-graphql-fake-client';

const client = createFakeGraphqlClient();

// Inspect the payload of the first operation
const firstPayload = client.inspectFirstOperationPayload();
console.log(firstPayload);

// Inspect the payload of the second operation
const secondPayload = client.inspectOperationPayload(1);
console.log(secondPayload);
```
