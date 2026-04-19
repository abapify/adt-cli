---
title: Future Work & Open Questions
sidebar_position: 2
---

# Future Work & Open Questions

Collected from the "Open questions" / "Follow-ups discovered during
implementation" / "Real-SAP verification" sections of the underlying
epics. Grouped by area, not by epic.

## Real-SAP fixture backfill

Several endpoints ship with contracts + synthetic fixtures because the
BTP Trial tenant (TRL) we use for CI-adjacent verification does not
implement the call. They'll be promoted to real captures as soon as we
can run against a suitable system:

- **STRUST** (`/sap/bc/adt/system/security/pses`) — 404 on TRL, sapcli
  drives it via RFC not ADT. Needs on-prem or ABAP Platform.
- **gCTS** (`/sap/bc/cts_abapvcs/*`) — 403 on TRL (Unified
  Connectivity). Needs on-prem or S/4HANA Cloud with gCTS enabled.
- **BAdI / enhancements** (`/sap/bc/adt/enhancements/*`) — 403 on TRL.
- **Workbench callers / callees** (`/informationsystem/callers|callees`,
  `/abapsource/callers|callees`) — 404 on TRL, work on on-prem.
- **`adt wb find-definition`** — `/sap/bc/adt/navigation/target` POST
  body shape is undocumented; all attempted payloads return 400
  "I::000". Stub remains until a real capture surfaces.

See [Architecture → Real-SAP e2e](../architecture/real-e2e) for the
full findings table.

## Format plugins

- **`FormatPlugin.diff()`** was deferred from E05. It will make sense
  once a second format (gCTS) actually needs a pluggable diff — today
  only abapGit has diff logic and it's schema-specific. When we have
  two data points, lift into the interface. Also unlocks per-field
  `CheckinService.diff` (see below).
- **Automatic discovery.** Format plugins self-register via a
  side-effect import. An automatic `discoverFormatPlugins()` that
  scans `node_modules/@abapify/adt-plugin-*` would bring parity with
  CLI-command plugins, but is deferred until a third-party format ships.
- **`SerializedFile` metadata.** Today carries only `path`, `content`,
  `encoding`. Some formats may want pack-hints or charset overrides.
  Revisit when the first format actually needs it.
- **Directory → SAP-package resolution for gCTS.** AFF / gCTS has no
  `.abapgit.xml` analogue for folder logic. Currently we trust
  `options.rootPackage` or leave `packageRef` unset.

## Checkin (E08)

- **Per-field diff.** `CheckinService.diff()` today uses coarse
  signals (remote 404 → create, remote exists + pending sources →
  update). True file-level diffs depend on `FormatPlugin.diff()`
  above.
- **Collapse the double lock cycle.** `apply.ts` acquires all locks
  in a `BatchLockSession` purely for fail-fast validation, releases
  them, and then lets ADK re-lock per object. When ADK exposes a way
  to thread pre-acquired lock handles into `save()`, the two cycles
  can merge.
- **`.gitignore`-style excludes.** Not yet honoured.
- **True rollback.** Impossible without SAP adding a transactional
  save. We can continue to improve failure reporting and per-tier
  grouping.

## Core behaviour

- **Stale CTS locks on BTP Trial.** Deleting a source-bearing object
  leaves a system-level CTS lock for 15–30 minutes, blocking recreate
  under the same name. No public API to clear it. Tests route around
  by using unique names.
- **MCP `create_object` — ADK-backed.** Today the MCP create tool uses
  a narrow subset of object types via raw contracts. A full ADK-backed
  create (so every object type behaves exactly like `adt create …`)
  is a natural next step.

## RFC / startrfc (E13)

- `/sap/bc/soap/rfc` may be disabled on customer systems. Document and
  surface a clear error (current: generic HTTP error).
- Is a NW RFC "native" plugin worth shipping, or is SOAP-over-HTTP
  sufficient? Held until a user actually requests native RFC.

## gCTS (E07)

- **Deferred subcommands.** `gcts activities`, `gcts messages`,
  `gcts tasks`, `gcts user get-credentials / set-credentials /
delete-credentials`, `gcts system config` — not in the 12-subcommand
  v0.1 scope. Add on demand.
- **Async clone polling.** `sapcli`'s `--sync-clone` / `--wait-for-ready`
  / `--poll-period` behaviour is not reproduced. `adt gcts repo clone`
  is a single POST; callers who need polling currently drive it
  themselves.
- **Discovery pattern.** `@abapify/adt-plugin-gcts-cli` is currently a
  required runtime dep, registered statically. To make it optional,
  move to `adt.config.ts`-driven discovery like `adt-codegen` /
  `adt-atc`.

## ACDS / RAP (E09–E12)

- **BDEF grammar.** No official SAP XSD. The `.abdl` body round-trips
  as plain text with the ADT metadata envelope. Deeper parsing would
  require a dedicated BDEF grammar (possible future extension of
  `@abapify/acds`).
- **Semantic validation** (action signatures vs. CDS behaviour
  projection) is out of scope; revisit when full RAP round-trip tests
  are in place.
- **abapGit BDEF XML layout.** Current SKEY/DESCR shape was inferred
  from sibling source-only handlers; if upstream abapGit diverges,
  adjust the XSD + handler together.
- **Tokenizer approach.** `@abapify/acds` is a hand-written
  recursive-descent parser. Staying hand-written is the preferred
  default; revisit Chevrotain/PEG only if grammar coverage stalls.

## Documentation

- Plugin authoring guide (D2c) — separate from the architecture page.
- CLI / MCP cross-reference tables (already scaffolded; extend when
  new commands/tools ship).

## See also

- [Roadmap → What shipped](./overview)
- [Architecture overview](../architecture/overview)
- Raw epic files (internal, maintainers only): [`docs/roadmap/epics/`](https://github.com/abapify/adt-cli/tree/main/docs/roadmap/epics)
