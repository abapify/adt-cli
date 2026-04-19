---
title: Guides overview
sidebar_position: 0
description: Task-oriented how-to guides chaining multiple adt-cli commands into end-to-end workflows.
---

# Guides

These are task-oriented walkthroughs — "how to accomplish X" — that chain
several `adt` commands together. For per-command flag reference see the
[CLI reference](/cli/overview). For MCP tool reference see
[MCP tools](/mcp/overview).

## Transport & change management

- [**CTS workflow**](./cts-workflow) — create a transport, assign objects, release, and hand over to deployment.

## Object lifecycle

- [**Object lifecycle (CLAS / INTF / PROG)**](./object-lifecycle) — CRUD for classic ABAP sources: create → write → activate → deploy → handle lock conflicts.
- [**DDIC modeling**](./ddic-modeling) — model a `Customer` entity: domain → data element → table → structure.
- [**CDS authoring**](./cds-authoring) — DDL views with `adt ddl`, access controls with `adt dcl`.
- [**RAP development**](./rap-development) — the BDEF + SRVD + SRVB triplet on top of a CDS root view.

## Testing & quality

- [**AUnit with coverage**](./aunit-with-coverage) — run tests, emit JaCoCo / Sonar-generic for SonarQube, hook into CI.

## Git-based transport

- [**abapGit checkout/checkin roundtrip**](./abapgit-checkout-checkin) — SAP ↔ disk roundtrip with the abapGit format.
- [**gCTS workflow**](./gcts-workflow) — clone / pull / commit / push with git-enabled CTS.
- [**Format comparison**](./format-comparison) — abapGit vs gCTS/AFF: extensions, metadata, layout.

## Navigation

- [**Workbench navigation**](./workbench-navigation) — where-used, callers, callees, definition, outline.

## Automation

- [**CI pipeline integration**](./ci-pipeline) — run `adt` in GitHub Actions / GitLab CI with cached auth, coverage upload, and PR gating.
- [**RFC automation**](./rfc-automation) — when to use `adt rfc` vs ADT and what needs to be enabled server-side.

## Development support

- [**Mock server for local dev & CI**](./mock-server) — use `@abapify/adt-fixtures` to run tests without a live SAP system.
