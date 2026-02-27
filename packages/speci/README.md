# Speci

**Minimal arrow-function-based contract specification system for TypeScript**

Zero decorators. Zero DSL. Zero dependencies. Just TypeScript arrow functions.

Part of the **ADT Toolkit** foundation - see [main README](../../README.md) for architecture overview.

## Philosophy

An endpoint = an arrow function whose parameters define the contract and whose return value defines the operation.

```typescript
import { http } from 'speci/rest';

// Shortcut syntax - super clean!
const updateUser = (id: string, user: UserInput) =>
  http.put<User>(`/users/${id}`, user);
```

This is extremely expressive while staying minimal and TypeScript-native. Choose between shortcut syntax for simplicity or full syntax for control.

## Developed with ts-xsd

Speci was developed in tight combination with [ts-xsd](../ts-xsd) to support **XML-based contracts**. While most REST libraries assume JSON, Speci's `Serializable<T>` interface enables seamless integration with XML schemas:

```typescript
import { parse, build, type XsdSchema, type InferXsd } from 'ts-xsd';
import { http } from 'speci/rest';

// ts-xsd schema with parse/build
const TransportSchema = {
  /* ... */
} as const satisfies XsdSchema;
type Transport = InferXsd<typeof TransportSchema>;

const transportApi = {
  // Speci infers types from ts-xsd's Serializable interface
  create: (transport: Transport) =>
    http.post<Transport>('/transports', transport),
};
```

This makes Speci ideal for enterprise APIs that use XML (SAP ADT, SOAP services, etc.) while remaining fully compatible with JSON-based schemas like Zod.

## Modular Architecture

Speci is organized into protocol-specific modules:

- **`speci`** - Core types and utilities (protocol-agnostic)
- **`speci/rest`** - REST API (helpers, types, client generation)
- **`speci/openapi`** - OpenAPI generation (planned)
- **`speci/cli`** - CLI generation (planned)
- **`speci/graphql`** - GraphQL (planned)
- **`speci/grpc`** - gRPC (planned)

Each protocol module is self-contained with its own types, helpers, and client generation.

## Installation

```bash
npm install speci
# or
bun add speci
```

## Quick Start

### 1. Define Your Contract

```typescript
import { http, type RestContract } from 'speci/rest';

// Define schemas (use any schema library: Zod, JSON Schema, etc.)
interface User {
  id: string;
  name: string;
  email: string;
}

interface CreateUserInput {
  name: string;
  email: string;
}

interface ErrorResponse {
  error: string;
  message: string;
}

// Define your API contract - choose your style!
export const api = {
  users: {
    // Shortcut syntax - just specify the success type
    list: () => http.get<User[]>('/users'),

    // Full syntax - explicit control over all responses
    get: (id: string) =>
      http.get(`/users/${id}`, {
        responses: {
          200: undefined as unknown as User,
          404: undefined as unknown as ErrorResponse,
        },
      }),

    // Shortcut - pass body directly
    create: (user: CreateUserInput) => http.post<User>('/users', user),

    // Full syntax with body and responses
    update: (id: string, user: Partial<User>) =>
      http.put(`/users/${id}`, {
        body: user,
        responses: {
          200: undefined as unknown as User,
          404: undefined as unknown as ErrorResponse,
        },
      }),

    // Shortcut - defaults to 204 response
    delete: (id: string) => http.delete(`/users/${id}`),
  },
} satisfies RestContract;
```

### 2. Generate a Typed Client

```typescript
import { createClient, createFetchAdapter, HttpError } from 'speci/rest';

const client = createClient(api, {
  baseUrl: 'https://api.example.com',
  adapter: createFetchAdapter(),
});

// Use it with full type safety - returns only success types
const users = await client.users.list(); // Type: User[]
const user = await client.users.get('123'); // Type: User

// Errors are thrown as HttpError with typed payloads
try {
  const user = await client.users.get('999');
} catch (error) {
  if (client.users.get.isError(error)) {
    // error.payload is typed as ErrorResponse!
    console.error(error.status, error.payload.error);
  }
}
```

## Core Concepts

### Endpoint Descriptors

Every endpoint is defined by an arrow function that returns a descriptor:

