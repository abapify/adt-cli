---
title: Contracts Pipeline
sidebar_position: 2
---

# Contracts Pipeline

Every call from `adt-cli` (or the MCP server, or an ADK save) into SAP goes
through a single schema-driven pipeline. This page traces one request from
the original XSD down to the typed call site and shows the checklist for
adding a new endpoint.

## The five stages

```
XSD file               ─► Stage 1
  │  ts-xsd parse
  ▼
Schema literal + interface  ─► Stage 2
  │  typed()  / as const
  ▼
adt-schemas export     ─► Stage 3
  │  toSpeciSchema()
  ▼
adt-contracts descriptor (contract + http.get/post/…)  ─► Stage 4
  │  RestContract tree
  ▼
client.adt.<area>.<endpoint>(…)  ─► Stage 5 (call site)
```

### Stage 1 — XSD

Sources:

- **`.xsd/sap/*.xsd`** — downloaded verbatim via
  `nx run adt-schemas:download`. **Never edit.**
- **`.xsd/custom/*.xsd`** — hand-authored extensions (same
  `targetNamespace` as the SAP counterpart, `xs:include` them to add
  missing types).

Rules:

- Must be valid W3C XSD (`xmllint` clean).
- `xs:include` for same-namespace composition, `xs:import` for a
  different namespace.
