---
title: '@abapify/logger'
description: Minimal Logger interface and NoOp/Console implementations.
---

# `@abapify/logger`

Zero-dep Logger interface compatible with pino/winston/bunyan, plus a
`NoOpLogger` and `ConsoleLogger`. Every core package accepts a `Logger` to
avoid hard dependencies on a logging framework.

## Install

```bash
bun add @abapify/logger
```

## Public API

```ts
export type { Logger } from '@abapify/logger';
export { NoOpLogger, ConsoleLogger } from '@abapify/logger';
```

## Usage

```ts
import { ConsoleLogger } from '@abapify/logger';
import { createAdtClient } from '@abapify/adt-client';

const client = createAdtClient({ /* ... */, logger: new ConsoleLogger() });
```

## Dependencies

- No workspace deps. Used by most `@abapify/*` packages.