```typescript
const endpoint = (...params) => ({
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS',
  path: '/path/with/${params}',
  body: any, // Request body schema
  query: any, // Query parameters schema
  headers: any, // Headers schema
  responses: {
    // Response schemas by status code
    200: SuccessSchema,
    400: ErrorSchema,
  },
  metadata: {
    // Optional metadata
    description: 'Endpoint description',
    tags: ['user', 'admin'],
    deprecated: false,
  },
});
```

### HTTP Helper Object

The `speci/rest` module provides an `http` object with all HTTP methods:

```typescript
import { http } from 'speci/rest';

// Shortcut syntax - super clean!
http.get<SuccessType>(path); // GET with 200 response
http.post<SuccessType>(path, body); // POST with 201 response
http.put<SuccessType>(path, body); // PUT with 200 response
http.patch<SuccessType>(path, body); // PATCH with 200 response
http.delete(path); // DELETE with 204 response

// Full syntax - explicit control
http.get(path, { responses: { 200: Type, 404: Error } });
http.post(path, { body, responses: { 201: Type, 400: Error } });

// Examples
const getUser = (id: string) => http.get<User>(`/users/${id}`);
const createUser = (user: CreateUserInput) => http.post<User>('/users', user);
```

**Why `http` object?** The `delete` keyword is reserved in JavaScript, so we use `http.delete` instead of a standalone `delete` function.

### Schema Support

Speci supports **any schema library** - Zod, JSON Schema, custom schemas, etc. Use the `schema()` helper for clean syntax:

```typescript
import { z } from 'zod';
import { schema } from 'speci/rest';

// Zod schemas
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

type User = z.infer<typeof UserSchema>;

const api = {
  getUser: (id: string) =>
    http.get(`/users/${id}`, {
      responses: { 200: schema(UserSchema, {} as User) }, // ✅ Schema + type
    }),
};

// Custom schemas (e.g., XML schemas for ADT)
const ClassSchema = {
  element: 'class',
  attributes: ['name', 'type'],
  // ... your schema definition
};

interface ClassXml {
  name: string;
  type: string;
  // ... type definition
}

const adtApi = {
  getClass: (name: string) =>
    http.get(`/classes/${name}`, {
      responses: { 200: schema(ClassSchema, {} as ClassXml) }, // ✅ Schema + type
    }),
};
```

**How it works:**

- `schema(schemaObject, {} as Type)` provides both runtime schema and compile-time type
- Your **adapter** sees the schema object and uses it to parse/validate
- TypeScript sees the type for full type safety
- Type-only assertions still work: `undefined as unknown as Type`

This makes Speci **schema-agnostic** - use whatever validation library you prefer!

### Global Error Responses

Avoid repeating error types across all endpoints:

```typescript
import { createHttp } from 'speci/rest';

// 1. Define global error responses
const globalErrors = {
  400: undefined as unknown as ApiError,
  401: undefined as unknown as ApiError,
  403: undefined as unknown as ApiError,
  404: undefined as unknown as ApiError,
  500: undefined as unknown as ApiError,
} as const;

// 2. Create http instance with global errors
const api = createHttp(globalErrors);

// 3. Now only specify success responses!
const userApi = {
  list: () => api.get<User[]>('/users'),
  // 400, 401, 403, 404, 500 automatically added!

  get: (id: string) => api.get<User>(`/users/${id}`),
  // Global errors merged automatically

  create: (user: CreateUserInput) => api.post<User>('/users', user),
  // All endpoints get global errors
};
```

### Path Parameters

Path parameters are automatically extracted from template literals:

```typescript
const getPost = (userId: string, postId: string) =>
  http.get<Post>(`/users/${userId}/posts/${postId}`);

// Speci automatically maps:
// - First param (userId) → ${userId} in path
// - Second param (postId) → ${postId} in path
```

### Error Handling

Errors are thrown as `HttpError` with typed payloads:

```typescript
import { HttpError } from 'speci/rest';

try {
  const user = await client.users.get('123');
  // user is typed as User (not User | ErrorResponse)
} catch (error) {
  // Option 1: Use endpoint-specific type guard
  if (client.users.get.isError(error)) {
    // error.payload is typed as ErrorResponse
    console.error(`HTTP ${error.status}:`, error.payload.error);
  }

  // Option 2: Generic HttpError check
  else if (error instanceof HttpError) {
    console.error(`HTTP ${error.status}:`, error.payload);
  }

  // Option 3: Network or other errors
  else {
    console.error('Network error:', error);
  }
}
```

