# @abapify/logger

[![npm](https://img.shields.io/npm/v/%40abapify%2Flogger)](https://www.npmjs.com/package/@abapify/logger)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/abapify/adt-cli/blob/main/LICENSE)

Shared logger interface for abapify packages.

## Install

```bash
npm install @abapify/logger
```

## Usage

```ts
import type { Logger } from '@abapify/logger';
import { ConsoleLogger } from '@abapify/logger';

const logger: Logger = new ConsoleLogger();
logger.info('Service started');
```

## Features

- Minimal `Logger` interface shared by abapify packages
- `ConsoleLogger` and `NoOpLogger` implementations

## Documentation

**[adt-cli.netlify.app/sdk/packages/logger](https://adt-cli.netlify.app/sdk/packages/logger)**

---

Part of [**abapify**](https://github.com/abapify/adt-cli) — open, typed tooling for SAP ABAP Development Tools (ADT): CLI, MCP server, and SDK.
