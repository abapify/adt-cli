## 0.4.16 (2026-09-29)

This was a version bump only for adt-plugin-abapgit to align it with other projects, there were no code changes.

## 0.4.15 (2026-09-29)

This was a version bump only for adt-plugin-abapgit to align it with other projects, there were no code changes.

## 0.4.14 (2026-09-28)

This was a version bump only for adt-plugin-abapgit to align it with other projects, there were no code changes.

## 0.4.13 (2026-09-28)

This was a version bump only for adt-plugin-abapgit to align it with other projects, there were no code changes.

## 0.4.12 (2026-09-28)

This was a version bump only for adt-plugin-abapgit to align it with other projects, there were no code changes.

## 0.4.11 (2026-09-23)

This was a version bump only for adt-plugin-abapgit to align it with other projects, there were no code changes.

## 0.4.10 (2026-09-21)

This was a version bump only for adt-plugin-abapgit to align it with other projects, there were no code changes.

## 0.4.9 (2026-09-20)

This was a version bump only for adt-plugin-abapgit to align it with other projects, there were no code changes.

## 0.4.8 (2026-09-20)

This was a version bump only for adt-plugin-abapgit to align it with other projects, there were no code changes.

## 0.5.0 (2026-09-20)

### 🚀 Features

- **abapgit:** full upstream object type coverage (168 types) ([#205](https://github.com/abapify/adt-cli/pull/205))
- **abapgit:** add 8 more object types (EEEC, SWCR, HTTP, NROB, CHDO, SMTG, SFPF, SCP1) ([#204](https://github.com/abapify/adt-cli/pull/204))
- **abapgit:** add ENHO and ENHS enhancement object types ([#203](https://github.com/abapify/adt-cli/pull/203))
- **abapgit:** add 17 AFF-first object types (APLO, CHKC, CHKO, CHKV, SAJC, SAJT, etc.) ([#201](https://github.com/abapify/adt-cli/pull/201))
- **abapgit:** add 7 legacy XML object types (MSAG, VIEW, ENQU, SHLP, TRAN, TYPE, XSLT) ([#200](https://github.com/abapify/adt-cli/pull/200))
- **abapgit:** dual-format support for 15 CDS/RAP object types ([#199](https://github.com/abapify/adt-cli/pull/199))
- **abapgit:** dual-format deserialization foundation (XML + AFF JSON) ([#198](https://github.com/abapify/adt-cli/pull/198))
- **cds:** support CDS and RAP ABAP File Formats ([#183](https://github.com/abapify/adt-cli/pull/183))
- **adt-flow:** add incremental transport checkout ([#150](https://github.com/abapify/adt-cli/pull/150))
- transport deletion-aware import with obj_func filter and multi-TR merge ([22fe3d26](https://github.com/abapify/adt-cli/commit/22fe3d26))
- **rap:** SRVB (Service Binding) CRUD + publish/unpublish — E12 ([55c9b7e5](https://github.com/abapify/adt-cli/commit/55c9b7e5))
- **rap:** SRVD (Service Definition) CRUD — E11 ([bf35ad21](https://github.com/abapify/adt-cli/commit/bf35ad21))
- **rap:** BDEF (Behavior Definition) CRUD — E10 ([dd02c106](https://github.com/abapify/adt-cli/commit/dd02c106))
- **plugin:** FormatPlugin API foundation — E05 ([dbcf8fb1](https://github.com/abapify/adt-cli/commit/dbcf8fb1))
- **aunit:** ABAP Unit code coverage — JaCoCo output + CLI/MCP parity ([ad12d14b](https://github.com/abapify/adt-cli/commit/ad12d14b))
- **adk,adt-cli:** fix ETag invalidation after lock acquisition, improve DEVC subpackage filtering, add --objects to package get ([45fd3873](https://github.com/abapify/adt-cli/commit/45fd3873))
- **adk:** add FunctionModule support with POST-then-PUT save flow, fix ETag refresh after metadata PUT ([18746eb6](https://github.com/abapify/adt-cli/commit/18746eb6))
- **adt-diff:** add --raw mode, fix abapLanguageVersion auth issue, defer CLAS include saves ([39997c2d](https://github.com/abapify/adt-cli/commit/39997c2d))
- **adt-diff:** rename --format to --source, add annotation filtering for CDS comparison ([f12ad872](https://github.com/abapify/adt-cli/commit/f12ad872))
- **cds-to-abapgit:** detect LANGDEP from spras/lang fields in CDS ([752ab68d](https://github.com/abapify/adt-cli/commit/752ab68d))
- resolve DDIC metadata via ADT for zero-diff TABL serialization ([0af4104c](https://github.com/abapify/adt-cli/commit/0af4104c))
- add adt diff command and fix CDS-to-abapGit serialization ([e79ecb8f](https://github.com/abapify/adt-cli/commit/e79ecb8f))
- abapGit roundtrip - export, deploy, and structure support ([29859632](https://github.com/abapify/adt-cli/commit/29859632))
- **ddic:** add abapGit handlers for TABL and TTYP object types ([49042231](https://github.com/abapify/adt-cli/commit/49042231))
- optimize export by skipping unchanged sources and auto-creating packages ([015c9676](https://github.com/abapify/adt-cli/commit/015c9676))
- fix ADT export XML serialization and live-test on BTP + on-prem ([a58218fd](https://github.com/abapify/adt-cli/commit/a58218fd))
- add PROG (Program) and FUGR (Function Group) ABAP object type support ([789f55b0](https://github.com/abapify/adt-cli/commit/789f55b0))
- move all packages to @abapify namespace for GitHub Registry publishing ([82b2aa41](https://github.com/abapify/adt-cli/commit/82b2aa41))
- **atc:** plugin-based finding resolver architecture ([9a949250](https://github.com/abapify/adt-cli/commit/9a949250))
- **import:** support plugin format options for abapgit folder logic ([143cec32](https://github.com/abapify/adt-cli/commit/143cec32))

### 🩹 Fixes

- **atc:** resolve abapGit paths from full ATC locations ([#194](https://github.com/abapify/adt-cli/pull/194))
- **adk:** keep FUGR function module sources distinct ([#191](https://github.com/abapify/adt-cli/pull/191))
- **import:** support typed CDS and RAP imports ([#185](https://github.com/abapify/adt-cli/pull/185))
- **quality:** resolve open GitHub Code Quality findings ([#159](https://github.com/abapify/adt-cli/pull/159))
- resolve SonarCloud reliability and duplication findings ([043824fd](https://github.com/abapify/adt-cli/commit/043824fd))
- optimize findObjectFiles index, restore transportNumber compat, dedup ImportContext ([b4fa93e2](https://github.com/abapify/adt-cli/commit/b4fa93e2))
- harden cross-platform resolver traversal and adt command execution ([3608bb4c](https://github.com/abapify/adt-cli/commit/3608bb4c))
- apply cross-platform scanning and runtime configurability updates ([83ddeddf](https://github.com/abapify/adt-cli/commit/83ddeddf))
- **security:** unblock SonarCloud Quality Gate on new_security_hotspots_reviewed ([d08777c1](https://github.com/abapify/adt-cli/commit/d08777c1))
- **packages:** add repository/homepage/bugs to every published package ([85b29310](https://github.com/abapify/adt-cli/commit/85b29310))
- **pr-103:** address review comments — type safety, parity, harness, policy ([d5b14cd9](https://github.com/abapify/adt-cli/commit/d5b14cd9))
- **security:** 6 more .sort() comparators — SonarCloud S2871 ([483e179b](https://github.com/abapify/adt-cli/commit/483e179b))
- **security:** resolve remaining SonarCloud hotspots + reliability bugs ([86337e36](https://github.com/abapify/adt-cli/commit/86337e36))
- address Copilot and Devin review findings ([c897a350](https://github.com/abapify/adt-cli/commit/c897a350))
- resolve SonarQube quality gate failures (security hotspot + duplication) ([8de6152a](https://github.com/abapify/adt-cli/commit/8de6152a))
- **cds-to-abapgit:** detect CLIDEP for client-dependent tables ([ea619686](https://github.com/abapify/adt-cli/commit/ea619686))
- **abapgit:** align dd02v and dd03p field order ([4bca5b1e](https://github.com/abapify/adt-cli/commit/4bca5b1e))
- **cds-to-abapgit:** correct DD03P field ordering to match SAP ([6eab7d21](https://github.com/abapify/adt-cli/commit/6eab7d21))
- **cds-to-abapgit:** stop emitting LANGDEP, CLIDEP, POSITION from CDS source ([b33420df](https://github.com/abapify/adt-cli/commit/b33420df))
- use [^<]+ in XML tag regexes to require non-empty content ([84cb7eb7](https://github.com/abapify/adt-cli/commit/84cb7eb7))
- address remaining SonarQube findings - complexity, duplication, and code quality ([d25f4a9d](https://github.com/abapify/adt-cli/commit/d25f4a9d))
- resolve SonarCloud quality gate failures ([3c21ac0b](https://github.com/abapify/adt-cli/commit/3c21ac0b))
- address all SonarQube findings for PR #81 ([#81](https://github.com/abapify/adt-cli/issues/81))
- correct .gitignore corruption and add FUGR fromAbapGit comment ([fee168a5](https://github.com/abapify/adt-cli/commit/fee168a5))
- add missing ts-morph and adk deps, bump to 0.1.10 ([ed143378](https://github.com/abapify/adt-cli/commit/ed143378))
- add missing zod dependency to adt-schemas and ts-xsd, bump to 0.1.9 ([c85f3a8c](https://github.com/abapify/adt-cli/commit/c85f3a8c))
- address all Qodo review comments from today's PRs (#44-#49) ([#44](https://github.com/abapify/adt-cli/issues/44), [#49](https://github.com/abapify/adt-cli/issues/49))
- resolve typecheck failures across workspace ([e6d46651](https://github.com/abapify/adt-cli/commit/e6d46651))
- resolve all ESLint errors causing CI pipeline failures ([7c6e5128](https://github.com/abapify/adt-cli/commit/7c6e5128))
- **ci:** fix format and lint errors to unblock CI pipeline ([74f4a1d9](https://github.com/abapify/adt-cli/commit/74f4a1d9))
- **abapgit:** FULL folder logic now includes root package as directory ([f522bb2b](https://github.com/abapify/adt-cli/commit/f522bb2b))

### 🧱 Updated Dependencies

- Updated adt-schemas to 0.5.0
- Updated adt-plugin to 0.5.0
- Updated adt-atc to 0.5.0
- Updated ts-xsd to 0.5.0
- Updated @abapify/acds to 0.4.8
- Updated adk to 0.5.0

### ❤️ Thank You

- Claude
- Devin @devin-ai-integration[bot]
- Devin AI @devin-ai-integration[bot]
- Petr Plenkov @ThePlenkov
- ThePlenkov @ThePlenkov

## 0.4.7 (2026-09-18)

This was a version bump only for adt-plugin-abapgit to align it with other projects, there were no code changes.

## 0.4.6 (2026-09-18)

This was a version bump only for adt-plugin-abapgit to align it with other projects, there were no code changes.

## 0.4.5 (2026-09-17)

This was a version bump only for adt-plugin-abapgit to align it with other projects, there were no code changes.

## 0.4.4 (2026-09-17)

### 🚀 Features

- **abapgit:** full upstream object type coverage (168 types) ([#205](https://github.com/abapify/adt-cli/pull/205))
- **abapgit:** add 8 more object types (EEEC, SWCR, HTTP, NROB, CHDO, SMTG, SFPF, SCP1) ([#204](https://github.com/abapify/adt-cli/pull/204))
- **abapgit:** add ENHO and ENHS enhancement object types ([#203](https://github.com/abapify/adt-cli/pull/203))

### ❤️ Thank You

- Devin @devin-ai-integration[bot]
- Petr Plenkov @ThePlenkov
- ThePlenkov @ThePlenkov

## 0.4.3 (2026-09-16)

### 🚀 Features

- **abapgit:** add 17 AFF-first object types (APLO, CHKC, CHKO, CHKV, SAJC, SAJT, etc.) ([#201](https://github.com/abapify/adt-cli/pull/201))
- **abapgit:** add 7 legacy XML object types (MSAG, VIEW, ENQU, SHLP, TRAN, TYPE, XSLT) ([#200](https://github.com/abapify/adt-cli/pull/200))
- **abapgit:** dual-format support for 15 CDS/RAP object types ([#199](https://github.com/abapify/adt-cli/pull/199))
- **abapgit:** dual-format deserialization foundation (XML + AFF JSON) ([#198](https://github.com/abapify/adt-cli/pull/198))

### ❤️ Thank You

- Devin @devin-ai-integration[bot]
- Petr Plenkov @ThePlenkov
- ThePlenkov @ThePlenkov

## 0.4.2 (2026-09-08)

### 🚀 Features

- **cds:** support CDS and RAP ABAP File Formats ([#183](https://github.com/abapify/adt-cli/pull/183))
- **adt-flow:** add incremental transport checkout ([#150](https://github.com/abapify/adt-cli/pull/150))

### 🩹 Fixes

- **atc:** resolve abapGit paths from full ATC locations ([#194](https://github.com/abapify/adt-cli/pull/194))
- **adk:** keep FUGR function module sources distinct ([#191](https://github.com/abapify/adt-cli/pull/191))
- **import:** support typed CDS and RAP imports ([#185](https://github.com/abapify/adt-cli/pull/185))
- **quality:** resolve open GitHub Code Quality findings ([#159](https://github.com/abapify/adt-cli/pull/159))

### ❤️ Thank You

- Devin @devin-ai-integration[bot]
- Devin AI @devin-ai-integration[bot]
- Petr Plenkov @ThePlenkov
- ThePlenkov @ThePlenkov

## 0.4.1 (2026-05-29)

This was a version bump only for adt-plugin-abapgit to align it with other projects, there were no code changes.

## 0.4.0 (2026-05-29)

### 🚀 Features

- transport deletion-aware import with obj_func filter and multi-TR merge ([452f03f4](https://github.com/abapify/adt-cli/commit/452f03f4))

### 🩹 Fixes

- resolve SonarCloud reliability and duplication findings ([ac951739](https://github.com/abapify/adt-cli/commit/ac951739))
- optimize findObjectFiles index, restore transportNumber compat, dedup ImportContext ([4f08ee94](https://github.com/abapify/adt-cli/commit/4f08ee94))
- harden cross-platform resolver traversal and adt command execution ([8d057393](https://github.com/abapify/adt-cli/commit/8d057393))
- apply cross-platform scanning and runtime configurability updates ([3726c837](https://github.com/abapify/adt-cli/commit/3726c837))
- **security:** unblock SonarCloud Quality Gate on new_security_hotspots_reviewed ([#113](https://github.com/abapify/adt-cli/issues/113))

### ❤️ Thank You

- Petr Plenkov
- ThePlenkov @ThePlenkov

## 0.3.6 (2026-04-21)

This was a version bump only for adt-plugin-abapgit to align it with other projects, there were no code changes.

## 0.3.5 (2026-04-20)

This was a version bump only for adt-plugin-abapgit to align it with other projects, there were no code changes.

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
