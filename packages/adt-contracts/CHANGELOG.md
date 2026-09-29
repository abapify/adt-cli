## 0.4.16 (2026-09-29)

This was a version bump only for adt-contracts to align it with other projects, there were no code changes.

## 0.4.15 (2026-09-29)

This was a version bump only for adt-contracts to align it with other projects, there were no code changes.

## 0.4.14 (2026-09-28)

This was a version bump only for adt-contracts to align it with other projects, there were no code changes.

## 0.4.13 (2026-09-28)

This was a version bump only for adt-contracts to align it with other projects, there were no code changes.

## 0.4.12 (2026-09-28)

This was a version bump only for adt-contracts to align it with other projects, there were no code changes.

## 0.4.11 (2026-09-23)

This was a version bump only for adt-contracts to align it with other projects, there were no code changes.

## 0.4.10 (2026-09-21)

This was a version bump only for adt-contracts to align it with other projects, there were no code changes.

## 0.4.9 (2026-09-20)

This was a version bump only for adt-contracts to align it with other projects, there were no code changes.

## 0.4.8 (2026-09-20)

This was a version bump only for adt-contracts to align it with other projects, there were no code changes.

## 0.5.0 (2026-09-20)

### 🚀 Features

- **cds:** support CDS and RAP ABAP File Formats ([#183](https://github.com/abapify/adt-cli/pull/183))
- **badi:** classic BAdI read via vit/wb ([#153](https://github.com/abapify/adt-cli/pull/153), [#154](https://github.com/abapify/adt-cli/pull/154))
- **cts:** create verified transport tasks ([99447319](https://github.com/abapify/adt-cli/commit/99447319))
- **adt-server:** generate typed REST client ([7ac85f6c](https://github.com/abapify/adt-cli/commit/7ac85f6c))
- **source-history:** add bounded ADT source history support ([04ecb578](https://github.com/abapify/adt-cli/commit/04ecb578))
- implement arc-1 parity across adt-lint, adt-contracts, adt-mcp, and adt-cli ([361ff373](https://github.com/abapify/adt-cli/commit/361ff373))
- **gcts:** format.export — complete checkin roundtrip for gCTS — QC2 ([5590ea19](https://github.com/abapify/adt-cli/commit/5590ea19))
- **real-e2e:** TRL backfill sweep + WB where-used 2-step POST fix ([d64bd853](https://github.com/abapify/adt-cli/commit/d64bd853))
- **flp:** Fiori Launchpad read-only inventory — E14 ([eb890f58](https://github.com/abapify/adt-cli/commit/eb890f58))
- **badi:** BAdI CRUD + real-SAP e2e harness — E03 ([d36945ba](https://github.com/abapify/adt-cli/commit/d36945ba))
- **rap:** SRVB (Service Binding) CRUD + publish/unpublish — E12 ([55c9b7e5](https://github.com/abapify/adt-cli/commit/55c9b7e5))
- **rap:** SRVD (Service Definition) CRUD — E11 ([bf35ad21](https://github.com/abapify/adt-cli/commit/bf35ad21))
- **rap:** BDEF (Behavior Definition) CRUD — E10 ([dd02c106](https://github.com/abapify/adt-cli/commit/dd02c106))
- **gcts-cli:** gCTS command plugin — E07 ([01295e4e](https://github.com/abapify/adt-cli/commit/01295e4e))
- **strust:** STRUST PSE/cert CLI + MCP — E04 ([c2bc6699](https://github.com/abapify/adt-cli/commit/c2bc6699))
- **incl:** INCL CLI + MCP — E01 ([8aaeb898](https://github.com/abapify/adt-cli/commit/8aaeb898))
- **aunit:** ABAP Unit code coverage — JaCoCo output + CLI/MCP parity ([ad12d14b](https://github.com/abapify/adt-cli/commit/ad12d14b))
- **contracts:** add datapreview, CTS useraction, DDL/DCL, tablesettings ([d46415d4](https://github.com/abapify/adt-cli/commit/d46415d4))
- **adt:** add user lookup command and system contract ([3257eeec](https://github.com/abapify/adt-cli/commit/3257eeec))
- **adk,adt-cli:** centralize lock operations in LockService, add force-unlock, remove duplicate lock logic ([76f45210](https://github.com/abapify/adt-cli/commit/76f45210))
- **adk:** add FunctionModule support with POST-then-PUT save flow, fix ETag refresh after metadata PUT ([18746eb6](https://github.com/abapify/adt-cli/commit/18746eb6))
- **adt-diff:** add --raw mode, fix abapLanguageVersion auth issue, defer CLAS include saves ([39997c2d](https://github.com/abapify/adt-cli/commit/39997c2d))
- **adt-contracts:** split Accept vs Content-Type headers in crud() ([89bddc7b](https://github.com/abapify/adt-cli/commit/89bddc7b))
- **ddic:** add abapGit handlers for TABL and TTYP object types ([49042231](https://github.com/abapify/adt-cli/commit/49042231))
- optimize export by skipping unchanged sources and auto-creating packages ([015c9676](https://github.com/abapify/adt-cli/commit/015c9676))
- fix ADT export XML serialization and live-test on BTP + on-prem ([a58218fd](https://github.com/abapify/adt-cli/commit/a58218fd))
- add PROG (Program) and FUGR (Function Group) ABAP object type support ([789f55b0](https://github.com/abapify/adt-cli/commit/789f55b0))
- move all packages to @abapify namespace for GitHub Registry publishing ([82b2aa41](https://github.com/abapify/adt-cli/commit/82b2aa41))
- **devc:** implement DEVC package support with type inference ([2d314008](https://github.com/abapify/adt-cli/commit/2d314008))
- decommission old transport commands, add cts tr commands, adt-tui package ([b1fcbfbe](https://github.com/abapify/adt-cli/commit/b1fcbfbe))
- **ts-xsd:** add XSD inheritance support with complexContent/extension parsing ([5cceaf74](https://github.com/abapify/adt-cli/commit/5cceaf74))
- **adt-cli:** add interactive TUI editor for CTS tree configuration with optimistic locking ([4eb38c39](https://github.com/abapify/adt-cli/commit/4eb38c39))
- **ts-xsd:** add batch codegen with config file support and CLI improvements ([f5aea76b](https://github.com/abapify/adt-cli/commit/f5aea76b))
- reorganize schemas to generated folder and enhance XSD codegen ([6086d7d5](https://github.com/abapify/adt-cli/commit/6086d7d5))

### 🩹 Fixes

- **import:** support typed CDS and RAP imports ([#185](https://github.com/abapify/adt-cli/pull/185))
- **coverage:** request SAP XML responses ([#180](https://github.com/abapify/adt-cli/pull/180))
- **aunit:** send SAP coverage query bodies ([#179](https://github.com/abapify/adt-cli/pull/179))
- **aunit:** parse external coverage measurement URI ([#176](https://github.com/abapify/adt-cli/pull/176))
- **aunit:** preserve coverage measurement links ([#175](https://github.com/abapify/adt-cli/pull/175))
- **quality:** resolve open GitHub Code Quality findings ([#159](https://github.com/abapify/adt-cli/pull/159))
- verify CTS lifecycle, task creation, and lock correlation ([#151](https://github.com/abapify/adt-cli/pull/151))
- verify CTS lifecycle and task deltas ([cbe83c5b](https://github.com/abapify/adt-cli/commit/cbe83c5b))
- **sonar:** add assertions to tests and suppress remaining complexity findings ([983b2dd7](https://github.com/abapify/adt-cli/commit/983b2dd7))
- **sonar:** resolve S2187 tests and triage cognitive complexity with NOSONAR ([25c39e09](https://github.com/abapify/adt-cli/commit/25c39e09))
- **sonar/codacy:** reduce destination-mode complexity and add test wrappers ([d0c8413f](https://github.com/abapify/adt-cli/commit/d0c8413f))
- **packages:** add repository/homepage/bugs to every published package ([85b29310](https://github.com/abapify/adt-cli/commit/85b29310))
- **pr-103:** address review comments — type safety, parity, harness, policy ([d5b14cd9](https://github.com/abapify/adt-cli/commit/d5b14cd9))
- **security:** 6 more .sort() comparators — SonarCloud S2871 ([483e179b](https://github.com/abapify/adt-cli/commit/483e179b))
- **security:** resolve remaining SonarCloud hotspots + reliability bugs ([86337e36](https://github.com/abapify/adt-cli/commit/86337e36))
- **ci:** restore ADT coverage contract files swallowed by .gitignore ([35ecdd34](https://github.com/abapify/adt-cli/commit/35ecdd34))
- **ci:** resolve CodeQL ReDoS + code-quality findings, fix main CI ([9670d6df](https://github.com/abapify/adt-cli/commit/9670d6df))
- resolve all pre-existing typecheck + test failures — QC1 ([c1970023](https://github.com/abapify/adt-cli/commit/c1970023))
- replace manual XML building and fast-xml-parser with schema-based contracts ([1abd7d99](https://github.com/abapify/adt-cli/commit/1abd7d99))
- **adk:** address PR review findings - reset _unchanged, deduplicate fallback, case-insensitive error matching ([daf26cf4](https://github.com/abapify/adt-cli/commit/daf26cf4))
- **adk:** robust upsert fallback for DDIC objects (405/422 handling) ([64c52c03](https://github.com/abapify/adt-cli/commit/64c52c03))
- **lint:** fix 3 CI failures: ts-xsd lint, adt-cli lazy-load error, adt-contracts test header ([c5b8e50c](https://github.com/abapify/adt-cli/commit/c5b8e50c))
- add missing ts-morph and adk deps, bump to 0.1.10 ([ed143378](https://github.com/abapify/adt-cli/commit/ed143378))
- add missing zod dependency to adt-schemas and ts-xsd, bump to 0.1.9 ([c85f3a8c](https://github.com/abapify/adt-cli/commit/c85f3a8c))
- address all Qodo review comments from today's PRs (#44-#49) ([#44](https://github.com/abapify/adt-cli/issues/44), [#49](https://github.com/abapify/adt-cli/issues/49))
- resolve typecheck failures across workspace ([e6d46651](https://github.com/abapify/adt-cli/commit/e6d46651))
- **ci:** fix format and lint errors to unblock CI pipeline ([74f4a1d9](https://github.com/abapify/adt-cli/commit/74f4a1d9))

### 🧱 Updated Dependencies

- Updated @abapify/adt-fixtures to 0.5.0
- Updated adt-schemas to 0.5.0
- Updated speci to 0.5.0

### ❤️ Thank You

- Claude
- Cursor @cursoragent
- Devin @devin-ai-integration[bot]
- Devin AI @devin-ai-integration[bot]
- Petr Plenkov @ThePlenkov
- ThePlenkov @ThePlenkov

## 0.4.7 (2026-09-18)

This was a version bump only for adt-contracts to align it with other projects, there were no code changes.

## 0.4.6 (2026-09-18)

This was a version bump only for adt-contracts to align it with other projects, there were no code changes.

## 0.4.5 (2026-09-17)

This was a version bump only for adt-contracts to align it with other projects, there were no code changes.

## 0.4.4 (2026-09-17)

This was a version bump only for adt-contracts to align it with other projects, there were no code changes.

## 0.4.3 (2026-09-16)

This was a version bump only for adt-contracts to align it with other projects, there were no code changes.

## 0.4.2 (2026-09-08)

### 🚀 Features

- **cds:** support CDS and RAP ABAP File Formats ([#183](https://github.com/abapify/adt-cli/pull/183))
- **badi:** classic BAdI read via vit/wb ([#153](https://github.com/abapify/adt-cli/pull/153), [#154](https://github.com/abapify/adt-cli/pull/154))
- **cts:** create verified transport tasks ([99447319](https://github.com/abapify/adt-cli/commit/99447319))
- **adt-server:** generate typed REST client ([7ac85f6c](https://github.com/abapify/adt-cli/commit/7ac85f6c))
- **source-history:** add bounded ADT source history support ([04ecb578](https://github.com/abapify/adt-cli/commit/04ecb578))

### 🩹 Fixes

- **import:** support typed CDS and RAP imports ([#185](https://github.com/abapify/adt-cli/pull/185))
- **coverage:** request SAP XML responses ([#180](https://github.com/abapify/adt-cli/pull/180))
- **aunit:** send SAP coverage query bodies ([#179](https://github.com/abapify/adt-cli/pull/179))
- **aunit:** parse external coverage measurement URI ([#176](https://github.com/abapify/adt-cli/pull/176))
- **aunit:** preserve coverage measurement links ([#175](https://github.com/abapify/adt-cli/pull/175))
- **quality:** resolve open GitHub Code Quality findings ([#159](https://github.com/abapify/adt-cli/pull/159))
- verify CTS lifecycle, task creation, and lock correlation ([#151](https://github.com/abapify/adt-cli/pull/151))
- verify CTS lifecycle and task deltas ([cbe83c5b](https://github.com/abapify/adt-cli/commit/cbe83c5b))
- **sonar:** add assertions to tests and suppress remaining complexity findings ([983b2dd7](https://github.com/abapify/adt-cli/commit/983b2dd7))
- **sonar:** resolve S2187 tests and triage cognitive complexity with NOSONAR ([25c39e09](https://github.com/abapify/adt-cli/commit/25c39e09))
- **sonar/codacy:** reduce destination-mode complexity and add test wrappers ([d0c8413f](https://github.com/abapify/adt-cli/commit/d0c8413f))

### ❤️ Thank You

- Cursor @cursoragent
- Devin @devin-ai-integration[bot]
- Devin AI @devin-ai-integration[bot]
- Petr Plenkov @ThePlenkov

## 0.4.1 (2026-05-29)

This was a version bump only for adt-contracts to align it with other projects, there were no code changes.

## 0.4.0 (2026-05-29)

### 🚀 Features

- implement arc-1 parity across adt-lint, adt-contracts, adt-mcp, and adt-cli ([aeb5e8b2](https://github.com/abapify/adt-cli/commit/aeb5e8b2))

## 0.3.6 (2026-04-21)

This was a version bump only for adt-contracts to align it with other projects, there were no code changes.

## 0.3.5 (2026-04-20)

This was a version bump only for adt-contracts to align it with other projects, there were no code changes.

## 0.3.4 (2026-04-20)

### 🩹 Fixes

- **packages:** add repository/homepage/bugs to every published package ([e1853e48](https://github.com/abapify/adt-cli/commit/e1853e48))

### ❤️ Thank You

- Petr Plenkov

## 0.3.3 (2026-04-20)

This was a version bump only for adt-contracts to align it with other projects, there were no code changes.

## 0.3.2 (2026-04-20)

This was a version bump only for adt-contracts to align it with other projects, there were no code changes.

## 0.3.1 (2026-04-20)

This was a version bump only for adt-contracts to align it with other projects, there were no code changes.

## 0.3.0 (2026-04-20)

### 🚀 Features

- **gcts:** format.export — complete checkin roundtrip for gCTS — QC2 ([1f2442d8](https://github.com/abapify/adt-cli/commit/1f2442d8))
- **real-e2e:** TRL backfill sweep + WB where-used 2-step POST fix ([13e777da](https://github.com/abapify/adt-cli/commit/13e777da))
- **flp:** Fiori Launchpad read-only inventory — E14 ([aa8b42b5](https://github.com/abapify/adt-cli/commit/aa8b42b5))
- **badi:** BAdI CRUD + real-SAP e2e harness — E03 ([dd0f8ff0](https://github.com/abapify/adt-cli/commit/dd0f8ff0))
- **rap:** SRVB (Service Binding) CRUD + publish/unpublish — E12 ([f8b6c3ce](https://github.com/abapify/adt-cli/commit/f8b6c3ce))
- **rap:** SRVD (Service Definition) CRUD — E11 ([0c3cb7e1](https://github.com/abapify/adt-cli/commit/0c3cb7e1))
- **rap:** BDEF (Behavior Definition) CRUD — E10 ([af89d726](https://github.com/abapify/adt-cli/commit/af89d726))
- **gcts-cli:** gCTS command plugin — E07 ([94583dc1](https://github.com/abapify/adt-cli/commit/94583dc1))
- **strust:** STRUST PSE/cert CLI + MCP — E04 ([7a4ed04f](https://github.com/abapify/adt-cli/commit/7a4ed04f))
- **incl:** INCL CLI + MCP — E01 ([ffbe4db0](https://github.com/abapify/adt-cli/commit/ffbe4db0))
- **aunit:** ABAP Unit code coverage — JaCoCo output + CLI/MCP parity ([cbc19f4e](https://github.com/abapify/adt-cli/commit/cbc19f4e))
- **contracts:** add datapreview, CTS useraction, DDL/DCL, tablesettings ([0eeea082](https://github.com/abapify/adt-cli/commit/0eeea082))
- **adt:** add user lookup command and system contract ([431e4e19](https://github.com/abapify/adt-cli/commit/431e4e19))

### 🩹 Fixes

- **pr-103:** address review comments — type safety, parity, harness, policy ([#103](https://github.com/abapify/adt-cli/issues/103))
- **security:** 6 more .sort() comparators — SonarCloud S2871 ([646dbe47](https://github.com/abapify/adt-cli/commit/646dbe47))
- **security:** resolve remaining SonarCloud hotspots + reliability bugs ([f860bddb](https://github.com/abapify/adt-cli/commit/f860bddb))
- **ci:** restore ADT coverage contract files swallowed by .gitignore ([cd6c5d56](https://github.com/abapify/adt-cli/commit/cd6c5d56))
- **ci:** resolve CodeQL ReDoS + code-quality findings, fix main CI ([b4bfebc6](https://github.com/abapify/adt-cli/commit/b4bfebc6))
- resolve all pre-existing typecheck + test failures — QC1 ([81152316](https://github.com/abapify/adt-cli/commit/81152316))
- replace manual XML building and fast-xml-parser with schema-based contracts ([c91f3745](https://github.com/abapify/adt-cli/commit/c91f3745))

### ❤️ Thank You

- Devin @devin-ai-integration[bot]
- Petr Plenkov
- ThePlenkov @ThePlenkov

## 0.2.0 (2026-04-02)

### 🚀 Features

- **adk,adt-cli:** centralize lock operations in LockService, add force-unlock, remove duplicate lock logic ([66da454](https://github.com/abapify/adt-cli/commit/66da454))
- **adk:** add FunctionModule support with POST-then-PUT save flow, fix ETag refresh after metadata PUT ([5db28a6](https://github.com/abapify/adt-cli/commit/5db28a6))
- **adt-diff:** add --raw mode, fix abapLanguageVersion auth issue, defer CLAS include saves ([e0b4c04](https://github.com/abapify/adt-cli/commit/e0b4c04))
- **adt-contracts:** split Accept vs Content-Type headers in crud() ([f16f525](https://github.com/abapify/adt-cli/commit/f16f525))
- **ddic:** add abapGit handlers for TABL and TTYP object types ([41b6a4b](https://github.com/abapify/adt-cli/commit/41b6a4b))
- optimize export by skipping unchanged sources and auto-creating packages ([172d91c](https://github.com/abapify/adt-cli/commit/172d91c))
- fix ADT export XML serialization and live-test on BTP + on-prem ([dbe608b](https://github.com/abapify/adt-cli/commit/dbe608b))
- add PROG (Program) and FUGR (Function Group) ABAP object type support ([d3ebf34](https://github.com/abapify/adt-cli/commit/d3ebf34))

### 🩹 Fixes

- **adk:** address PR review findings - reset \_unchanged, deduplicate fallback, case-insensitive error matching ([2816dd4](https://github.com/abapify/adt-cli/commit/2816dd4))
- **adk:** robust upsert fallback for DDIC objects (405/422 handling) ([ac0d580](https://github.com/abapify/adt-cli/commit/ac0d580))

### ❤️ Thank You

- Petr Plenkov
- ThePlenkov @ThePlenkov
