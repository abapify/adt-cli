# @abapify/adt-flow

[![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-flow)](https://www.npmjs.com/package/@abapify/adt-flow)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/abapify/adt-cli/blob/main/LICENSE)

Incremental transport source-tree materialization for ADT.

## Install

```bash
npm install @abapify/adt-flow @abapify/adt-cli
```

## Usage

Register the command plugin and configure the flow format in your project config:

```ts
// adt.config.ts
export default {
  commands: ['@abapify/adt-flow/commands/flow'],
  flow: {
    format: {
      id: 'abapgit',
    },
  },
};
```

## Features

- Incremental materialization of transport contents into a source tree
- Concurrency-controlled metadata and source fetching
- Pluggable output format (abapGit, gCTS)

## Import diagnostics

Optional diagnostic-report storage failures preserve acquired sources and report
unknown completeness. See the SDK reference for strict checkout and partial-report
boundaries.

Library consumers can use `createFlowCheckoutReport(result)` for the same
version-one JSON contract as `--report`, or `createFlowPartialReport(result)`
for `--partial-report`. Both are pure builders with deterministic omission order.
They do not write files or assess overall completeness: absent inventory remains
unavailable, and an empty skipped list alone is not evidence of a full snapshot.

## Documentation

**[adt-cli.netlify.app/sdk/packages/adt-flow](https://adt-cli.netlify.app/sdk/packages/adt-flow)**

---

Part of [**abapify**](https://github.com/abapify/adt-cli) — open, typed tooling for SAP ABAP Development Tools (ADT): CLI, MCP server, and SDK.
