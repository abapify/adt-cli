# @abapify/adt-lint

[![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-lint)](https://www.npmjs.com/package/@abapify/adt-lint)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/abapify/adt-cli/blob/main/LICENSE)

Shared ABAP lint and source-shaping utilities built on @abaplint/core.

## Install

```bash
npm install @abapify/adt-lint
```

## Usage

```ts
import { lintSource, lintAndFix } from '@abapify/adt-lint';

const diagnostics = lintSource(abapSource);
const { source, remaining } = lintAndFix(abapSource);
```

## Features

- abaplint-based diagnostics for in-memory ABAP sources
- Auto-fix with remaining-issue report
- Source-shaping helpers (public API extraction, method boundaries)

## Documentation

**[adt-cli.netlify.app/sdk/packages/adt-lint](https://adt-cli.netlify.app/sdk/packages/adt-lint)**

---

Part of [**abapify**](https://github.com/abapify/adt-cli) — open, typed tooling for SAP ABAP Development Tools (ADT): CLI, MCP server, and SDK.
