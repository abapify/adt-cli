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
