## 1. Typed CTS projection

- [x] 1.1 Preserve parent, type, description, and last-change metadata in the client transport model.
- [x] 1.2 Add a shared CTS metadata service with no XML or rendering logic.

## 2. Delivery parity

- [x] 2.1 Add the stdout-clean CLI JSON command and a focused command test.
- [x] 2.2 Add the matching MCP tool and CLI/MCP parity test.

## 3. Verification

- [x] 3.1 Run focused package tests and strict OpenSpec validation.
      adt-mcp test suite (208 tests incl. revived security files) green on main;
      `openspec validate --strict` passes. The adt-mcp `typecheck` Nx target is
      intentionally disabled (MCP SDK + Zod type inference OOM — see
      `packages/adt-mcp/AGENTS.md`), so no typecheck result is recorded.
- [ ] 3.2 Prove the command against a disposable SAP transport before consumer promotion.
      Deferred: requires a live SAP system; tracked outside this change.
