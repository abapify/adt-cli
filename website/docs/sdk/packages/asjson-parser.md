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

## Usage

- as a parser

```ts
import { parse } from '@abapify/asjson-parser';
console.log(parse(json));
```

- as a transformer

```ts
import { transform } from '@abapify/asjson-parser';
const object = JSON.parse(json);
console.log(transform(object));
```

- as a proxy (returns a proxied object)

```ts
import { proxy } from '@abapify/asjson-parser';
const object = JSON.parse(json);
console.log(proxy(object));
```
