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

## Derived index reconciliation

`assessFlowIndexReconciliation({ descriptor, currentFileHashes, previousFileHashes })`
validates an object descriptor and identifies owned paths whose hashes changed.
Evidence maps use SHA-256 hashes, an explicit `null` for a verified absent path,
and no entry for unavailable evidence. A stale descriptor is reported only when
all its owned hashes match the supplied previous source boundary.

This pure helper does not run Git or read, write, archive, or delete files. The
caller must prove the accepted merge and clean source, collect hashes without
following unsafe paths, archive original descriptor bytes, and recheck refs,
source and descriptors before deciding to retire any derived index. A `stale`
result alone is not permission to remove it or relabel historical selections.

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

## Proven CTS deletions (library API)

`createCtsDeletionProof(evidence)` validates explicit CTS D operations without
loading source. Evidence is either the latest task's structured inventory or a
released transport-of-copies snapshot bound to that task by typed origin and
matching non-control inventory. Missing source, metadata 404 and timestamps do
not authorize deletion. The version-one proof records selected scope, declared
operations, snapshot identity and a canonical inventory digest.

Use `createAdtFlowService(dependencies).reconcileDeletions({ root, config,
evidence, dryRun })` to apply the proof using the selected format, existing
workspace lock and repository transaction. The operation makes no SAP calls.
Whole-object ownership comes from indexed descriptors and the format filename
parser. Indexed hashes protect modified files; owned class companions move to
the same deleted boundary. Package deletion removes owned metadata only and
preserves child source. Unindexed generic package metadata requires additional
ownership evidence and is preserved.

The version-one result contains `proof`, `operations`, `planned`, `removed` and
`dryRun`. Each operation reports `removed`, `already_absent`, `unapplied` or
`planned`, with exact paths, indexed already-absent paths and a typed diagnostic.
Components that require ordinary owner-source checkout remain `unapplied`;
a component declaration cannot delete its containing object. Dry run reports
planned paths without removing files or writing object tombstones.

The caller must isolate the workspace at the selected task's intended head and
retain the returned report alongside its source-acquisition diagnostics. A
deletion proof is not proof of complete or exact historical source coverage.
Report persistence and nonblocking reviewer presentation remain consumer
responsibilities. Ordinary checkout and CLI/MCP surfaces are unchanged.

## Documentation

**[adt-cli.netlify.app/sdk/packages/adt-flow](https://adt-cli.netlify.app/sdk/packages/adt-flow)**

---

Part of [**abapify**](https://github.com/abapify/adt-cli) — open, typed tooling for SAP ABAP Development Tools (ADT): CLI, MCP server, and SDK.
