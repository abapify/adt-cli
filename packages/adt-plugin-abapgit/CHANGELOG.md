## 0.3.4 (2026-04-20)

### 🩹 Fixes

- **packages:** add repository/homepage/bugs to every published package ([e1853e48](https://github.com/abapify/adt-cli/commit/e1853e48))

### ❤️ Thank You

- Petr Plenkov

## 0.3.3 (2026-04-20)

This was a version bump only for adt-plugin-abapgit to align it with other projects, there were no code changes.

## 0.3.2 (2026-04-20)

This was a version bump only for adt-plugin-abapgit to align it with other projects, there were no code changes.

## 0.3.1 (2026-04-20)

This was a version bump only for adt-plugin-abapgit to align it with other projects, there were no code changes.

## 0.3.0 (2026-04-20)

### 🚀 Features

- **rap:** SRVB (Service Binding) CRUD + publish/unpublish — E12 ([f8b6c3ce](https://github.com/abapify/adt-cli/commit/f8b6c3ce))
- **rap:** SRVD (Service Definition) CRUD — E11 ([0c3cb7e1](https://github.com/abapify/adt-cli/commit/0c3cb7e1))
- **rap:** BDEF (Behavior Definition) CRUD — E10 ([af89d726](https://github.com/abapify/adt-cli/commit/af89d726))
- **plugin:** FormatPlugin API foundation — E05 ([a4e6eeef](https://github.com/abapify/adt-cli/commit/a4e6eeef))
- **aunit:** ABAP Unit code coverage — JaCoCo output + CLI/MCP parity ([cbc19f4e](https://github.com/abapify/adt-cli/commit/cbc19f4e))

### 🩹 Fixes

- **pr-103:** address review comments — type safety, parity, harness, policy ([#103](https://github.com/abapify/adt-cli/issues/103))
- **security:** 6 more .sort() comparators — SonarCloud S2871 ([646dbe47](https://github.com/abapify/adt-cli/commit/646dbe47))
- **security:** resolve remaining SonarCloud hotspots + reliability bugs ([f860bddb](https://github.com/abapify/adt-cli/commit/f860bddb))
- **security:** resolve all remaining CodeQL alerts with source-level fixes ([734713bc](https://github.com/abapify/adt-cli/commit/734713bc))

### ❤️ Thank You

- Devin @devin-ai-integration[bot]
- Petr Plenkov

## 0.2.0 (2026-04-02)

### 🚀 Features

- **adk,adt-cli:** fix ETag invalidation after lock acquisition, improve DEVC subpackage filtering, add --objects to package get ([979aad9](https://github.com/abapify/adt-cli/commit/979aad9))
- **adk:** add FunctionModule support with POST-then-PUT save flow, fix ETag refresh after metadata PUT ([5db28a6](https://github.com/abapify/adt-cli/commit/5db28a6))
- **adt-diff:** add --raw mode, fix abapLanguageVersion auth issue, defer CLAS include saves ([e0b4c04](https://github.com/abapify/adt-cli/commit/e0b4c04))
- **adt-diff:** rename --format to --source, add annotation filtering for CDS comparison ([07a59da](https://github.com/abapify/adt-cli/commit/07a59da))
- **cds-to-abapgit:** detect LANGDEP from spras/lang fields in CDS ([ff711e8](https://github.com/abapify/adt-cli/commit/ff711e8))
- resolve DDIC metadata via ADT for zero-diff TABL serialization ([a8198fa](https://github.com/abapify/adt-cli/commit/a8198fa))
- add adt diff command and fix CDS-to-abapGit serialization ([130168d](https://github.com/abapify/adt-cli/commit/130168d))
- abapGit roundtrip - export, deploy, and structure support ([0da189a](https://github.com/abapify/adt-cli/commit/0da189a))
- **ddic:** add abapGit handlers for TABL and TTYP object types ([41b6a4b](https://github.com/abapify/adt-cli/commit/41b6a4b))
- optimize export by skipping unchanged sources and auto-creating packages ([172d91c](https://github.com/abapify/adt-cli/commit/172d91c))
- fix ADT export XML serialization and live-test on BTP + on-prem ([dbe608b](https://github.com/abapify/adt-cli/commit/dbe608b))
- add PROG (Program) and FUGR (Function Group) ABAP object type support ([d3ebf34](https://github.com/abapify/adt-cli/commit/d3ebf34))

### 🩹 Fixes

- address Copilot and Devin review findings ([a6c4707](https://github.com/abapify/adt-cli/commit/a6c4707))
- resolve SonarQube quality gate failures (security hotspot + duplication) ([12bd3b8](https://github.com/abapify/adt-cli/commit/12bd3b8))
- **cds-to-abapgit:** detect CLIDEP for client-dependent tables ([50e1200](https://github.com/abapify/adt-cli/commit/50e1200))
- **abapgit:** align dd02v and dd03p field order ([d7578d3](https://github.com/abapify/adt-cli/commit/d7578d3))
- **cds-to-abapgit:** correct DD03P field ordering to match SAP ([20a4ac7](https://github.com/abapify/adt-cli/commit/20a4ac7))
- **cds-to-abapgit:** stop emitting LANGDEP, CLIDEP, POSITION from CDS source ([0d06b3c](https://github.com/abapify/adt-cli/commit/0d06b3c))
- use [^<]+ in XML tag regexes to require non-empty content ([b459ea7](https://github.com/abapify/adt-cli/commit/b459ea7))
- address remaining SonarQube findings - complexity, duplication, and code quality ([11a3408](https://github.com/abapify/adt-cli/commit/11a3408))
- resolve SonarCloud quality gate failures ([e8cfed9](https://github.com/abapify/adt-cli/commit/e8cfed9))
- address all SonarQube findings for PR #81 ([#81](https://github.com/abapify/adt-cli/issues/81))
- correct .gitignore corruption and add FUGR fromAbapGit comment ([cbb35d4](https://github.com/abapify/adt-cli/commit/cbb35d4))

### ❤️ Thank You

- Devin @devin-ai-integration[bot]
- Petr Plenkov
- ThePlenkov @ThePlenkov