- See the [ts-xsd `AGENTS.md`](https://github.com/abapify/adt-cli/blob/main/packages/ts-xsd/AGENTS.md)
  for the "Pure W3C — no inventions" rule.

### Stage 2 — ts-xsd

`ts-xsd` is the generic W3C parser/builder. Two outputs matter for the
pipeline:

| Output             | Example                          | Used by                       |
| ------------------ | -------------------------------- | ----------------------------- |
| **Schema literal** | `const classes = { … } as const` | Runtime parse/build           |
| **TS interface**   | `interface AbapClass { … }`      | Compile-time inference target |

`ts-xsd` adds three extension properties (`$`-prefixed) that are
critical for cross-schema resolution:

- `$xmlns` — prefix → namespace URI map.
- `$imports` — resolved imported schemas for `base: "adtcore:AdtObject"`-style lookups.
- `$filename` — original XSD filename (lets `build` emit correct `schemaLocation`).

### Stage 3 — adt-schemas

[`@abapify/adt-schemas`](../sdk/packages/adt-schemas) re-exports every
generated schema wrapped in `typed<Interface>(literal)`. Additionally,
each schema is adapted for `speci` consumption (the REST contract
library) with a thin `toSpeciSchema()` bridge — this is what lets a
contract declare `responses: { 200: classesSchema }` and get full
inference.

Consumers **must** import from `adt-contracts/schemas` (which applies
the bridge) or use the already-bridged export — never directly from
`@abapify/adt-schemas` inside a contract.

### Stage 4 — adt-contracts

A contract is a thin, declarative description of an HTTP endpoint
organised under nested namespaces. The public export is a tree of
contracts that mirrors `client.adt.*`:

```ts
// packages/adt-contracts/src/adt/oo/classes/classes.ts
import { classesSchema } from '../../../schemas';
import { contract, http } from 'speci';

export const classes = contract({
  get: (name: string) =>
    http.get(`/sap/bc/adt/oo/classes/${name}`, {
      headers: { Accept: 'application/vnd.sap.adt.oo.classes.v5+xml' },
      responses: { 200: classesSchema },
    }),
  putSource: (name: string, lockHandle: string) =>
    http.put(`/sap/bc/adt/oo/classes/${name}/source/main`, {
      query: { lockHandle },
      headers: { 'Content-Type': 'text/plain' },
      responses: { 200: undefined as unknown as string },
    }),
});
```

Rules (see the [`adt-client` `AGENTS.md`](https://github.com/abapify/adt-cli/blob/main/packages/adt-client/AGENTS.md)):

- **Every endpoint must declare `responses`.** Missing → return type is `unknown`.
- **XML schemas must use `createSchema()`** (or the `schemas` barrel)
  so the `_infer` marker is present.
- **Do not duplicate** in a `metadata.responseSchema` field — the
  adapter auto-detects schemas from `responses[200]`.

### Stage 5 — adt-client call site

`adt-client`'s adapter:

1. Builds the request (headers, body, query) from the contract.
2. Ensures a security session + CSRF token (the SAP 3-step flow — see
   [`adt-client` AGENTS](https://github.com/abapify/adt-cli/blob/main/packages/adt-client/AGENTS.md#sap-security-session-protocol-critical)).
3. Sends via `fetch`.
4. Parses response based on `Content-Type` — JSON via `JSON.parse`, XML
   via the schema from `responses[200]`, text verbatim.

Typical call site:

```ts
const adt = getAdtClientV2();
const clas = await adt.adt.oo.classes.get('ZCL_MY_CLASS');
//    ^? full type inferred from classesSchema
console.log(clas.packageRef?.name);
```

## Worked example — `POST /oo/classes/ZCL_X/source/main`

The end-to-end "upload source" flow for an ABAP class:

| Stage | File                                                                                   | What you write                               |
| ----- | -------------------------------------------------------------------------------------- | -------------------------------------------- |
| 1     | `packages/adt-schemas/.xsd/sap/classes.xsd`                                            | SAP-provided, downloaded                     |
| 2     | `packages/adt-schemas/src/schemas/generated/schemas/sap/classes.ts` (auto)             | generated literal + interface                |
| 3     | `packages/adt-schemas/src/schemas/generated/index.ts` (auto)                           | `export const classes = typed<AbapClass>(…)` |
| 4     | `packages/adt-contracts/src/adt/oo/classes/classes.ts`                                 | `classes.putSource(name, lockHandle)`        |
| 5     | `client.adt.oo.classes.putSource('ZCL_X', handle)` — from ADK's `savePendingSources()` | ADK call site                                |

## Adding a new endpoint — checklist

1. **XSD.** If SAP ships one, add it under `.xsd/sap/`. Otherwise
   author an extension under `.xsd/custom/` (reuse the SAP
   `targetNamespace`, `xs:include` the SAP schema).
2. **Regenerate.** `bunx nx run adt-schemas:generate`.
3. **Schema wrapper.** Verify a typed export appears in
   `adt-schemas/src/schemas/generated/index.ts` and re-export via
   `packages/adt-contracts/src/schemas.ts`.
4. **Contract.** Add a file under `packages/adt-contracts/src/adt/<area>/`,
   following the pattern above. **Every method must declare `responses`**.
5. **Register.** Wire into `packages/adt-contracts/src/index.ts` (and
   `adt-client`'s tree if it's a new top-level namespace).
6. **Contract scenario test.** Add a `ContractScenario` under
   `packages/adt-contracts/tests/contracts/`. Include a real SAP
   fixture from `@abapify/adt-fixtures` whenever possible.
7. **Type-inference test.** Inside `adt-client` add a
   `tests/<area>-type-inference.test.ts` that references the inferred
   return type — this fails at `tsc` time if inference breaks.
8. **Fixture + mock route.** Drop a sanitised real response into
   `packages/adt-fixtures/src/fixtures/<path>/` and add a route in
   [`mock-server/routes.ts`](./mock-server).
9. **Consumer.** Expose via ADK / CLI command / MCP tool as appropriate.
10. **Verify.**
    ```bash
    bunx nx build adt-schemas adt-contracts adt-client
    bunx nx test adt-contracts
    bunx nx typecheck
    ```

## See also

- [SDK → adt-contracts](../sdk/packages/adt-contracts)
- [SDK → adt-client](../sdk/packages/adt-client)
- [SDK → adt-schemas](../sdk/packages/adt-schemas)
- [SDK → ts-xsd](../sdk/packages/ts-xsd)
- [Architecture → ADK](./adk)
