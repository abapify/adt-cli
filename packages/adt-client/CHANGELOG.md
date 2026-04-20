## 0.3.5 (2026-04-20)

This was a version bump only for @abapify/adt-client to align it with other projects, there were no code changes.

## 0.3.4 (2026-04-20)

### 🩹 Fixes

- **packages:** add repository/homepage/bugs to every published package ([e1853e48](https://github.com/abapify/adt-cli/commit/e1853e48))

### ❤️ Thank You

- Petr Plenkov

## 0.3.3 (2026-04-20)

This was a version bump only for @abapify/adt-client to align it with other projects, there were no code changes.

## 0.3.2 (2026-04-20)

This was a version bump only for @abapify/adt-client to align it with other projects, there were no code changes.

## 0.3.1 (2026-04-20)

This was a version bump only for @abapify/adt-client to align it with other projects, there were no code changes.

## 0.3.0 (2026-04-20)

### 🚀 Features

- **incl:** INCL CLI + MCP — E01 ([ffbe4db0](https://github.com/abapify/adt-cli/commit/ffbe4db0))

### 🩹 Fixes

- **security:** resolve all remaining CodeQL alerts with source-level fixes ([734713bc](https://github.com/abapify/adt-cli/commit/734713bc))
- resolve all pre-existing typecheck + test failures — QC1 ([81152316](https://github.com/abapify/adt-cli/commit/81152316))
- apply CodeRabbit auto-fixes ([5554994b](https://github.com/abapify/adt-cli/commit/5554994b))
- **adt-cli:** harden user command JSON mode and input validation ([f1d980de](https://github.com/abapify/adt-cli/commit/f1d980de))

### ❤️ Thank You

- CodeRabbit
- Devin @devin-ai-integration[bot]
- Petr Plenkov

## 0.2.0 (2026-04-02)

### 🚀 Features

- **adk,adt-cli:** fix ETag invalidation after lock acquisition, improve DEVC subpackage filtering, add --objects to package get ([979aad9](https://github.com/abapify/adt-cli/commit/979aad9))
- **adk,adt-cli:** centralize lock operations in LockService, add force-unlock, remove duplicate lock logic ([66da454](https://github.com/abapify/adt-cli/commit/66da454))
- **adk,adt-cli:** add FUGR name normalization, lock handle persistence, and root URI extraction ([ee2c300](https://github.com/abapify/adt-cli/commit/ee2c300))
- **adk:** add FunctionModule support with POST-then-PUT save flow, fix ETag refresh after metadata PUT ([5db28a6](https://github.com/abapify/adt-cli/commit/5db28a6))
- **ddic:** add abapGit handlers for TABL and TTYP object types ([41b6a4b](https://github.com/abapify/adt-cli/commit/41b6a4b))
- add PROG (Program) and FUGR (Function Group) ABAP object type support ([d3ebf34](https://github.com/abapify/adt-cli/commit/d3ebf34))

### 🩹 Fixes

- address Copilot and Devin review findings ([a6c4707](https://github.com/abapify/adt-cli/commit/a6c4707))
- **adk:** robust upsert fallback for DDIC objects (405/422 handling) ([ac0d580](https://github.com/abapify/adt-cli/commit/ac0d580))

### ❤️ Thank You

- Devin @devin-ai-integration[bot]
- Petr Plenkov
- ThePlenkov @ThePlenkov
