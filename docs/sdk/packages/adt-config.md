---
title: '@abapify/adt-config'
description: Configuration loader for adt.config.ts destinations.
---

# `@abapify/adt-config`

Loads `adt.config.ts` (or `.json`) files describing SAP destinations, auth
plugins, and enabled CLI commands. Used by [`adt-cli`](./adt-cli).

## Install

```bash
bun add @abapify/adt-config
```

## Public API

```ts
export type {
  Destination, DestinationInput, AdtConfig,
  AuthPlugin, AuthTestResult,
  ContractsConfig, ContentTypeMapping, EnabledEndpoints,
} from '@abapify/adt-config';
export type { LoadedConfig, LoadConfigOptions } from '@abapify/adt-config';
export { loadConfig, defineConfig } from '@abapify/adt-config';
export { defineAuthPlugin } from '@abapify/adt-config';
```

## Usage

```ts
// adt.config.ts
import { defineConfig } from '@abapify/adt-config';

export default defineConfig({
  destinations: {
    BHF: { type: 'puppeteer', options: { url: 'https://sap.example.com', client: '100' } },
  },
  commands: ['@abapify/adt-atc/commands/atc'],
});
```

## Dependencies

- Consumed by [`adt-cli`](./adt-cli), [`adt-playwright`](./adt-playwright),
  [`adt-puppeteer`](./adt-puppeteer).

## See also

- [`adt-auth`](./adt-auth), [`adt-cli`](./adt-cli)
