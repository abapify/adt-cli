# E08 — Checkin (push to SAP) — Lock-Plugin Extension

## Mission

Implement `adt checkin` — the inverse of `checkout` — that takes a local abapGit/gCTS-formatted directory and pushes changes back into a SAP system, batched as a single lock session per object so partial failures roll back cleanly.

## Why

We can `checkout` (read SAP → write to disk) but **cannot push back**. Without checkin, adt-cli is read-only for serialized formats — a major workflow gap (CI/CD pipelines, dev-loop, abapGit-style "pull, edit, push"). The user observation: "checkin/checkout … возможно это часть lock плагина" — yes: batch-locking is the right abstraction. Likely needs to extend `@abapify/adt-locks`.

## Dependencies

- Blocked by: **E05** (FormatPlugin API — checkin must accept any registered format)
- Blocks: nothing

## References

- sapcli: `tmp/sapcli-ref/sapcli/sap/cli/checkin.py`
- Our checkout: `packages/adt-cli/src/lib/commands/checkout.ts` + `packages/adt-cli/src/lib/services/import/`
- abapGit serializer (deserialize side): `packages/adt-plugin-abapgit/src/lib/handlers/`
- Lock service: `packages/adt-locks/src/`
- ADK save flow: `packages/adk/AGENTS.md` (sections 26-65)

## Scope — files

### Add

```
packages/adt-locks/src/batch/batch-lock-session.ts        # acquire/release N locks atomically (or N-of-M with rollback)
packages/adt-locks/src/batch/index.ts
packages/adt-locks/tests/batch-lock-session.test.ts
packages/adt-cli/src/lib/services/checkin/
├── service.ts                                            # CheckinService.checkin({sourceDir, format, package?, transport?})
├── diff.ts                                               # detect what changed locally vs remote
├── plan.ts                                               # build per-object change plan
├── apply.ts                                              # execute plan within batch lock session
└── index.ts
packages/adt-cli/src/lib/commands/checkin.ts              # `adt checkin <directory> [--format ...] [--transport TR]`
packages/adt-cli/tests/services/checkin/{plan,apply}.test.ts
packages/adt-mcp/src/lib/tools/checkin.ts                 # MCP equivalent
packages/adt-cli/tests/e2e/parity.checkin.test.ts
```

### Modify

```
packages/adt-locks/src/index.ts                           # export batch session
packages/adt-cli/src/index.ts                             # export CheckinService
packages/adt-cli/src/lib/cli.ts                           # register checkin
packages/adt-mcp/src/lib/tools/index.ts                   # register checkin tool
packages/adt-mcp/package.json                             # ensure adt-cli dep stays
packages/adt-fixtures/src/mock-server/routes.ts           # add PUT routes for any object types not yet writable in mock
```

## Algorithm sketch

```
1. Discover local files via FormatPlugin.deserialize (E05 dispatches by --format).
2. For each candidate object: GET remote → compute diff → emit ChangePlan entry.
3. Validate: ensure transport TR exists & is open (call client.adt.cts.transportrequests.get).
4. Begin BatchLockSession over all changed objects.
5. For each entry in plan, in dependency order (DDIC → APP types → CDS):
   - Apply via ADK save({mode:'update'}) (which already handles ETag refresh).
6. If any apply fails: rollback (release all locks; if SAP supports it, mark transport entries removed).
7. Release batch session.
```

## Out of scope

- gCTS-mode checkin if gCTS server has its own commit endpoint (that lives in E07's `adt gcts commit`).
- Conflict resolution UI — surface conflicts, leave resolution to user.

## Tests

- Batch lock unit: 8+ (acquire all / release all / partial failure / timeout).
- Plan/diff unit: 6+ (added / modified / deleted / no-change / new include).
- E2E parity: 5+ (single-object checkin, multi-object, with explicit transport, dry-run flag, conflict rollback).

## Acceptance

```bash
bunx nx run-many -t build,test -p adt-locks adt-cli adt-mcp adt-fixtures
bunx nx typecheck && bunx nx lint && bunx nx format:write
```

- `adt checkout <pkg> ./tmp && adt checkin ./tmp --transport DEVK900001` against the mock results in PUTs to every modified object's source endpoint.

## Devin prompt

```
Spec: /mnt/wsl/workspace/ubuntu/adt-cli/docs/roadmap/epics/e08-checkin.md
Read AGENTS.md, docs/roadmap/README.md, e05-format-plugin-api.md, packages/adk/AGENTS.md.
Reference: /tmp/sapcli-ref/sapcli/sap/cli/checkin.py.
Do NOT commit without approval.
```

## Open questions

- SAP doesn't expose an atomic "transactional" object save. True rollback is a best-effort: release locks + log "manual cleanup needed" for partially-applied PUTs. Acceptable?
- Should `checkin` honor `.gitignore`-style excludes in the source directory?

## Follow-ups discovered during implementation (v0.1)

- **`CheckinService.diff` is coarse-grained.** `diffObject()` currently treats "remote exists + local had pending sources" as `update`, and "remote 404" as `create`. No per-field comparison (SAP returns ETags which ADK's save() uses to short-circuit identical content on the server side — so `unchanged` via ETag still works, just post-PUT rather than in the plan). Revisit when `FormatPlugin.diff()` lands (see E05 follow-ups) to compute true file-level diffs up-front.

- **Batch pre-flight lock then release.** `apply.ts` acquires all tier locks in a `BatchLockSession` purely to surface conflicts early, then releases and lets ADK's per-object `save({mode:'upsert'})` re-lock. This double-lock is cheap because the security session's CSRF token survives both cycles, but it means BatchLockSession is really a **validation primitive**, not an execution one. When ADK exposes a way to thread pre-acquired lock handles into `save()`, we can collapse the two cycles into one.

- **gCTS format plugin currently rejects checkin.** `@abapify/adt-plugin-gcts` does not yet implement `format.export` (Git → SAP). `CheckinService` correctly surfaces this as a plugin-capability error on both CLI and MCP — proving the dispatch is format-agnostic — but a real gCTS checkin needs that plugin method (see E06 v0.1 follow-ups: "Git → SAP direction […] deferred alongside E08 checkin"). Adding it lights up gCTS checkin with zero further changes to `CheckinService`.

- **E2E parity coverage is shallow for apply paths.** The mock server in `@abapify/adt-fixtures` doesn't yet model PUT-with-lock-handle + activation for every object type. The parity tests (`parity.checkin.test.ts`) therefore validate discovery + format dispatch + dry-run + MCP tool advertisement; lock/ETag/PUT apply paths are validated through the `tests/services/checkin/apply.test.ts` unit tests with mocked `LockService`. Extending the mock server with object-specific write routes is a separate epic-sized follow-up.

- **Dependency tier list is pragmatic, not exhaustive.** `plan.ts` covers DDIC primitives, packages, app code, and CDS/RAP. Rare types (BAdI impl, XSLT, MSAG, etc.) fall into `other` and are applied last-tier. Extend `TIER_FOR_TYPE` as new object types get ADK/abapGit support.
