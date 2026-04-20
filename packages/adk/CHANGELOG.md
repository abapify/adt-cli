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
