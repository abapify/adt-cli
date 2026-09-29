## 0.4.16 (2026-09-29)

This was a version bump only for @abapify/adt-client to align it with other projects, there were no code changes.

## 0.4.15 (2026-09-29)

This was a version bump only for @abapify/adt-client to align it with other projects, there were no code changes.

## 0.4.14 (2026-09-28)

This was a version bump only for @abapify/adt-client to align it with other projects, there were no code changes.

## 0.4.13 (2026-09-28)

This was a version bump only for @abapify/adt-client to align it with other projects, there were no code changes.

## 0.4.12 (2026-09-28)

This was a version bump only for @abapify/adt-client to align it with other projects, there were no code changes.

## 0.4.11 (2026-09-23)

This was a version bump only for @abapify/adt-client to align it with other projects, there were no code changes.

## 0.4.10 (2026-09-21)

This was a version bump only for @abapify/adt-client to align it with other projects, there were no code changes.

## 0.4.9 (2026-09-20)

This was a version bump only for @abapify/adt-client to align it with other projects, there were no code changes.

## 0.4.8 (2026-09-20)

This was a version bump only for @abapify/adt-client to align it with other projects, there were no code changes.

## 0.5.0 (2026-09-20)

### 🚀 Features

- expose typed CTS transport metadata ([#186](https://github.com/abapify/adt-cli/pull/186))
- **cds:** support CDS and RAP ABAP File Formats ([#183](https://github.com/abapify/adt-cli/pull/183))
- **adt-mcp:** enforce scoped safe execution ([#143](https://github.com/abapify/adt-cli/pull/143))
- **source-history:** add bounded ADT source history support ([04ecb578](https://github.com/abapify/adt-cli/commit/04ecb578))
- **incl:** INCL CLI + MCP — E01 ([8aaeb898](https://github.com/abapify/adt-cli/commit/8aaeb898))
- **adk,adt-cli:** fix ETag invalidation after lock acquisition, improve DEVC subpackage filtering, add --objects to package get ([45fd3873](https://github.com/abapify/adt-cli/commit/45fd3873))
- **adk,adt-cli:** centralize lock operations in LockService, add force-unlock, remove duplicate lock logic ([76f45210](https://github.com/abapify/adt-cli/commit/76f45210))
- **adk,adt-cli:** add FUGR name normalization, lock handle persistence, and root URI extraction ([1e5ad7f5](https://github.com/abapify/adt-cli/commit/1e5ad7f5))
- **adk:** add FunctionModule support with POST-then-PUT save flow, fix ETag refresh after metadata PUT ([18746eb6](https://github.com/abapify/adt-cli/commit/18746eb6))
- **ddic:** add abapGit handlers for TABL and TTYP object types ([49042231](https://github.com/abapify/adt-cli/commit/49042231))
- add PROG (Program) and FUGR (Function Group) ABAP object type support ([789f55b0](https://github.com/abapify/adt-cli/commit/789f55b0))
- add --service-key CLI option, Bearer token support, and CI e2e auth test ([4055c554](https://github.com/abapify/adt-cli/commit/4055c554))
- **release:** setup Nx Release publishing with GitHub CI ([0243482f](https://github.com/abapify/adt-cli/commit/0243482f))
- add XML/XSLT processing and JSON validation dependencies ([c54bb034](https://github.com/abapify/adt-cli/commit/c54bb034))
- **adk:** implement ADK architecture alignment with lazy loading ([6313ce60](https://github.com/abapify/adt-cli/commit/6313ce60))
- Add Basic Authentication support for on-premise SAP systems ([#8](https://github.com/abapify/adt-cli/pull/8))
- Enhance ADT client with object locking and session management features ([0e61924c](https://github.com/abapify/adt-cli/commit/0e61924c))
- Implement deploy and lock/unlock commands for SAP ADT objects ([aaa191ae](https://github.com/abapify/adt-cli/commit/aaa191ae))
- add inheritance support to xmld with metadata merging and build system updates ([6d9b1fdb](https://github.com/abapify/adt-cli/commit/6d9b1fdb))
- Implement decorator-based XML composition system for ADK ([ed834c38](https://github.com/abapify/adt-cli/commit/ed834c38))
- add uv package manager to devcontainer for Python dependencies ([9463e401](https://github.com/abapify/adt-cli/commit/9463e401))

### 🩹 Fixes

- **client:** pair timeout agent with undici fetch ([#178](https://github.com/abapify/adt-cli/pull/178))
- **client:** support long-running SAP requests ([#177](https://github.com/abapify/adt-cli/pull/177))
- **codacy:** resolve open code-scanning alerts ([#167](https://github.com/abapify/adt-cli/pull/167))
- **quality:** resolve open GitHub Code Quality findings ([#159](https://github.com/abapify/adt-cli/pull/159))
- review thread fixes (broker, session, source-history, docs, deps) ([3d20361a](https://github.com/abapify/adt-cli/commit/3d20361a))
- **sonar:** resolve S4144, S6551, S6571, S6582, S6644, S7750, S7755, S7786, S5332 ([35b25a45](https://github.com/abapify/adt-cli/commit/35b25a45))
- **codacy:** use bare nosemgrep suppression for fetch URL ([fd406ad3](https://github.com/abapify/adt-cli/commit/fd406ad3))
- **sast:** add bearer suppression and reduce registry nesting ([b0d7b17a](https://github.com/abapify/adt-cli/commit/b0d7b17a))
- **codacy:** suppress SSRF false positive on validated ADT URL ([842c2341](https://github.com/abapify/adt-cli/commit/842c2341))
- **codacy:** avoid object-injection and user-controlled URL findings ([9c3a249a](https://github.com/abapify/adt-cli/commit/9c3a249a))
- **codacy:** suppress false-positive SSRF and object-injection findings ([05c807bc](https://github.com/abapify/adt-cli/commit/05c807bc))
- **packages:** add repository/homepage/bugs to every published package ([85b29310](https://github.com/abapify/adt-cli/commit/85b29310))
- **security:** resolve all remaining CodeQL alerts with source-level fixes ([678f3991](https://github.com/abapify/adt-cli/commit/678f3991))
- resolve all pre-existing typecheck + test failures — QC1 ([c1970023](https://github.com/abapify/adt-cli/commit/c1970023))
- apply CodeRabbit auto-fixes ([1edf95e1](https://github.com/abapify/adt-cli/commit/1edf95e1))
- **adt-cli:** harden user command JSON mode and input validation ([6ade4f53](https://github.com/abapify/adt-cli/commit/6ade4f53))
- address Copilot and Devin review findings ([c897a350](https://github.com/abapify/adt-cli/commit/c897a350))
- **adk:** robust upsert fallback for DDIC objects (405/422 handling) ([64c52c03](https://github.com/abapify/adt-cli/commit/64c52c03))
- **sonarqube:** fix code quality issues from PR #76 ([#76](https://github.com/abapify/adt-cli/issues/76))
- remove @abapify/adk from adt-client deps (circular dep, re-added by merge commit) ([685654e6](https://github.com/abapify/adt-cli/commit/685654e6))
- remove @abapify/adk from adt-client deps (circular dep, re-added by merge commit) ([4e528ca9](https://github.com/abapify/adt-cli/commit/4e528ca9))
- remove adt-client↔adk circular dep; add nx-ci pre-commit skill ([4a1a80b8](https://github.com/abapify/adt-cli/commit/4a1a80b8))
- add missing ts-morph and adk deps, bump to 0.1.10 ([ed143378](https://github.com/abapify/adt-cli/commit/ed143378))
- add missing zod dependency to adt-schemas and ts-xsd, bump to 0.1.9 ([c85f3a8c](https://github.com/abapify/adt-cli/commit/c85f3a8c))
- address all Qodo review comments from today's PRs (#44-#49) ([#44](https://github.com/abapify/adt-cli/issues/44), [#49](https://github.com/abapify/adt-cli/issues/49))
- resolve typecheck failures across workspace ([e6d46651](https://github.com/abapify/adt-cli/commit/e6d46651))
- **ci:** address Qodo review comments on release workflows ([645ee885](https://github.com/abapify/adt-cli/commit/645ee885))
- **ci:** fix format and lint errors to unblock CI pipeline ([74f4a1d9](https://github.com/abapify/adt-cli/commit/74f4a1d9))

### 🧱 Updated Dependencies

- Updated adt-contracts to 0.5.0
- Updated adt-schemas to 0.5.0
- Updated @abapify/logger to 0.5.0

### ❤️ Thank You

- Claude
- CodeRabbit
- Devin @devin-ai-integration[bot]
- Devin AI @devin-ai-integration[bot]
- Petr Plenkov @ThePlenkov
- ThePlenkov @ThePlenkov

## 0.4.7 (2026-09-18)

This was a version bump only for @abapify/adt-client to align it with other projects, there were no code changes.

## 0.4.6 (2026-09-18)

This was a version bump only for @abapify/adt-client to align it with other projects, there were no code changes.

## 0.4.5 (2026-09-17)

This was a version bump only for @abapify/adt-client to align it with other projects, there were no code changes.

## 0.4.4 (2026-09-17)

This was a version bump only for @abapify/adt-client to align it with other projects, there were no code changes.

## 0.4.3 (2026-09-16)

This was a version bump only for @abapify/adt-client to align it with other projects, there were no code changes.

## 0.4.2 (2026-09-08)

### 🚀 Features

- expose typed CTS transport metadata ([#186](https://github.com/abapify/adt-cli/pull/186))
- **cds:** support CDS and RAP ABAP File Formats ([#183](https://github.com/abapify/adt-cli/pull/183))
- **adt-mcp:** enforce scoped safe execution ([#143](https://github.com/abapify/adt-cli/pull/143))
- **source-history:** add bounded ADT source history support ([04ecb578](https://github.com/abapify/adt-cli/commit/04ecb578))

### 🩹 Fixes

- **client:** pair timeout agent with undici fetch ([#178](https://github.com/abapify/adt-cli/pull/178))
- **client:** support long-running SAP requests ([#177](https://github.com/abapify/adt-cli/pull/177))
- **codacy:** resolve open code-scanning alerts ([#167](https://github.com/abapify/adt-cli/pull/167))
- **quality:** resolve open GitHub Code Quality findings ([#159](https://github.com/abapify/adt-cli/pull/159))
- review thread fixes (broker, session, source-history, docs, deps) ([3d20361a](https://github.com/abapify/adt-cli/commit/3d20361a))
- **sonar:** resolve S4144, S6551, S6571, S6582, S6644, S7750, S7755, S7786, S5332 ([35b25a45](https://github.com/abapify/adt-cli/commit/35b25a45))
- **codacy:** use bare nosemgrep suppression for fetch URL ([fd406ad3](https://github.com/abapify/adt-cli/commit/fd406ad3))
- **sast:** add bearer suppression and reduce registry nesting ([b0d7b17a](https://github.com/abapify/adt-cli/commit/b0d7b17a))
- **codacy:** suppress SSRF false positive on validated ADT URL ([842c2341](https://github.com/abapify/adt-cli/commit/842c2341))
- **codacy:** avoid object-injection and user-controlled URL findings ([9c3a249a](https://github.com/abapify/adt-cli/commit/9c3a249a))
- **codacy:** suppress false-positive SSRF and object-injection findings ([05c807bc](https://github.com/abapify/adt-cli/commit/05c807bc))

### ❤️ Thank You

- Devin @devin-ai-integration[bot]
- Devin AI @devin-ai-integration[bot]
- Petr Plenkov @ThePlenkov

## 0.4.1 (2026-05-29)

This was a version bump only for @abapify/adt-client to align it with other projects, there were no code changes.

## 0.4.0 (2026-05-29)

This was a version bump only for @abapify/adt-client to align it with other projects, there were no code changes.

## 0.3.6 (2026-04-21)

This was a version bump only for @abapify/adt-client to align it with other projects, there were no code changes.

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
