# @abapify/speci

[![npm](https://img.shields.io/npm/v/%40abapify%2Fspeci)](https://www.npmjs.com/package/@abapify/speci)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/abapify/adt-cli/blob/main/LICENSE)

Minimal arrow-function-based contract specification system for TypeScript.

## Install

```bash
npm install @abapify/speci
```

## Usage

```ts
import { http } from '@abapify/speci/rest';

const getUser = (id: string) => http.get<User>(`/users/${id}`);
const updateUser = (id: string, user: UserInput) =>
  http.put<User>(`/users/${id}`, user);
```

## Features

- Arrow-function contract specs with full type inference
- Generate typed clients and servers from one contract
- Schema-agnostic (works with `ts-xsd`, Zod, …)

## Documentation

**[adt-cli.netlify.app/sdk/packages/speci](https://adt-cli.netlify.app/sdk/packages/speci)**

---

Part of [**abapify**](https://github.com/abapify/adt-cli) — open, typed tooling for SAP ABAP Development Tools (ADT): CLI, MCP server, and SDK.
