---
title: '@abapify/adt-rfc'
description: SOAP-over-HTTP RFC transport (separate from /sap/bc/adt).
---

# `@abapify/adt-rfc`

SOAP/RFC transport for SAP function modules. This package lives **outside**
the `/sap/bc/adt/*` URL space — SOAP RFC is a separate transport (see epic
E13). Used by CLI commands that need to call classic RFC-enabled FMs.

## Install

```bash
bun add @abapify/adt-rfc
```

## Public API

```ts
export { createRfcClient } from '@abapify/adt-rfc';
export type {
  RfcClient, RfcClientConfig, RawFetcher,
} from '@abapify/adt-rfc';

export {
  buildRfcSoapEnvelope, parseRfcSoapResponse,
  RFC_SOAP_NS, SOAP_ENV_NS,
} from '@abapify/adt-rfc';
```

## Dependencies

- Consumed by [`adt-cli`](./adt-cli) for RFC-based commands.
