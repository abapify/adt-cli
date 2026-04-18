# adt-rfc — Agent Guide

## Overview

SOAP-over-HTTP RFC transport for SAP. Lives **outside** `/sap/bc/adt/*` — this is a separate transport layer, not an ADT contract.

## Invariants

1. **Leaf package.** No `@abapify/*` workspace dependencies. Callers inject a fetcher matching `AdtClient.fetch()`. This keeps the dep graph acyclic and makes the package testable in isolation.
2. **No third-party XML parser.** The SOAP envelope parser is hand-rolled (`src/lib/transport/soap-rfc.ts` — tokenize + stack). Do NOT introduce `fast-xml-parser`/`xml2js`. If you need a real XSD-based schema, go through `@abapify/ts-xsd` like the rest of the monorepo.
3. **Transport path.** All calls go to `/sap/bc/soap/rfc?sap-client=<n>` with `Content-Type: text/xml; charset=utf-8`. Do not invent new routes.
4. **No console usage.** Pass a logger via the consuming client if needed.

## Extending

To add a new transport (e.g. native `libsapnwrfc` via `node-rfc`), create a sibling file under `src/lib/transport/` and expose a new `createNativeRfcClient()` factory — keep `createRfcClient` as the SOAP default.

## Testing

```bash
bunx nx test adt-rfc
```

Unit tests cover envelope build, parse, round-trip, and client behaviour with a stub fetcher. For end-to-end parity tests against the mock ADT server + real SAP, see `packages/adt-cli/tests/e2e/` and `packages/adt-cli/tests/real-e2e/`.
