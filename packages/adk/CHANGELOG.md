## 0.4.2 (2026-09-08)

### 🚀 Features

- **cds:** support CDS and RAP ABAP File Formats ([#183](https://github.com/abapify/adt-cli/pull/183))
- **flow:** persist complete CTS inventories ([#182](https://github.com/abapify/adt-cli/pull/182))
- **badi:** classic BAdI read via vit/wb ([#153](https://github.com/abapify/adt-cli/pull/153), [#154](https://github.com/abapify/adt-cli/pull/154))
- **badi:** add `adt badi <name> --implementations` ([#153](https://github.com/abapify/adt-cli/pull/153))
- **cts:** create verified transport tasks ([99447319](https://github.com/abapify/adt-cli/commit/99447319))
- **source-history:** add bounded ADT source history support ([04ecb578](https://github.com/abapify/adt-cli/commit/04ecb578))

### 🩹 Fixes

- **adk:** keep FUGR function module sources distinct ([#191](https://github.com/abapify/adt-cli/pull/191))
- **adk:** resolve LIMU function module owners ([#188](https://github.com/abapify/adt-cli/pull/188))
- resolve R3TR function modules via function groups ([#187](https://github.com/abapify/adt-cli/pull/187))
- **adk:** release transport task via newreleasejobs, verify by reload ([#173](https://github.com/abapify/adt-cli/pull/173))
- **adk:** skip unmaterializable transport objects ([#168](https://github.com/abapify/adt-cli/pull/168))
- **adk:** exclude SUSK CTS entries from source manifests ([#164](https://github.com/abapify/adt-cli/pull/164))
- **quality:** resolve open GitHub Code Quality findings ([#159](https://github.com/abapify/adt-cli/pull/159))
- **adt-flow:** ignore CTS release metadata during checkout ([#156](https://github.com/abapify/adt-cli/pull/156))
- CTS lifecycle follow-ups — lock correlation, release details, flow scope ([#157](https://github.com/abapify/adt-cli/pull/157))
- verify CTS lifecycle, task creation, and lock correlation ([#151](https://github.com/abapify/adt-cli/pull/151))
- **cts:** reconcile task and source lifecycle ([34469d91](https://github.com/abapify/adt-cli/commit/34469d91))
- **cts:** prefer authoritative task number ([18266a60](https://github.com/abapify/adt-cli/commit/18266a60))
- **cts:** preserve task identity from SAP response ([6bd4d02d](https://github.com/abapify/adt-cli/commit/6bd4d02d))
- **cts:** harden task creation verification ([bb8d5862](https://github.com/abapify/adt-cli/commit/bb8d5862))
- verify CTS lifecycle and task deltas ([cbe83c5b](https://github.com/abapify/adt-cli/commit/cbe83c5b))
- review thread fixes (broker, session, source-history, docs, deps) ([3d20361a](https://github.com/abapify/adt-cli/commit/3d20361a))
- **sonar:** resolve MAJOR code smells and regenerate client ([1559c2cd](https://github.com/abapify/adt-cli/commit/1559c2cd))
- **sonar:** add assertions to tests and suppress remaining complexity findings ([983b2dd7](https://github.com/abapify/adt-cli/commit/983b2dd7))
- **sonar:** resolve S2187 tests and triage cognitive complexity with NOSONAR ([25c39e09](https://github.com/abapify/adt-cli/commit/25c39e09))

### ❤️ Thank You

- Cursor @cursoragent
- Devin @devin-ai-integration[bot]
- Devin AI @devin-ai-integration[bot]
- Petr Plenkov @ThePlenkov
- ThePlenkov @ThePlenkov

## 0.4.1 (2026-05-29)

This was a version bump only for adk to align it with other projects, there were no code changes.

## 0.4.0 (2026-05-29)

### 🚀 Features

- transport deletion-aware import with obj_func filter and multi-TR merge ([452f03f4](https://github.com/abapify/adt-cli/commit/452f03f4))

### 🩹 Fixes

- use const variable for transportNumbers[0] to avoid non-null assertions ([12dbce6c](https://github.com/abapify/adt-cli/commit/12dbce6c))
- resolve SonarCloud reliability and duplication findings ([ac951739](https://github.com/abapify/adt-cli/commit/ac951739))
- **sonarcloud-review:** safe-guard JSON.stringify in S6551 helpers ([#113](https://github.com/abapify/adt-cli/issues/113))

### ❤️ Thank You

- Petr Plenkov
- ThePlenkov @ThePlenkov

## 0.3.6 (2026-04-21)

This was a version bump only for adk to align it with other projects, there were no code changes.

## 0.3.5 (2026-04-20)

This was a version bump only for adk to align it with other projects, there were no code changes.

## 0.3.4 (2026-04-20)

### 🩹 Fixes

- **packages:** add repository/homepage/bugs to every published package ([e1853e48](https://github.com/abapify/adt-cli/commit/e1853e48))

### ❤️ Thank You

- Petr Plenkov

## 0.3.3 (2026-04-20)

This was a version bump only for adk to align it with other projects, there were no code changes.

## 0.3.2 (2026-04-20)

This was a version bump only for adk to align it with other projects, there were no code changes.

## 0.3.1 (2026-04-20)

This was a version bump only for adk to align it with other projects, there were no code changes.

## 0.3.0 (2026-04-20)

### 🚀 Features

- **badi:** BAdI CRUD + real-SAP e2e harness — E03 ([dd0f8ff0](https://github.com/abapify/adt-cli/commit/dd0f8ff0))
- **rap:** SRVB (Service Binding) CRUD + publish/unpublish — E12 ([f8b6c3ce](https://github.com/abapify/adt-cli/commit/f8b6c3ce))
- **rap:** SRVD (Service Definition) CRUD — E11 ([0c3cb7e1](https://github.com/abapify/adt-cli/commit/0c3cb7e1))
- **rap:** BDEF (Behavior Definition) CRUD — E10 ([af89d726](https://github.com/abapify/adt-cli/commit/af89d726))
- **function:** FUGR/FUNC CLI + MCP — E02 ([e763d35c](https://github.com/abapify/adt-cli/commit/e763d35c))
- **incl:** INCL CLI + MCP — E01 ([ffbe4db0](https://github.com/abapify/adt-cli/commit/ffbe4db0))
- add CDS DDL and DCL source commands with XML injection fix ([6b49e9af](https://github.com/abapify/adt-cli/commit/6b49e9af))
- add datapreview osql, abap run, and DDIC object commands ([9e9289e0](https://github.com/abapify/adt-cli/commit/9e9289e0))
- add package CRUD and object CRUD commands (class, program, interface) ([5fbb8600](https://github.com/abapify/adt-cli/commit/5fbb8600))
- add CTS tr reassign command to change transport owner ([cfd8b705](https://github.com/abapify/adt-cli/commit/cfd8b705))

### 🩹 Fixes

- resolve all pre-existing typecheck + test failures — QC1 ([81152316](https://github.com/abapify/adt-cli/commit/81152316))

### ❤️ Thank You

- Devin @devin-ai-integration[bot]
- Petr Plenkov
- ThePlenkov @ThePlenkov

## 0.2.0 (2026-04-02)

### 🚀 Features

- **adk,adt-cli:** fix ETag invalidation after lock acquisition, improve DEVC subpackage filtering, add --objects to package get ([979aad9](https://github.com/abapify/adt-cli/commit/979aad9))
- **adk,adt-cli:** centralize lock operations in LockService, add force-unlock, remove duplicate lock logic ([66da454](https://github.com/abapify/adt-cli/commit/66da454))
- **adk,adt-cli:** add FUGR name normalization, lock handle persistence, and root URI extraction ([ee2c300](https://github.com/abapify/adt-cli/commit/ee2c300))
- **adk:** add metadata-only unchanged detection, fix bulk save progress counter ([ee2f4dc](https://github.com/abapify/adt-cli/commit/ee2f4dc))
- **adk:** improve FUNC save reliability — skip POST if exists, compare function body only, add DEVC skeleton ([b9469e0](https://github.com/abapify/adt-cli/commit/b9469e0))
- **adk:** add FunctionModule support with POST-then-PUT save flow, fix ETag refresh after metadata PUT ([5db28a6](https://github.com/abapify/adt-cli/commit/5db28a6))
- **adt-diff:** add --raw mode, fix abapLanguageVersion auth issue, defer CLAS include saves ([e0b4c04](https://github.com/abapify/adt-cli/commit/e0b4c04))
- resolve DDIC metadata via ADT for zero-diff TABL serialization ([a8198fa](https://github.com/abapify/adt-cli/commit/a8198fa))
- abapGit roundtrip - export, deploy, and structure support ([0da189a](https://github.com/abapify/adt-cli/commit/0da189a))
- **ddic:** add abapGit handlers for TABL and TTYP object types ([41b6a4b](https://github.com/abapify/adt-cli/commit/41b6a4b))
- move single-source save lifecycle to base class and add default unchanged detection ([b6f58a5](https://github.com/abapify/adt-cli/commit/b6f58a5))
- optimize export by skipping unchanged sources and auto-creating packages ([172d91c](https://github.com/abapify/adt-cli/commit/172d91c))
- add PROG (Program) and FUGR (Function Group) ABAP object type support ([d3ebf34](https://github.com/abapify/adt-cli/commit/d3ebf34))

### 🩹 Fixes

- **adk:** remove false from isEmpty in checkMetadataUnchanged ([7b3bbeb](https://github.com/abapify/adt-cli/commit/7b3bbeb))
- address Copilot and Devin review findings ([a6c4707](https://github.com/abapify/adt-cli/commit/a6c4707))
- **adk:** address PR review findings - reset \_unchanged, deduplicate fallback, case-insensitive error matching ([2816dd4](https://github.com/abapify/adt-cli/commit/2816dd4))
- **adk:** robust upsert fallback for DDIC objects (405/422 handling) ([ac0d580](https://github.com/abapify/adt-cli/commit/ac0d580))
- address remaining SonarQube findings - complexity, duplication, and code quality ([11a3408](https://github.com/abapify/adt-cli/commit/11a3408))
- resolve SonarCloud quality gate failures ([e8cfed9](https://github.com/abapify/adt-cli/commit/e8cfed9))

### ❤️ Thank You

- Devin @devin-ai-integration[bot]
- Petr Plenkov
- ThePlenkov @ThePlenkov
