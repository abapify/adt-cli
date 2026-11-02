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
export type { RfcClient, RfcClientConfig, RawFetcher } from '@abapify/adt-rfc';

export {
  buildRfcSoapEnvelope,
  parseRfcSoapResponse,
  RFC_SOAP_NS,
  SOAP_ENV_NS,
} from '@abapify/adt-rfc';
```

## Dependencies

- Consumed by [`adt-cli`](./adt-cli) for RFC-based commands.

## Usage

```ts
import { createAdtClient } from '@abapify/adt-client';
import { createRfcClient } from '@abapify/adt-rfc';

const adt = createAdtClient({
  baseUrl: 'https://my.sap.example.com',
  username: 'DEVELOPER',
  password: '…',
  client: '100',
});

const rfc = createRfcClient({
  fetch: (url, opts) => adt.fetch(url, opts),
  client: '100',
});

const resp = await rfc.call('STFC_CONNECTION', { REQUTEXT: 'hello' });
console.log(resp.ECHOTEXT); // → "hello"
console.log(resp.RESPTEXT); // → "SAP R/3 Rel. 7.55 Sysid: TRL …"
```

## Parameter types

Parameters and responses are modelled as loose JSON trees:

| RFC type  | TypeScript representation             |
| --------- | ------------------------------------- |
| Scalar    | `string \| number \| boolean \| null` |
| Structure | `{ FIELD1: …, FIELD2: … }`            |
| Table     | `[{ FIELD: … }, { FIELD: … }]`        |

Tables are serialised as SAP's `<TABLE_NAME><item>…</item><item>…</item></TABLE_NAME>` convention on the wire.

## Errors

- **`RfcSoapFault`** — the server returned a `soap:Fault`. Exposes `faultcode`, `faultstring`, and the raw response body.
- **`RfcTransportUnavailable`** — the `/sap/bc/soap/rfc` endpoint returned 401/403/404/501. Some SAP systems disable SOAP-RFC; catch this to downgrade gracefully.

## Limitations

- **SOAP-RFC only.** Native `libsapnwrfc` binding (via `node-rfc`) is deliberately out of scope — track `@abapify/adt-plugin-rfc-native` for that future path.
- **Type encoding.** SAP's SOAP-RFC wrapper does not round-trip every RFC data type perfectly. Binary fields come back as base64-looking strings; dates/times come back as SAP internal strings (`YYYYMMDD`, `HHMMSS`). Callers convert.
- **Authentication.** Reuses the ADT client's session/CSRF/cookie state — no separate auth plumbing.