### Custom HTTP Adapters

Speci is adapter-agnostic. Bring your own HTTP client:

```typescript
import type { HttpAdapter } from 'speci/client';

const myAdapter: HttpAdapter = {
  async request({ method, url, body, query, headers }) {
    // Use any HTTP client: axios, got, ky, wretch, etc.
    return await yourHttpClient.request({ method, url, body, query, headers });
  },
};

const client = createClient(api, {
  baseUrl: 'https://api.example.com',
  adapter: myAdapter,
});
```

### Interceptors

Add request/response/error interceptors:

```typescript
const client = createClient(api, {
  baseUrl: 'https://api.example.com',
  adapter: createFetchAdapter(),

  // Add auth token to all requests
  onRequest: async (options) => ({
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${getToken()}`,
    },
  }),

  // Transform responses
  onResponse: async (response) => {
    console.log('Response:', response);
    return response;
  },

  // Handle errors
  onError: async (error) => {
    console.error('Error:', error);
    throw error;
  },
});
```

## What Speci Can Generate

From your arrow-function contracts, Speci can generate:

- ✅ **Typed clients** (implemented)
- 🚧 **Server routing** (planned)
- 🚧 **OpenAPI specs** (planned)
- 🚧 **Mock servers** (planned)
- 🚧 **Test fixtures** (planned)
- 🚧 **CLI tools** (planned)
- 🚧 **GraphQL schemas** (planned)
- 🚧 **gRPC definitions** (planned)

## Why Arrow Functions?

✅ **No TypeScript AST parsing** - TS gives you function types natively  
✅ **No decorators** - They're optional syntactic sugar  
✅ **No template-literal parsing** - Simple variable extraction  
✅ **Perfectly readable** - Looks like ordinary domain code  
✅ **Fully expressible** - All REST/HATEOAS/gRPC concepts can be wrapped  
✅ **Zero framework coupling** - Pure TypeScript

## Coming from ts-rest?

Speci uses the same contract-first philosophy, but with arrow functions:

```typescript
// ts-rest
const contract = c.router({
  getUser: {
    method: 'GET',
    path: '/users/:id',
    responses: { 200: UserSchema },
  },
});

// Speci
const contract = {
  getUser: (id: string) => http.get<User>(`/users/${id}`),
};
```

Same type safety, less boilerplate. Choose ts-rest for maturity, Speci for simplicity and XML support.

## Comparison with ts-rest

[ts-rest](https://ts-rest.com/) is an excellent, mature library for type-safe REST contracts and we recommend it for most use cases. Speci covers specific scenarios where you need: **dynamic routing as functions** (endpoints defined as arrow functions with parameters), **schema flexibility** (any schema library via adapters, not just Zod), and a **flexible plugin system** for custom extensions. If ts-rest's contract-first approach works for you, use it—it's battle-tested and production-ready.

## Comparison with Other Tools

| Feature            | Speci           | ts-rest     | tRPC       | OpenAPI    |
| ------------------ | --------------- | ----------- | ---------- | ---------- |
| **Syntax**         | Arrow functions | Builder API | Procedures | YAML/JSON  |
| **Type Safety**    | ✅ Full         | ✅ Full     | ✅ Full    | ⚠️ Codegen |
| **Dependencies**   | 0               | Few         | Many       | Many       |
| **Learning Curve** | Minimal         | Low         | Medium     | High       |
| **Client**         | ✅ Yes          | ✅ Yes      | ✅ Yes     | ✅ Yes     |
| **Server**         | 🚧 Planned      | ✅ Yes      | ✅ Yes     | ⚠️ Partial |
| **Validation**     | 🚧 Planned      | ✅ Zod      | ✅ Zod     | ⚠️ Varies  |

## Documentation

- [Body Parameter Inference](./docs/body-inference.md) - Automatic body type inference from schemas

## License

MIT

## Contributing

Contributions welcome! This is v0.1 - the minimal viable core. Future versions will add:

- Server adapters (Express, Fastify, Hono, etc.)
- OpenAPI generation
- Mock server generation
- Schema validation (Zod, JSON Schema, etc.)
- And more!
