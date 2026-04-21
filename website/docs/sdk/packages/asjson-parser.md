---
title: '@abapify/asjson-parser'
description: ABAP Simple-JSON (`ASJSON`) parser.
---

# `@abapify/asjson-parser`

Parser for ABAP Simple-JSON (`ASJSON`) — the JSON dialect used by SAP for
RFC-style payloads. Used internally by [`adt-rfc`](./adt-rfc) and test
harnesses.

## Install

```bash
bun add @abapify/asjson-parser
```

## Public API

```ts
export * from '@abapify/asjson-parser'; // re-exports from lib/asjson
```

## Dependencies

- Consumed by [`adt-rfc`](./adt-rfc) and tests.
