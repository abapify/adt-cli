## 0.4.16 (2026-09-29)

This was a version bump only for adt-schemas to align it with other projects, there were no code changes.

## 0.4.15 (2026-09-29)

This was a version bump only for adt-schemas to align it with other projects, there were no code changes.

## 0.4.14 (2026-09-28)

This was a version bump only for adt-schemas to align it with other projects, there were no code changes.

## 0.4.13 (2026-09-28)

This was a version bump only for adt-schemas to align it with other projects, there were no code changes.

## 0.4.12 (2026-09-28)

This was a version bump only for adt-schemas to align it with other projects, there were no code changes.

## 0.4.11 (2026-09-23)

This was a version bump only for adt-schemas to align it with other projects, there were no code changes.

## 0.4.10 (2026-09-21)

This was a version bump only for adt-schemas to align it with other projects, there were no code changes.

## 0.4.9 (2026-09-20)

This was a version bump only for adt-schemas to align it with other projects, there were no code changes.

## 0.4.8 (2026-09-20)

This was a version bump only for adt-schemas to align it with other projects, there were no code changes.

## 0.5.0 (2026-09-20)

### 🚀 Features

- **cds:** support CDS and RAP ABAP File Formats ([#183](https://github.com/abapify/adt-cli/pull/183))
- **source-history:** add bounded ADT source history support ([04ecb578](https://github.com/abapify/adt-cli/commit/04ecb578))
- **badi:** BAdI CRUD + real-SAP e2e harness — E03 ([d36945ba](https://github.com/abapify/adt-cli/commit/d36945ba))
- **rap:** SRVB (Service Binding) CRUD + publish/unpublish — E12 ([55c9b7e5](https://github.com/abapify/adt-cli/commit/55c9b7e5))
- **rap:** SRVD (Service Definition) CRUD — E11 ([bf35ad21](https://github.com/abapify/adt-cli/commit/bf35ad21))
- **incl:** INCL CLI + MCP — E01 ([8aaeb898](https://github.com/abapify/adt-cli/commit/8aaeb898))
- **aunit:** ABAP Unit code coverage — JaCoCo output + CLI/MCP parity ([ad12d14b](https://github.com/abapify/adt-cli/commit/ad12d14b))
- **contracts:** add datapreview, CTS useraction, DDL/DCL, tablesettings ([d46415d4](https://github.com/abapify/adt-cli/commit/d46415d4))
- **adt:** add user lookup command and system contract ([3257eeec](https://github.com/abapify/adt-cli/commit/3257eeec))
- **adk:** add FunctionModule support with POST-then-PUT save flow, fix ETag refresh after metadata PUT ([18746eb6](https://github.com/abapify/adt-cli/commit/18746eb6))
- **ddic:** add abapGit handlers for TABL and TTYP object types ([49042231](https://github.com/abapify/adt-cli/commit/49042231))
- fix ADT export XML serialization and live-test on BTP + on-prem ([a58218fd](https://github.com/abapify/adt-cli/commit/a58218fd))
- add PROG (Program) and FUGR (Function Group) ABAP object type support ([789f55b0](https://github.com/abapify/adt-cli/commit/789f55b0))
- move all packages to @abapify namespace for GitHub Registry publishing ([82b2aa41](https://github.com/abapify/adt-cli/commit/82b2aa41))

### 🩹 Fixes

- **adt-schemas:** replace zod4-only .loose() with .catchall() ([9832c72e](https://github.com/abapify/adt-cli/commit/9832c72e))
- **aunit:** send SAP coverage query bodies ([#179](https://github.com/abapify/adt-cli/pull/179))
- **aunit:** parse external coverage measurement URI ([#176](https://github.com/abapify/adt-cli/pull/176))
- **aunit:** preserve coverage measurement links ([#175](https://github.com/abapify/adt-cli/pull/175))
- **sonar:** add assertions to tests and suppress remaining complexity findings ([983b2dd7](https://github.com/abapify/adt-cli/commit/983b2dd7))
- **sonar:** resolve S2187 tests and triage cognitive complexity with NOSONAR ([25c39e09](https://github.com/abapify/adt-cli/commit/25c39e09))
- **sonar/codacy:** reduce destination-mode complexity and add test wrappers ([d0c8413f](https://github.com/abapify/adt-cli/commit/d0c8413f))
- **packages:** add repository/homepage/bugs to every published package ([85b29310](https://github.com/abapify/adt-cli/commit/85b29310))
- apply CodeRabbit auto-fixes ([1edf95e1](https://github.com/abapify/adt-cli/commit/1edf95e1))
- **adk:** robust upsert fallback for DDIC objects (405/422 handling) ([64c52c03](https://github.com/abapify/adt-cli/commit/64c52c03))
- add missing ts-morph and adk deps, bump to 0.1.10 ([ed143378](https://github.com/abapify/adt-cli/commit/ed143378))
- add missing zod dependency to adt-schemas and ts-xsd, bump to 0.1.9 ([c85f3a8c](https://github.com/abapify/adt-cli/commit/c85f3a8c))
- address all Qodo review comments from today's PRs (#44-#49) ([#44](https://github.com/abapify/adt-cli/issues/44), [#49](https://github.com/abapify/adt-cli/issues/49))
- resolve typecheck failures across workspace ([e6d46651](https://github.com/abapify/adt-cli/commit/e6d46651))
- **ci:** fix format and lint errors to unblock CI pipeline ([74f4a1d9](https://github.com/abapify/adt-cli/commit/74f4a1d9))

### 🧱 Updated Dependencies

- Updated @abapify/adt-fixtures to 0.5.0
- Updated ts-xsd to 0.5.0

### ❤️ Thank You

- Claude
- CodeRabbit
- Devin @devin-ai-integration[bot]
- Devin AI @devin-ai-integration[bot]
- Petr Plenkov @ThePlenkov
- ThePlenkov @ThePlenkov

## 0.4.7 (2026-09-18)

This was a version bump only for adt-schemas to align it with other projects, there were no code changes.

## 0.4.6 (2026-09-18)

### 🩹 Fixes

- **adt-schemas:** replace zod4-only .loose() with .catchall() ([9832c72e](https://github.com/abapify/adt-cli/commit/9832c72e))

### ❤️ Thank You

- Devin @devin-ai-integration[bot]
- ThePlenkov @ThePlenkov

## 0.4.5 (2026-09-17)

This was a version bump only for adt-schemas to align it with other projects, there were no code changes.

## 0.4.4 (2026-09-17)

This was a version bump only for adt-schemas to align it with other projects, there were no code changes.

## 0.4.3 (2026-09-16)

This was a version bump only for adt-schemas to align it with other projects, there were no code changes.

## 0.4.2 (2026-09-08)

### 🚀 Features

- **cds:** support CDS and RAP ABAP File Formats ([#183](https://github.com/abapify/adt-cli/pull/183))
- **source-history:** add bounded ADT source history support ([04ecb578](https://github.com/abapify/adt-cli/commit/04ecb578))

### 🩹 Fixes

- **aunit:** send SAP coverage query bodies ([#179](https://github.com/abapify/adt-cli/pull/179))
- **aunit:** parse external coverage measurement URI ([#176](https://github.com/abapify/adt-cli/pull/176))
- **aunit:** preserve coverage measurement links ([#175](https://github.com/abapify/adt-cli/pull/175))
- **sonar:** add assertions to tests and suppress remaining complexity findings ([983b2dd7](https://github.com/abapify/adt-cli/commit/983b2dd7))
- **sonar:** resolve S2187 tests and triage cognitive complexity with NOSONAR ([25c39e09](https://github.com/abapify/adt-cli/commit/25c39e09))
- **sonar/codacy:** reduce destination-mode complexity and add test wrappers ([d0c8413f](https://github.com/abapify/adt-cli/commit/d0c8413f))

### ❤️ Thank You

- Devin @devin-ai-integration[bot]
- Devin AI @devin-ai-integration[bot]
- Petr Plenkov @ThePlenkov

## 0.4.1 (2026-05-29)

This was a version bump only for adt-schemas to align it with other projects, there were no code changes.

## 0.4.0 (2026-05-29)

This was a version bump only for adt-schemas to align it with other projects, there were no code changes.

## 0.3.6 (2026-04-21)

This was a version bump only for adt-schemas to align it with other projects, there were no code changes.

## 0.3.5 (2026-04-20)

This was a version bump only for adt-schemas to align it with other projects, there were no code changes.

## 0.3.4 (2026-04-20)

### 🩹 Fixes

- **packages:** add repository/homepage/bugs to every published package ([e1853e48](https://github.com/abapify/adt-cli/commit/e1853e48))

### ❤️ Thank You

- Petr Plenkov

## 0.3.3 (2026-04-20)

This was a version bump only for adt-schemas to align it with other projects, there were no code changes.

## 0.3.2 (2026-04-20)

This was a version bump only for adt-schemas to align it with other projects, there were no code changes.

## 0.3.1 (2026-04-20)

This was a version bump only for adt-schemas to align it with other projects, there were no code changes.

## 0.3.0 (2026-04-20)

### 🚀 Features

- **badi:** BAdI CRUD + real-SAP e2e harness — E03 ([dd0f8ff0](https://github.com/abapify/adt-cli/commit/dd0f8ff0))
- **rap:** SRVB (Service Binding) CRUD + publish/unpublish — E12 ([f8b6c3ce](https://github.com/abapify/adt-cli/commit/f8b6c3ce))
- **rap:** SRVD (Service Definition) CRUD — E11 ([0c3cb7e1](https://github.com/abapify/adt-cli/commit/0c3cb7e1))
- **incl:** INCL CLI + MCP — E01 ([ffbe4db0](https://github.com/abapify/adt-cli/commit/ffbe4db0))
- **aunit:** ABAP Unit code coverage — JaCoCo output + CLI/MCP parity ([cbc19f4e](https://github.com/abapify/adt-cli/commit/cbc19f4e))
- **contracts:** add datapreview, CTS useraction, DDL/DCL, tablesettings ([0eeea082](https://github.com/abapify/adt-cli/commit/0eeea082))
- **adt:** add user lookup command and system contract ([431e4e19](https://github.com/abapify/adt-cli/commit/431e4e19))

### 🩹 Fixes

- apply CodeRabbit auto-fixes ([5554994b](https://github.com/abapify/adt-cli/commit/5554994b))

### ❤️ Thank You

- CodeRabbit
- Devin @devin-ai-integration[bot]
- Petr Plenkov

## 0.2.0 (2026-04-02)

### 🚀 Features

- **adk:** add FunctionModule support with POST-then-PUT save flow, fix ETag refresh after metadata PUT ([5db28a6](https://github.com/abapify/adt-cli/commit/5db28a6))
- **ddic:** add abapGit handlers for TABL and TTYP object types ([41b6a4b](https://github.com/abapify/adt-cli/commit/41b6a4b))
- fix ADT export XML serialization and live-test on BTP + on-prem ([dbe608b](https://github.com/abapify/adt-cli/commit/dbe608b))
- add PROG (Program) and FUGR (Function Group) ABAP object type support ([d3ebf34](https://github.com/abapify/adt-cli/commit/d3ebf34))

### 🩹 Fixes

- **adk:** robust upsert fallback for DDIC objects (405/422 handling) ([ac0d580](https://github.com/abapify/adt-cli/commit/ac0d580))

### ❤️ Thank You

- Petr Plenkov
- ThePlenkov @ThePlenkov
