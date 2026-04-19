---
title: '@abapify/speci'
description: Zero-DSL contract specification primitives (REST + generator).
---

# `@abapify/speci`

Arrow-function contract DSL. Declarative `http.get/post/put/delete/patch`
helpers produce plain descriptor objects; `createClient` turns a contract
tree into a typed client using a pluggable `HttpAdapter`. No decorators, no
runtime metaprogramming.

## Install

```bash
bun add @abapify/speci
```

## Public API

```ts
// @abapify/speci/rest
import {
  http, createClient, createFetchAdapter,
  type HttpAdapter, type RestContract,
} from '@abapify/speci/rest';
```

Core types (`Inferrable`, `ContractOperation`, etc.) live in the package
root. Planned submodules: `@abapify/speci/openapi`, `@abapify/speci/cli`.

## Usage

```ts
import { http, createClient, createFetchAdapter } from '@abapify/speci/rest';

const api = {
  users: {
    get: (id: string) => http.get(`/users/${id}`, { responses: { 200: UserSchema } }),
  },
};

const client = createClient(api, {
  baseUrl: 'https://api.example.com',
  adapter: createFetchAdapter(),
});
```

## Dependencies

- Consumed by [`adt-contracts`](./adt-contracts), [`adt-client`](./adt-client).
