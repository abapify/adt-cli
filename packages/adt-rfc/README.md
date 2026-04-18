# @abapify/adt-rfc

SOAP-over-HTTP RFC transport for SAP systems. Calls classic RFC function modules (BAPIs, STFC_CONNECTION, TH_USER_LIST, custom FMs, etc.) without requiring the native `libsapnwrfc` SDK — by tunnelling the call through SAP's built-in `/sap/bc/soap/rfc` endpoint.

> This package lives **outside** the `/sap/bc/adt/*` URL space. RFC is a separate transport layer from ADT — that's why it's a separate package, not a schema/contract under `@abapify/adt-client`.

## Install

```bash
bun add @abapify/adt-rfc
```

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

## See also

- Spec: `docs/roadmap/epics/e13-startrfc.md`
- Reference implementation: `tmp/sapcli-ref/sapcli/sap/rfc/`
