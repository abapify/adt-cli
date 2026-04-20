## 0.3.0 (2026-04-20)

### 🚀 Features

- add CTS tr reassign command to change transport owner ([cfd8b705](https://github.com/abapify/adt-cli/commit/cfd8b705))
- add package CRUD and object CRUD commands (class, program, interface) ([5fbb8600](https://github.com/abapify/adt-cli/commit/5fbb8600))
- add datapreview osql, abap run, and DDIC object commands ([9e9289e0](https://github.com/abapify/adt-cli/commit/9e9289e0))
- add AUnit sonar format, improved exit codes, and ATC customizing command ([fde59fab](https://github.com/abapify/adt-cli/commit/fde59fab))
- add CDS DDL and DCL source commands with XML injection fix ([6b49e9af](https://github.com/abapify/adt-cli/commit/6b49e9af))
- add checkout command and remaining CDS/DDIC subtask completions ([bf97ca6c](https://github.com/abapify/adt-cli/commit/bf97ca6c))
- **acds:** full CDS DDL/DCL grammar + AST walker + validators — E09 ([51fa799d](https://github.com/abapify/adt-cli/commit/51fa799d))
- **adt:** add user lookup command and system contract ([431e4e19](https://github.com/abapify/adt-cli/commit/431e4e19))
- **adt-mcp:** add 7 new MCP tools and adt source CLI command ([7c184ed1](https://github.com/abapify/adt-cli/commit/7c184ed1))
- **adt-mcp:** add 12 new tools for feature parity with vibing-steampunk (#H1-#H8) ([762e9938](https://github.com/abapify/adt-cli/commit/762e9938))
- **adt-mcp:** implement 14 medium-priority MCP tools (#M1-#M10)" ([170a2f68](https://github.com/abapify/adt-cli/commit/170a2f68))
- **adt-mcp:** Wave 1 — Streamable HTTP transport + stateful sessions + multi-system routing ([#110](https://github.com/abapify/adt-cli/issues/110))
- **adt-mcp:** Wave 2 — HTTP auth middleware (bearer + reverse-proxy + CORS) ([caf31a5c](https://github.com/abapify/adt-cli/commit/caf31a5c))
- **adt-mcp:** Wave 1-C — migrate tools to session-aware args + getAdtClientV2Safe ([1d4bb744](https://github.com/abapify/adt-cli/commit/1d4bb744))
- **adt-mcp:** Wave 4 — OAuth 2.1 bearer validation (Okta / Entra ID / Cognito) ([c25374c2](https://github.com/abapify/adt-cli/commit/c25374c2))
- **adt-mcp,adt-cli:** Wave 3 — transactional changesets (MCP + CLI parity) ([abcb5c3e](https://github.com/abapify/adt-cli/commit/abcb5c3e))
- **aunit:** ABAP Unit code coverage — JaCoCo output + CLI/MCP parity ([cbc19f4e](https://github.com/abapify/adt-cli/commit/cbc19f4e))
- **badi:** BAdI CRUD + real-SAP e2e harness — E03 ([dd0f8ff0](https://github.com/abapify/adt-cli/commit/dd0f8ff0))
- **checkin:** checkin via batch lock session — E08 ([027a172d](https://github.com/abapify/adt-cli/commit/027a172d))
- **contracts:** add datapreview, CTS useraction, DDL/DCL, tablesettings ([0eeea082](https://github.com/abapify/adt-cli/commit/0eeea082))
- **flp:** Fiori Launchpad read-only inventory — E14 ([aa8b42b5](https://github.com/abapify/adt-cli/commit/aa8b42b5))
- **function:** FUGR/FUNC CLI + MCP — E02 ([e763d35c](https://github.com/abapify/adt-cli/commit/e763d35c))
- **gcts:** AFF/gCTS format plugin — E06 ([665c16df](https://github.com/abapify/adt-cli/commit/665c16df))
- **gcts:** format.export — complete checkin roundtrip for gCTS — QC2 ([1f2442d8](https://github.com/abapify/adt-cli/commit/1f2442d8))
- **gcts-cli:** gCTS command plugin — E07 ([94583dc1](https://github.com/abapify/adt-cli/commit/94583dc1))
- **incl:** INCL CLI + MCP — E01 ([ffbe4db0](https://github.com/abapify/adt-cli/commit/ffbe4db0))
- **nx-cloud:** setup nx cloud workspace ([97f42b2c](https://github.com/abapify/adt-cli/commit/97f42b2c))
- **openai-codegen:** scaffold abap-ast + openai-codegen packages and openspec change ([b6aa7c89](https://github.com/abapify/adt-cli/commit/b6aa7c89))
- **openai-codegen:** Wave 1 — AST nodes, OAS loader, target profiles ([bc378eaa](https://github.com/abapify/adt-cli/commit/bc378eaa))
- **openai-codegen:** Wave 2 — printer, type emitter, inline cloud runtime ([43bd050f](https://github.com/abapify/adt-cli/commit/43bd050f))
- **openai-codegen:** Wave 3 — emitter, security, formats, CLI + petstore3 ([ffb2d4b5](https://github.com/abapify/adt-cli/commit/ffb2d4b5))
- **openai-codegen:** Wave 4 — split exception into global class, fix activation on Steampunk, live deploy proof ([ec6489ac](https://github.com/abapify/adt-cli/commit/ec6489ac))
- **openai-codegen:** scaffold abap-ast + openai-codegen packages and openspec change ([cacd75ba](https://github.com/abapify/adt-cli/commit/cacd75ba))
- **openai-codegen:** Wave 1 — AST nodes, OAS loader, target profiles ([ff040a46](https://github.com/abapify/adt-cli/commit/ff040a46))
- **openai-codegen:** Wave 2 — printer, type emitter, inline cloud runtime ([dec6857d](https://github.com/abapify/adt-cli/commit/dec6857d))
- **openai-codegen:** Wave 3 — emitter, security, formats, CLI + petstore3 ([b06c7022](https://github.com/abapify/adt-cli/commit/b06c7022))
- **openai-codegen:** Wave 4 — split exception into global class, fix activation on Steampunk, live deploy proof ([bb7ce303](https://github.com/abapify/adt-cli/commit/bb7ce303))
- **openai-codegen:** deterministic OpenAPI → ABAP client codegen ([00ed7120](https://github.com/abapify/adt-cli/commit/00ed7120))
- **openai-codegen:** Wave 1 v2 — AST ABAPDoc, naming+CLI, 4 emitters + templates ([ef71f004](https://github.com/abapify/adt-cli/commit/ef71f004))
- **openai-codegen:** Wave 2 v2 — impl class, INTF+locals format, generate.ts pipeline ([bdb8ba68](https://github.com/abapify/adt-cli/commit/bdb8ba68))
- **openai-codegen:** table query params + HTTP exception wrapping ([606ede32](https://github.com/abapify/adt-cli/commit/606ede32))
- **parity:** 15 new MCP tools + CLI↔MCP e2e test harness ([457c3cc5](https://github.com/abapify/adt-cli/commit/457c3cc5))
- **plugin:** FormatPlugin API foundation — E05 ([a4e6eeef](https://github.com/abapify/adt-cli/commit/a4e6eeef))
- **rap:** BDEF (Behavior Definition) CRUD — E10 ([af89d726](https://github.com/abapify/adt-cli/commit/af89d726))
- **rap:** SRVD (Service Definition) CRUD — E11 ([0c3cb7e1](https://github.com/abapify/adt-cli/commit/0c3cb7e1))
- **rap:** SRVB (Service Binding) CRUD + publish/unpublish — E12 ([f8b6c3ce](https://github.com/abapify/adt-cli/commit/f8b6c3ce))
- **real-e2e:** TRL backfill sweep + WB where-used 2-step POST fix ([13e777da](https://github.com/abapify/adt-cli/commit/13e777da))
- **rfc:** SOAP-over-HTTP RFC transport + adt rfc command — E13 ([45487cc4](https://github.com/abapify/adt-cli/commit/45487cc4))
- **strust:** STRUST PSE/cert CLI + MCP — E04 ([7a4ed04f](https://github.com/abapify/adt-cli/commit/7a4ed04f))
- **wb:** workbench CLI + real-e2e uncovers MCP endpoint bugs — E15 ([f2d73d4b](https://github.com/abapify/adt-cli/commit/f2d73d4b))

### 🩹 Fixes

- apply CodeRabbit auto-fixes ([5554994b](https://github.com/abapify/adt-cli/commit/5554994b))
- add comment explaining DEVC case-preservation in URI resolution ([6e97dbb8](https://github.com/abapify/adt-cli/commit/6e97dbb8))
- replace manual XML building and fast-xml-parser with schema-based contracts ([c91f3745](https://github.com/abapify/adt-cli/commit/c91f3745))
- address all PR #99 review findings ([#99](https://github.com/abapify/adt-cli/issues/99), [#5](https://github.com/abapify/adt-cli/issues/5))
- resolve all pre-existing typecheck + test failures — QC1 ([81152316](https://github.com/abapify/adt-cli/commit/81152316))
- drop CDATA branch from TAG_RE in adt-rfc — CodeQL final ([708ca6c4](https://github.com/abapify/adt-cli/commit/708ca6c4))
- replace TAG_RE loop with split-based tokenizer — CodeQL final ([c32db2ed](https://github.com/abapify/adt-cli/commit/c32db2ed))
- broaden Z-prefix regex, mark test class in abapGit metadata ([6ae8fa61](https://github.com/abapify/adt-cli/commit/6ae8fa61))
- **adt-cli:** harden user command JSON mode and input validation ([f1d980de](https://github.com/abapify/adt-cli/commit/f1d980de))
- **adt-mcp:** extract resolveObjectUri helper to eliminate code duplication ([99d4d0cd](https://github.com/abapify/adt-cli/commit/99d4d0cd))
- **adt-mcp:** also deduplicate activate-object loop; improve QuickSearchClient JSDoc ([a63a4a4a](https://github.com/abapify/adt-cli/commit/a63a4a4a))
- **adt-mcp:** fix missing closing parenthesis in get-table-contents schema description ([d7f8b4c9](https://github.com/abapify/adt-cli/commit/d7f8b4c9))
- **adt-mcp:** format all new tool files + fix mock server route ordering ([2818f49e](https://github.com/abapify/adt-cli/commit/2818f49e))
- **adt-mcp:** resolve SonarQube quality gate failures ([0c6d97c3](https://github.com/abapify/adt-cli/commit/0c6d97c3))
- **adt-mcp:** address SonarCloud blockers in PR 101 ([a001dede](https://github.com/abapify/adt-cli/commit/a001dede))
- **adt-mcp:** address post-merge PR 101 review findings ([#101](https://github.com/abapify/adt-cli/issues/101))
- **adt-mcp:** lint — preserve cause + no-fallthrough on --help case ([#110](https://github.com/abapify/adt-cli/issues/110))
- **adt-mcp:** ReDoS in Bearer extraction (CodeQL finding) ([#110](https://github.com/abapify/adt-cli/issues/110))
- **adt-mcp:** SonarCloud quality gate — reduce duplication + fix dead-code CORS branch + Dockerfile hardening ([de6c1ccf](https://github.com/abapify/adt-cli/commit/de6c1ccf))
- **adt-mcp:** address Devin Review findings ([684d5d1c](https://github.com/abapify/adt-cli/commit/684d5d1c))
- **adt-mcp:** address review findings (Devin + Copilot) ([49e25a2c](https://github.com/abapify/adt-cli/commit/49e25a2c))
- **adt-mcp:** merge tool-call credentials in resolveClient path 3 (Devin finding) ([75a7d211](https://github.com/abapify/adt-cli/commit/75a7d211))
- **adt-mcp:** don't leak locks on force=true rollback failure + docs match code (Devin findings) ([8c2f1334](https://github.com/abapify/adt-cli/commit/8c2f1334))
- **adt-mcp:** reject systemId mismatch in sap_connect + async resolveClient (Devin findings) ([b8373868](https://github.com/abapify/adt-cli/commit/b8373868))
- **ci:** resolve CodeQL ReDoS + code-quality findings, fix main CI ([b4bfebc6](https://github.com/abapify/adt-cli/commit/b4bfebc6))
- **ci:** restore ADT coverage contract files swallowed by .gitignore ([cd6c5d56](https://github.com/abapify/adt-cli/commit/cd6c5d56))
- **ci:** adt-cli tests depend on adt-mcp:build (harness imports it) ([faa86972](https://github.com/abapify/adt-cli/commit/faa86972))
- **ci:** use bun run wrappers in website nx targets (docusaurus binary resolution) ([5f27db13](https://github.com/abapify/adt-cli/commit/5f27db13))
- **ci:** add website to workspaces + use bunx in scripts for binary resolution ([c5c528bb](https://github.com/abapify/adt-cli/commit/c5c528bb))
- **docker:** explicit chmod a-w to satisfy SonarCloud docker:S6504 ([d3d61c13](https://github.com/abapify/adt-cli/commit/d3d61c13))
- **docker:** use root:root owner + 755/644 for COPY (Sonar S6504 compliant) ([d910fd5f](https://github.com/abapify/adt-cli/commit/d910fd5f))
- **openai-codegen:** emit ABAP_LANGUAGE_VERSION=5 + verify live deploy on TRL ([0441dbae](https://github.com/abapify/adt-cli/commit/0441dbae))
- **openai-codegen:** server prefix, client cleanup, configurable json class, default-is-success ordering ([#109](https://github.com/abapify/adt-cli/issues/109))
- **openai-codegen,abap-ast:** Steampunk activation fixes ([b1bb602e](https://github.com/abapify/adt-cli/commit/b1bb602e))
- **openai-codegen,abap-ast:** address PR #109 review feedback + CI ([#109](https://github.com/abapify/adt-cli/issues/109))
- **openai-codegen,abap-ast:** more PR #109 review fixes ([#109](https://github.com/abapify/adt-cli/issues/109))
- **pr-103:** address review comments — type safety, parity, harness, policy ([#103](https://github.com/abapify/adt-cli/issues/103))
- **security:** replace regex XML parsing with @xmldom/xmldom — CodeQL + Sonar ([c72533af](https://github.com/abapify/adt-cli/commit/c72533af))
- **security:** resolve all remaining CodeQL alerts with source-level fixes ([734713bc](https://github.com/abapify/adt-cli/commit/734713bc))
- **security:** resolve remaining SonarCloud hotspots + reliability bugs ([f860bddb](https://github.com/abapify/adt-cli/commit/f860bddb))
- **security:** 6 more .sort() comparators — SonarCloud S2871 ([646dbe47](https://github.com/abapify/adt-cli/commit/646dbe47))
- **security:** replace hardcoded mock password with randomBytes — S2068 ([d5031bc8](https://github.com/abapify/adt-cli/commit/d5031bc8))

### ❤️ Thank You

- CodeRabbit
- Codex @oai-codex
- Devin @devin-ai-integration[bot]
- Petr Plenkov
- ThePlenkov @ThePlenkov

## 0.2.0 (2026-04-02)

### 🚀 Features

- add PROG (Program) and FUGR (Function Group) ABAP object type support ([d3ebf34](https://github.com/abapify/adt-cli/commit/d3ebf34))
- enhance service key authentication and add redirect URI support ([4e2276f](https://github.com/abapify/adt-cli/commit/4e2276f))
- fix ADT export XML serialization and live-test on BTP + on-prem ([dbe608b](https://github.com/abapify/adt-cli/commit/dbe608b))
- optimize export by skipping unchanged sources and auto-creating packages ([172d91c](https://github.com/abapify/adt-cli/commit/172d91c))
- move single-source save lifecycle to base class and add default unchanged detection ([b6f58a5](https://github.com/abapify/adt-cli/commit/b6f58a5))
- add nx format:write pre-commit instruction to GitHub Copilot config ([185db86](https://github.com/abapify/adt-cli/commit/185db86))
- add @fission-ai/openspec dependency for spec management ([f185730](https://github.com/abapify/adt-cli/commit/f185730))
- remove OAT format everywhere, make abapgit the default ([4596efd](https://github.com/abapify/adt-cli/commit/4596efd))
- abapGit roundtrip - export, deploy, and structure support ([0da189a](https://github.com/abapify/adt-cli/commit/0da189a))
- add adt diff command and fix CDS-to-abapGit serialization ([130168d](https://github.com/abapify/adt-cli/commit/130168d))
- resolve DDIC metadata via ADT for zero-diff TABL serialization ([a8198fa](https://github.com/abapify/adt-cli/commit/a8198fa))
- **adk:** add FunctionModule support with POST-then-PUT save flow, fix ETag refresh after metadata PUT ([5db28a6](https://github.com/abapify/adt-cli/commit/5db28a6))
- **adk:** improve FUNC save reliability — skip POST if exists, compare function body only, add DEVC skeleton ([b9469e0](https://github.com/abapify/adt-cli/commit/b9469e0))
- **adk:** add metadata-only unchanged detection, fix bulk save progress counter ([ee2f4dc](https://github.com/abapify/adt-cli/commit/ee2f4dc))
- **adk,adt-cli:** add FUGR name normalization, lock handle persistence, and root URI extraction ([ee2c300](https://github.com/abapify/adt-cli/commit/ee2c300))
- **adk,adt-cli:** centralize lock operations in LockService, add force-unlock, remove duplicate lock logic ([66da454](https://github.com/abapify/adt-cli/commit/66da454))
- **adk,adt-cli:** fix ETag invalidation after lock acquisition, improve DEVC subpackage filtering, add --objects to package get ([979aad9](https://github.com/abapify/adt-cli/commit/979aad9))
- **adt-auth:** add port retry logic for OAuth callback server, fix refresh logging ([cef30df](https://github.com/abapify/adt-cli/commit/cef30df))
- **adt-contracts:** split Accept vs Content-Type headers in crud() ([f16f525](https://github.com/abapify/adt-cli/commit/f16f525))
- **adt-diff:** add --format ddl option and fix CDS DDL generation ([5ba5e65](https://github.com/abapify/adt-cli/commit/5ba5e65))
- **adt-diff:** support multi-file and glob patterns in diff command ([c0c3128](https://github.com/abapify/adt-cli/commit/c0c3128))
- **adt-diff:** rename --format to --source, add annotation filtering for CDS comparison ([07a59da](https://github.com/abapify/adt-cli/commit/07a59da))
- **adt-diff:** add --raw mode, fix abapLanguageVersion auth issue, defer CLAS include saves ([e0b4c04](https://github.com/abapify/adt-cli/commit/e0b4c04))
- **adt-export:** remove full-repo scan fallback, add package validation and cascade skip logic ([e6fe28b](https://github.com/abapify/adt-cli/commit/e6fe28b))
- **cds-to-abapgit:** detect LANGDEP from spras/lang fields in CDS ([ff711e8](https://github.com/abapify/adt-cli/commit/ff711e8))
- **ddic:** add abapGit handlers for TABL and TTYP object types ([41b6a4b](https://github.com/abapify/adt-cli/commit/41b6a4b))

### 🩹 Fixes

- remove package-lock.json and switch nx to use bun as package manager ([44b7ff9](https://github.com/abapify/adt-cli/commit/44b7ff9))
- restore package-lock.json, revert packageManager to npm, add legacy-peer-deps ([1bbf03d](https://github.com/abapify/adt-cli/commit/1bbf03d))
- correct .gitignore corruption and add FUGR fromAbapGit comment ([cbb35d4](https://github.com/abapify/adt-cli/commit/cbb35d4))
- update fast-xml-parser dependency to version 5.5.3 ([7e0b6d6](https://github.com/abapify/adt-cli/commit/7e0b6d6))
- preserve targetNamespace xmlns in stripUnusedNamespaces + null guard in config-loader ([caad1a5](https://github.com/abapify/adt-cli/commit/caad1a5))
- address all SonarQube findings for PR #81 ([#81](https://github.com/abapify/adt-cli/issues/81))
- exclude generated schema files from SonarQube analysis to fix quality gate ([014ad88](https://github.com/abapify/adt-cli/commit/014ad88))
- add SonarCloud organization and project key to sonar-project.properties ([394c670](https://github.com/abapify/adt-cli/commit/394c670))
- resolve SonarCloud quality gate failures ([e8cfed9](https://github.com/abapify/adt-cli/commit/e8cfed9))
- address remaining SonarQube findings - complexity, duplication, and code quality ([11a3408](https://github.com/abapify/adt-cli/commit/11a3408))
- update sonar-project.properties with exclusions and project key ([dc374f8](https://github.com/abapify/adt-cli/commit/dc374f8))
- use [^<]+ in XML tag regexes to require non-empty content ([b459ea7](https://github.com/abapify/adt-cli/commit/b459ea7))
- simplify sonar exclusions to **/generated/** ([ecc42c5](https://github.com/abapify/adt-cli/commit/ecc42c5))
- simplify sonar exclusions to **/generated/** ([2c2dad3](https://github.com/abapify/adt-cli/commit/2c2dad3))
- remove trailing blank lines from sonar-project.properties ([56b8e5e](https://github.com/abapify/adt-cli/commit/56b8e5e))
- run nx format:write to fix formatting on OpenSpec files ([5c9fcb1](https://github.com/abapify/adt-cli/commit/5c9fcb1))
- resolve merge conflict and fix SonarQube duplication findings ([f1edc75](https://github.com/abapify/adt-cli/commit/f1edc75))
- resolve SonarQube quality gate failures (security hotspot + duplication) ([12bd3b8](https://github.com/abapify/adt-cli/commit/12bd3b8))
- address Copilot and Devin review findings ([a6c4707](https://github.com/abapify/adt-cli/commit/a6c4707))
- **abapgit:** align dd02v and dd03p field order ([d7578d3](https://github.com/abapify/adt-cli/commit/d7578d3))
- **adk:** robust upsert fallback for DDIC objects (405/422 handling) ([ac0d580](https://github.com/abapify/adt-cli/commit/ac0d580))
- **adk:** address PR review findings - reset \_unchanged, deduplicate fallback, case-insensitive error matching ([2816dd4](https://github.com/abapify/adt-cli/commit/2816dd4))
- **adk:** remove false from isEmpty in checkMetadataUnchanged ([7b3bbeb](https://github.com/abapify/adt-cli/commit/7b3bbeb))
- **adt-diff:** use .acds extension for CDS DDL diff display ([b1357ac](https://github.com/abapify/adt-cli/commit/b1357ac))
- **adt-diff:** align zage_tabl test expectations with fixture ([591ea22](https://github.com/abapify/adt-cli/commit/591ea22))
- **adt-export:** convert static import of lazy-loaded library to dynamic import ([a5ded59](https://github.com/abapify/adt-cli/commit/a5ded59))
- **cds-to-abapgit:** stop emitting LANGDEP, CLIDEP, POSITION from CDS source ([0d06b3c](https://github.com/abapify/adt-cli/commit/0d06b3c))
- **cds-to-abapgit:** correct DD03P field ordering to match SAP ([20a4ac7](https://github.com/abapify/adt-cli/commit/20a4ac7))
- **cds-to-abapgit:** detect CLIDEP for client-dependent tables ([50e1200](https://github.com/abapify/adt-cli/commit/50e1200))

### ❤️ Thank You

- Devin @devin-ai-integration[bot]
- Petr Plenkov
- ThePlenkov @ThePlenkov

## 0.1.8 (2026-03-11)

### 🚀 Features

- add granular publish inputs to release workflow ([95a890c](https://github.com/abapify/adt-cli/commit/95a890c))
- add latest Docker tag when publishing releases ([8eb4cf1](https://github.com/abapify/adt-cli/commit/8eb4cf1))
- add Copilot hooks to auto-approve waiting workflow runs ([10245a6](https://github.com/abapify/adt-cli/commit/10245a6))
- log all tool calls to JSON via postToolUse hook, print on sessionEnd ([1902d5f](https://github.com/abapify/adt-cli/commit/1902d5f))
- add --service-key CLI option, Bearer token support, and CI e2e auth test ([9f6710a](https://github.com/abapify/adt-cli/commit/9f6710a))
- **adt-auth:** add service-key auth plugin and env resolver ([6bdb0c8](https://github.com/abapify/adt-cli/commit/6bdb0c8))
- **adt-mcp:** implement MCP server package with tools and mock backend ([f625d32](https://github.com/abapify/adt-cli/commit/f625d32))
- **adt-mcp:** add adt-mcp package from PR #59, resolving conflicts with main ([#59](https://github.com/abapify/adt-cli/issues/59))
- **nx-cloud:** setup nx cloud workspace ([4a29f8a](https://github.com/abapify/adt-cli/commit/4a29f8a))
- **nx-cloud:** setup nx cloud workspace ([63f92c9](https://github.com/abapify/adt-cli/commit/63f92c9))
- **nx-cloud:** setup nx cloud workspace ([64881ab](https://github.com/abapify/adt-cli/commit/64881ab))

### 🩹 Fixes

- correct @abapify/speci/client doc reference to use /rest subpath ([6076db7](https://github.com/abapify/adt-cli/commit/6076db7))
- address all Qodo review comments from today's PRs (#44-#49) ([#44](https://github.com/abapify/adt-cli/issues/44), [#49](https://github.com/abapify/adt-cli/issues/49), [#48](https://github.com/abapify/adt-cli/issues/48), [#47](https://github.com/abapify/adt-cli/issues/47), [#46](https://github.com/abapify/adt-cli/issues/46), [#45](https://github.com/abapify/adt-cli/issues/45))
- add missing tsdown.config.ts to Docker build context ([a3b62a1](https://github.com/abapify/adt-cli/commit/a3b62a1))
- add tsdown.config.ts to Dockerfile COPY command to fix Docker build ([5fcffca](https://github.com/abapify/adt-cli/commit/5fcffca))
- exclude root abapify project from Docker build ([3b92804](https://github.com/abapify/adt-cli/commit/3b92804))
- add build step before publish to include dist/ in packages ([a401f5c](https://github.com/abapify/adt-cli/commit/a401f5c))
- remove build target from root abapify project.json ([919fe89](https://github.com/abapify/adt-cli/commit/919fe89))
- exclude workspace root tsdown.config.ts from nx-tsdown plugin ([d57a8bd](https://github.com/abapify/adt-cli/commit/d57a8bd))
- add missing zod dependency to adt-schemas and ts-xsd, bump to 0.1.9 ([9c23f17](https://github.com/abapify/adt-cli/commit/9c23f17))
- add missing ts-morph and adk deps, bump to 0.1.10 ([513bcb9](https://github.com/abapify/adt-cli/commit/513bcb9))
- correct husky hook path in git-commit skill (core.hooksPath = .husky/\_) ([bfcd9e8](https://github.com/abapify/adt-cli/commit/bfcd9e8))
- remove adt-client↔adk circular dep; add nx-ci pre-commit skill ([6d2075d](https://github.com/abapify/adt-cli/commit/6d2075d))
- checkout PR head in CI to avoid 3-way merge re-introducing circular dep ([0b35753](https://github.com/abapify/adt-cli/commit/0b35753))
- remove @abapify/adk from adt-client deps (circular dep, re-added by merge commit) ([87f267d](https://github.com/abapify/adt-cli/commit/87f267d))
- run lint/test/build in pre-commit hook (same as CI) ([c685732](https://github.com/abapify/adt-cli/commit/c685732))
- remove @abapify/adk from adt-client deps (circular dep, re-added by merge commit) ([550a1d1](https://github.com/abapify/adt-cli/commit/550a1d1))
- checkout PR head in CI to avoid 3-way merge re-introducing circular dep ([083897d](https://github.com/abapify/adt-cli/commit/083897d))
- exclude workspace root tsdown.config.ts from nx-tsdown plugin ([96fbec3](https://github.com/abapify/adt-cli/commit/96fbec3))
- add adt bin symlinks in Docker image ([21aa590](https://github.com/abapify/adt-cli/commit/21aa590))
- Docker image - fix adt bin symlink paths and CMD ([47f983c](https://github.com/abapify/adt-cli/commit/47f983c))
- update devcontainer features configuration ([dcbf9bd](https://github.com/abapify/adt-cli/commit/dcbf9bd))
- update base image to latest TypeScript Node version ([45a2c14](https://github.com/abapify/adt-cli/commit/45a2c14))
- query action_required status in approve-workflows.sh hook script ([d40d3b5](https://github.com/abapify/adt-cli/commit/d40d3b5))
- add copilot/\*\* push trigger to ci.yml and improve hook to check both approval statuses ([b2c4f5e](https://github.com/abapify/adt-cli/commit/b2c4f5e))
- add auto-approve workflow for Copilot CI runs and improve hook coverage ([3eeedf6](https://github.com/abapify/adt-cli/commit/3eeedf6))
- use schedule trigger in auto-approve-copilot-ci.yml to break approval deadlock ([1ce442a](https://github.com/abapify/adt-cli/commit/1ce442a))
- add copilot/\*\* push trigger to ci.yml so CI runs without approval ([d858434](https://github.com/abapify/adt-cli/commit/d858434))
- retry workflow approval after report_progress (push) tool call ([a929799](https://github.com/abapify/adt-cli/commit/a929799))
- test-hooks.sh approve-workflows tests failing in CI (detached HEAD + PATH bug) ([1d86678](https://github.com/abapify/adt-cli/commit/1d86678))
- readServiceKey only accepts file paths; clear error when raw JSON passed ([664d857](https://github.com/abapify/adt-cli/commit/664d857))
- --service-key must point to a file path, not raw JSON ([d72de44](https://github.com/abapify/adt-cli/commit/d72de44))
- remove inlinedDependencies and alwaysBundle from adt-cli tsdown config ([f276b10](https://github.com/abapify/adt-cli/commit/f276b10))
- restore package-lock.json tracking, switch CI to npm ci to fix eslint external dep resolution ([f7de5a7](https://github.com/abapify/adt-cli/commit/f7de5a7))
- release workflow always checks out and commits to main branch ([e3b57e7](https://github.com/abapify/adt-cli/commit/e3b57e7))
- **adt-mcp:** resolve SonarQube E Security Rating findings ([5ab60c3](https://github.com/abapify/adt-cli/commit/5ab60c3))
- **adt-mcp:** resolve all SonarQube issues blocking PR #59 quality gate ([#59](https://github.com/abapify/adt-cli/issues/59))
- **adt-mcp:** resolve remaining SonarQube issues ([e172e72](https://github.com/abapify/adt-cli/commit/e172e72))
- **adt-mcp:** apply PR review feedback - not-yet-impl errors, semver deps, mock, docs ([e2e274d](https://github.com/abapify/adt-cli/commit/e2e274d))
- **ci:** restore ci.yml (bun install), set nx.json cli.packageManager=npm to fix eslint dep resolution ([c7b1ce8](https://github.com/abapify/adt-cli/commit/c7b1ce8))
- **docker:** disable nx daemon/TUI and reduce parallelism to fix exit code 130 ([53a4df3](https://github.com/abapify/adt-cli/commit/53a4df3))
- **lint:** fix 3 CI failures: ts-xsd lint, adt-cli lazy-load error, adt-contracts test header ([c7b856c](https://github.com/abapify/adt-cli/commit/c7b856c))
- **sonarqube:** fix code quality issues from PR #76 ([#76](https://github.com/abapify/adt-cli/issues/76))
- **ts-xsd:** fix NamedNodeMap/NodeList iteration and resolve bugs ([1d4a5dd](https://github.com/abapify/adt-cli/commit/1d4a5dd))

### ❤️ Thank You

- Claude
- Petr Plenkov
- ThePlenkov @ThePlenkov

## 0.1.7 (2026-03-02)

### 🚀 Features

- add GitHub Packages publish workflow ([94f75e3](https://github.com/abapify/adt-cli/commit/94f75e3))
- move all packages to @abapify namespace for GitHub Registry publishing ([e54b934](https://github.com/abapify/adt-cli/commit/e54b934))

### 🩹 Fixes

- use github.ref_name as fallback in Resolve ref step ([ed8d8b9](https://github.com/abapify/adt-cli/commit/ed8d8b9))
- simplify ref resolution and update version input descriptions ([c2fa443](https://github.com/abapify/adt-cli/commit/c2fa443))
- remove version input from workflow_dispatch - use built-in branch/tag selector ([b2aa7d7](https://github.com/abapify/adt-cli/commit/b2aa7d7))
- remove scope restriction in publish-gpr workflow so unscoped packages go to GitHub Packages ([b85984e](https://github.com/abapify/adt-cli/commit/b85984e))

### ❤️ Thank You

- ThePlenkov @ThePlenkov

## 0.1.6 (2026-03-02)

### 🚀 Features

- make publish workflow version input optional, default to latest release tag ([c11fa28](https://github.com/abapify/adt-cli/commit/c11fa28))
- add Docker image CI workflow and Dockerfile ([8f3f970](https://github.com/abapify/adt-cli/commit/8f3f970))
- add Bun standalone executable support with all plugins bundled ([62c53a9](https://github.com/abapify/adt-cli/commit/62c53a9))

### 🩹 Fixes

- separate release and publish pipelines; mark adt-fixtures as private ([0836c32](https://github.com/abapify/adt-cli/commit/0836c32))
- add configVersion to bun.lock ([92a5f1f](https://github.com/abapify/adt-cli/commit/92a5f1f))
- remove redundant test dependency from nx-release-publish ([6f0b8c8](https://github.com/abapify/adt-cli/commit/6f0b8c8))
- update tsdown configuration to use deps for bundling options ([56ef0e7](https://github.com/abapify/adt-cli/commit/56ef0e7))
- update nxCloudId and rename nx-release-publish target ([96066fd](https://github.com/abapify/adt-cli/commit/96066fd))
- remove unnecessary type assertion from tsdown configuration ([0268f3a](https://github.com/abapify/adt-cli/commit/0268f3a))
- remove unused UserConfig import from tsdown configuration ([30a2d2e](https://github.com/abapify/adt-cli/commit/30a2d2e))
- restrict Docker image builds to releases only ([0cee55a](https://github.com/abapify/adt-cli/commit/0cee55a))
- update nxCloudId and ensure nx-cloud fix-ci runs always ([b1b7561](https://github.com/abapify/adt-cli/commit/b1b7561))

### ❤️ Thank You

- Petr Plenkov
- ThePlenkov @ThePlenkov

## 0.1.5 (2026-02-28)

### 🩹 Fixes

- **release:** use NPM_CONFIG_TOKEN for bun publish authentication ([e014da2](https://github.com/abapify/adt-cli/commit/e014da2))

### ❤️ Thank You

- ThePlenkov @ThePlenkov

## 0.1.4 (2026-02-28)

### 🩹 Fixes

- **release:** add BUN_AUTH_TOKEN for bun publish authentication ([fa6657d](https://github.com/abapify/adt-cli/commit/fa6657d))

### ❤️ Thank You

- ThePlenkov @ThePlenkov

## 0.1.3 (2026-02-28)

### 🩹 Fixes

- **asjson-parser:** migrate from @nx/rollup to tsdown, drop nx@21 dep ([016cff4](https://github.com/abapify/adt-cli/commit/016cff4))
- **asjson-parser:** add tsconfig: 'tsconfig.lib.json' to tsdown config to avoid references error ([5290dd6](https://github.com/abapify/adt-cli/commit/5290dd6))
- **release:** publish packages directly in release workflow, remove dead publish.yml ([d6d8307](https://github.com/abapify/adt-cli/commit/d6d8307))

### ❤️ Thank You

- Claude

## 0.1.2 (2026-02-28)

### 🚀 Features

- add @abapify/btp-service-key-parser package with service key parsing and validation ([8113699](https://github.com/abapify/adt-cli/commit/8113699))
- implement OAuth token fetching and validation with comprehensive tests ([81eb612](https://github.com/abapify/adt-cli/commit/81eb612))
- Enhance BTP service key parser with OAuth token fetching and CLI tool ([c534255](https://github.com/abapify/adt-cli/commit/c534255))
- Implement OAuth 2.0 PKCE authentication flow for ADT CLI ([0504784](https://github.com/abapify/adt-cli/commit/0504784))
- Add discovery XML parsing and output options to ADT CLI ([590ee90](https://github.com/abapify/adt-cli/commit/590ee90))
- remove legacy ADT authentication test scripts ([1053e79](https://github.com/abapify/adt-cli/commit/1053e79))
- update ADT CLI documentation and enhance settings for vitest ([de50d4f](https://github.com/abapify/adt-cli/commit/de50d4f))
- enhance authentication flow with automatic token refresh and add refresh_token to OAuthToken ([746db44](https://github.com/abapify/adt-cli/commit/746db44))
- implement transport management and discovery services with comprehensive command support ([2392b48](https://github.com/abapify/adt-cli/commit/2392b48))
- enhance transport list command with full ADT protocol support and debug mode ([4d0ae84](https://github.com/abapify/adt-cli/commit/4d0ae84))
- add transport get command for detailed transport and task information ([d2f4e9e](https://github.com/abapify/adt-cli/commit/d2f4e9e))
- implement transport creation command with CSRF protection and session handling ([ec87264](https://github.com/abapify/adt-cli/commit/ec87264))
- enhance authentication and user detection for improved session management ([6fecd95](https://github.com/abapify/adt-cli/commit/6fecd95))
- improve authentication success feedback and server closure ([de77a00](https://github.com/abapify/adt-cli/commit/de77a00))
- add search and import commands for ABAP objects ([5a8e757](https://github.com/abapify/adt-cli/commit/5a8e757))
- refactor CLI command structure for improved modularity ([7f19808](https://github.com/abapify/adt-cli/commit/7f19808))
- enhance abapGit format with disclaimer and update import command help ([d278034](https://github.com/abapify/adt-cli/commit/d278034))
- enhance import command and ADT client for improved performance and error handling ([1074607](https://github.com/abapify/adt-cli/commit/1074607))
- improve ATC polling with progress and completeness checks ([3f9e441](https://github.com/abapify/adt-cli/commit/3f9e441))
- add support for GitLab and SARIF output formats to ATC command ([9e4a858](https://github.com/abapify/adt-cli/commit/9e4a858))
- enhance OAT format with detailed structure, metadata schema, and integration documentation ([0a580fc](https://github.com/abapify/adt-cli/commit/0a580fc))
- standardize OAT directory structure to lowercase for consistency ([2b6643b](https://github.com/abapify/adt-cli/commit/2b6643b))
- implement package-based directory structure and enhance config handling for OAT format ([5af72f9](https://github.com/abapify/adt-cli/commit/5af72f9))
- add petstore e2e example with interface and tests ([a2093f2](https://github.com/abapify/adt-cli/commit/a2093f2))
- mount git and ssh configs into devcontainer for auth persistence ([a590d07](https://github.com/abapify/adt-cli/commit/a590d07))
- add transport import functionality to ADT CLI with specification-driven development docs ([4d0023d](https://github.com/abapify/adt-cli/commit/4d0023d))
- add codeium config mount to devcontainer for persistent AI settings ([76226a2](https://github.com/abapify/adt-cli/commit/76226a2))
- implement transport object extraction from ADT API endpoint ([aeb6a28](https://github.com/abapify/adt-cli/commit/aeb6a28))
- enhance transport get command with tree-style task and object display ([c9bd4ce](https://github.com/abapify/adt-cli/commit/c9bd4ce))
- add uv package manager to devcontainer for Python dependencies ([c1eaa3d](https://github.com/abapify/adt-cli/commit/c1eaa3d))
- remove cds2abap and btp-service-key-parser packages ([c4988be](https://github.com/abapify/adt-cli/commit/c4988be))
- enhance README with AI development guidelines and project structure ([70d1019](https://github.com/abapify/adt-cli/commit/70d1019))
- add parallel flag to affected tasks in CI ([406e0d9](https://github.com/abapify/adt-cli/commit/406e0d9))
- update adk package and nx target defaults ([ef0199d](https://github.com/abapify/adt-cli/commit/ef0199d))
- Implement decorator-based XML composition system for ADK ([45b9547](https://github.com/abapify/adt-cli/commit/45b9547))
- add inheritance support to xmld with metadata merging and build system updates ([089abe9](https://github.com/abapify/adt-cli/commit/089abe9))
- add @attributes convenience decorator for XML attribute flattening ([ffe07c2](https://github.com/abapify/adt-cli/commit/ffe07c2))
- Implement deploy and lock/unlock commands for SAP ADT objects ([389baac](https://github.com/abapify/adt-cli/commit/389baac))
- Enhance ADT client with object locking and session management features ([2484f8f](https://github.com/abapify/adt-cli/commit/2484f8f))
- add container name to devcontainer configuration for abapify-js ([1c5a69b](https://github.com/abapify/adt-cli/commit/1c5a69b))
- add docker-mcp plugin and disable moby in devcontainer setup ([b989eba](https://github.com/abapify/adt-cli/commit/b989eba))
- Add Basic Authentication support for on-premise SAP systems ([#8](https://github.com/abapify/adt-cli/pull/8))
- add XML/XSLT processing and JSON validation dependencies ([57a7074](https://github.com/abapify/adt-cli/commit/57a7074))
- reorganize schemas to generated folder and enhance XSD codegen ([feb3c97](https://github.com/abapify/adt-cli/commit/feb3c97))
- decommission old transport commands, add cts tr commands, adt-tui package ([f84a58a](https://github.com/abapify/adt-cli/commit/f84a58a))
- **adk:** enhance ADK package with class and interface support, update dependencies and build process ([75777b9](https://github.com/abapify/adt-cli/commit/75777b9))
- **adk:** implement ADT XML parsing for ABAP objects ([c26a781](https://github.com/abapify/adt-cli/commit/c26a781))
- **adk:** implement ADK architecture alignment with lazy loading [FSINN-1667] ([b3a52fa](https://github.com/abapify/adt-cli/commit/b3a52fa))
- **adt-cli:** add ADT XML export option to get command ([9ec3e2b](https://github.com/abapify/adt-cli/commit/9ec3e2b))
- **adt-cli:** add object structure option to get command ([a12dcd5](https://github.com/abapify/adt-cli/commit/a12dcd5))
- **adt-cli:** enhance get command with object structure display for classes ([d318d1a](https://github.com/abapify/adt-cli/commit/d318d1a))
- **adt-cli:** integrate ADK for native ADT XML parsing in CLI ([cae8836](https://github.com/abapify/adt-cli/commit/cae8836))
- **adt-cli:** enhance object inspection with properties and outline commands ([af39c45](https://github.com/abapify/adt-cli/commit/af39c45))
- **adt-cli:** refine get command output and enhance object properties display ([019bd75](https://github.com/abapify/adt-cli/commit/019bd75))
- **adt-cli:** enhance outline command with descriptions and improved element type handling ([fd6dcd1](https://github.com/abapify/adt-cli/commit/fd6dcd1))
- **adt-cli:** add pluggable logger to client helper ([9299007](https://github.com/abapify/adt-cli/commit/9299007))
- **adt-cli:** propagate CLI logger to v2 client via plugin ([d8e75d3](https://github.com/abapify/adt-cli/commit/d8e75d3))
- **adt-cli:** add interactive TUI editor for CTS tree configuration with optimistic locking ([6f2fe76](https://github.com/abapify/adt-cli/commit/6f2fe76))
- **adt-cli:** improve error handling with error codes and stack traces ([188f3d0](https://github.com/abapify/adt-cli/commit/188f3d0))
- **adt-cli:** extract error cause for better network error diagnostics ([bd7e382](https://github.com/abapify/adt-cli/commit/bd7e382))
- **adt-cli:** add --config option for explicit config file ([d8afc63](https://github.com/abapify/adt-cli/commit/d8afc63))
- **adt-cli:** improve error handling with error codes and stack traces ([0a0c7bd](https://github.com/abapify/adt-cli/commit/0a0c7bd))
- **adt-cli:** extract error cause for better network error diagnostics ([16b9d02](https://github.com/abapify/adt-cli/commit/16b9d02))
- **adt-cli:** add --config option for explicit config file ([490c258](https://github.com/abapify/adt-cli/commit/490c258))
- **adt-cli:** add ls command and atc --from-file option ([b6a41bd](https://github.com/abapify/adt-cli/commit/b6a41bd))
- ⚠️ **adt-client-v2:** add pluggable response system and fix XML attribute parsing ([4c53aa5](https://github.com/abapify/adt-cli/commit/4c53aa5))
- **adt-client-v2:** implement repository search contract and migrate CLI command ([5da4d30](https://github.com/abapify/adt-cli/commit/5da4d30))
- **adt-client-v2:** add logger support to client architecture ([b886257](https://github.com/abapify/adt-cli/commit/b886257))
- **adt-codegen:** add endpoint-level method filtering and clean option ([92bba85](https://github.com/abapify/adt-cli/commit/92bba85))
- **adt-config:** implement --config flag support in config loader ([8e88f1a](https://github.com/abapify/adt-cli/commit/8e88f1a))
- **atc:** initial ATC plugin package structure ([ba6b375](https://github.com/abapify/adt-cli/commit/ba6b375))
- **atc:** include method name and raw location in GitLab report ([24c5b0e](https://github.com/abapify/adt-cli/commit/24c5b0e))
- **atc:** plugin-based finding resolver architecture ([22fa06c](https://github.com/abapify/adt-cli/commit/22fa06c))
- **devc:** implement DEVC package support with type inference ([008c179](https://github.com/abapify/adt-cli/commit/008c179))
- **import:** support plugin format options for abapgit folder logic ([3219917](https://github.com/abapify/adt-cli/commit/3219917))
- **nx:** add skills for generating code, managing plugins, running tasks, and exploring workspaces ([87a1506](https://github.com/abapify/adt-cli/commit/87a1506))
- **nx-cloud:** setup nx cloud workspace ([20da8a2](https://github.com/abapify/adt-cli/commit/20da8a2))
- **release:** setup Nx Release publishing with GitHub CI ([14820cb](https://github.com/abapify/adt-cli/commit/14820cb))
- **ts-xsd:** add batch codegen with config file support and CLI improvements ([7ad2c11](https://github.com/abapify/adt-cli/commit/7ad2c11))
- **ts-xsd:** add XSD inheritance support with complexContent/extension parsing ([bc0d7e4](https://github.com/abapify/adt-cli/commit/bc0d7e4))
- **ts-xsd:** add automatic schema discovery and resolution capabilities ([3aa6143](https://github.com/abapify/adt-cli/commit/3aa6143))
- **ts-xsd-core:** add XML namespace support and module exports ([05e9f4a](https://github.com/abapify/adt-cli/commit/05e9f4a))

### 🩹 Fixes

- update @abapify/adt-client dependency to use standard version specifier ([1518585](https://github.com/abapify/adt-cli/commit/1518585))
- format tsconfig.base.json to resolve CI formatting check ([d9d98d8](https://github.com/abapify/adt-cli/commit/d9d98d8))
- remove unnecessary nx-cloud record command from CI workflow ([54a1dcb](https://github.com/abapify/adt-cli/commit/54a1dcb))
- format project.json files to resolve CI format check with NX environment variables ([0520592](https://github.com/abapify/adt-cli/commit/0520592))
- resolve CI pipeline failures ([5004586](https://github.com/abapify/adt-cli/commit/5004586))
- mark optional dependencies as devOptional in package-lock.json ([3545523](https://github.com/abapify/adt-cli/commit/3545523))
- improve browser opening in OAuth flow with BROWSER env var support ([8fd1c99](https://github.com/abapify/adt-cli/commit/8fd1c99))
- use Object.prototype.hasOwnProperty.call and remove tsdown dependency ([d95e913](https://github.com/abapify/adt-cli/commit/d95e913))
- resolve circular dependency by making root abapify build a no-op ([aa67305](https://github.com/abapify/adt-cli/commit/aa67305))
- resolve all ESLint errors causing CI pipeline failures ([94d6ed2](https://github.com/abapify/adt-cli/commit/94d6ed2))
- allow adt-puppeteer test to pass with no test files ([bbaab89](https://github.com/abapify/adt-cli/commit/bbaab89))
- resolve typecheck failures across workspace ([7498729](https://github.com/abapify/adt-cli/commit/7498729))
- **abapgit:** FULL folder logic now includes root package as directory ([d661f09](https://github.com/abapify/adt-cli/commit/d661f09))
- **adk:** resolve TS4041 errors by disabling code splitting in adt-contracts ([beae11c](https://github.com/abapify/adt-cli/commit/beae11c))
- **adk:** resolve TS4041 errors by annotating crudContract return types as any ([0b0c7ee](https://github.com/abapify/adt-cli/commit/0b0c7ee))
- **adt-atc:** add .abap extension to GitLab code quality paths ([94a35a5](https://github.com/abapify/adt-cli/commit/94a35a5))
- **adt-atc:** add .abap extension to GitLab code quality paths ([def4d55](https://github.com/abapify/adt-cli/commit/def4d55))
- **adt-auth:** add missing project.json for Nx configuration ([8672c10](https://github.com/abapify/adt-cli/commit/8672c10))
- **adt-auth:** reference tsconfig.lib.json in tsdown config ([9ee2a8e](https://github.com/abapify/adt-cli/commit/9ee2a8e))
- **adt-auth:** add ./basic export alias ([9e1b524](https://github.com/abapify/adt-cli/commit/9e1b524))
- **adt-auth:** use explicit entry mapping for ./basic export ([d6333c5](https://github.com/abapify/adt-cli/commit/d6333c5))
- **adt-auth:** export basic plugin as default export ([3b0c7b7](https://github.com/abapify/adt-cli/commit/3b0c7b7))
- **adt-auth:** update login to use default export pattern ([10e8951](https://github.com/abapify/adt-cli/commit/10e8951))
- **adt-auth:** export basic plugin from main index ([efa2b7d](https://github.com/abapify/adt-cli/commit/efa2b7d))
- **adt-auth:** add basic export alias in tsdown config ([81e0cf2](https://github.com/abapify/adt-cli/commit/81e0cf2))
- **adt-auth:** add missing project.json for Nx configuration ([3b652c8](https://github.com/abapify/adt-cli/commit/3b652c8))
- **adt-auth:** reference tsconfig.lib.json in tsdown config ([90d5c60](https://github.com/abapify/adt-cli/commit/90d5c60))
- **adt-auth:** add ./basic export alias ([74c57dd](https://github.com/abapify/adt-cli/commit/74c57dd))
- **adt-auth:** use explicit entry mapping for ./basic export ([f5ce552](https://github.com/abapify/adt-cli/commit/f5ce552))
- **adt-auth:** export basic plugin as default export ([3467b70](https://github.com/abapify/adt-cli/commit/3467b70))
- **adt-auth:** update login to use default export pattern ([5b9ad32](https://github.com/abapify/adt-cli/commit/5b9ad32))
- **adt-auth:** export basic plugin from main index ([1c2ac83](https://github.com/abapify/adt-cli/commit/1c2ac83))
- **adt-auth:** add basic export alias in tsdown config ([52c4b76](https://github.com/abapify/adt-cli/commit/52c4b76))
- **adt-cli:** use correct plugin path for basic auth ([f92a2bc](https://github.com/abapify/adt-cli/commit/f92a2bc))
- **adt-cli:** parse --config option from argv before parseAsync ([1873f80](https://github.com/abapify/adt-cli/commit/1873f80))
- **adt-cli:** use correct plugin path for basic auth ([aa8d6b1](https://github.com/abapify/adt-cli/commit/aa8d6b1))
- **adt-cli:** parse --config option from argv before parseAsync ([f8ecd02](https://github.com/abapify/adt-cli/commit/f8ecd02))
- **atc:** extract method name from name= param in ATC location URI ([100f78b](https://github.com/abapify/adt-cli/commit/100f78b))
- **atc:** resolve file paths and convert line numbers in GitLab formatter ([4d97414](https://github.com/abapify/adt-cli/commit/4d97414))
- **atc:** resolve workspace packages from cwd for bundled CLI ([a30168f](https://github.com/abapify/adt-cli/commit/a30168f))
- **atc:** built-in abapgit resolver (no external dep needed) ([e2a3978](https://github.com/abapify/adt-cli/commit/e2a3978))
- **bun.lock:** update lockfile to match workspace package.json files ([382bce7](https://github.com/abapify/adt-cli/commit/382bce7))
- **ci:** update Vault field names to match ADT\_\* convention ([9e33be2](https://github.com/abapify/adt-cli/commit/9e33be2))
- **ci:** correct Vault field names and update agent guidelines ([2b057ce](https://github.com/abapify/adt-cli/commit/2b057ce))
- **ci:** update Vault field names to match ADT\_\* convention ([8d64bc4](https://github.com/abapify/adt-cli/commit/8d64bc4))
- **ci:** correct Vault field names and update agent guidelines ([8eb8374](https://github.com/abapify/adt-cli/commit/8eb8374))
- **ci:** remove --frozen-lockfile to allow bun to update stale lockfile ([a29724f](https://github.com/abapify/adt-cli/commit/a29724f))
- **ci:** fix format and lint errors to unblock CI pipeline ([8be2de2](https://github.com/abapify/adt-cli/commit/8be2de2))
- **ci:** address Qodo review comments on release workflows ([38741ec](https://github.com/abapify/adt-cli/commit/38741ec))
- **deps:** remove unused SAP/CDS dependencies pulling in better-sqlite3 ([d89c832](https://github.com/abapify/adt-cli/commit/d89c832))
- **deps:** remove unused SAP/CDS dependencies pulling in better-sqlite3 ([f898c4b](https://github.com/abapify/adt-cli/commit/f898c4b))
- **release:** resolve nx release config conflict and add first-release flag ([cac26d3](https://github.com/abapify/adt-cli/commit/cac26d3))
- **ts-xsd:** commit W3C XMLSchema.xsd so integration tests pass in CI ([d2a6f7d](https://github.com/abapify/adt-cli/commit/d2a6f7d))

### ⚠️ Breaking Changes

- **adt-client-v2:** add pluggable response system and fix XML attribute parsing ([4c53aa5](https://github.com/abapify/adt-cli/commit/4c53aa5))
  Schema attribute names no longer use @ prefix
  ## Features
  ### Response Plugin System
  - Add ResponsePlugin interface for intercepting HTTP responses
  - Add ResponseContext with raw XML, parsed data, and metadata
  - Implement FileStoragePlugin for saving XML/JSON to files
  - Implement TransformPlugin for custom data transformations
  - Implement LoggingPlugin for request/response logging
  - Integrate plugins into adapter with command-level control
  ### Discovery Command Enhancement
  - Add inline capture plugin to discovery command
  - Support file extension detection (.xml → XML, .json → JSON)
  - Enable command-level plugin configuration
  ## Fixes
  ### ts-xml Attribute Parsing
  - Remove unnecessary @ prefix from attribute names in schemas
  - Simplify parse logic - kind field is sufficient to identify attributes
  - Fix attribute extraction bug that caused empty objects
  ### Schema Type System
  - Add optional field support to all field types
  - Improve type inference for optional fields
  - Clean up schema definitions (remove redundant 'as const')
  ## Changes
  ### adt-client-v2
  - packages/adt-client-v2/src/plugins.ts: New plugin system
  - packages/adt-client-v2/src/adapter.ts: Plugin integration
  - packages/adt-client-v2/src/client.ts: Plugin configuration
  - packages/adt-client-v2/src/index.ts: Export plugin types
  - packages/adt-client-v2/src/adt/discovery/discovery.schema.ts: Remove @ prefix
  ### ts-xml
  - packages/ts-xml/src/types.ts: Add optional field support
  ### adt-cli
  - packages/adt-cli/src/lib/commands/discovery.ts: Use capture plugin
    Closes: #discovery-xml-json-storage

### ❤️ Thank You

- Claude
- Petr Plenkov
- ThePlenkov @ThePlenkov

## 0.1.0 (2024-10-08)

This was a version bump only, there were no code changes.

## 0.0.5 (2024-10-07)

This was a version bump only, there were no code changes.

## 0.0.4 (2024-10-07)

This was a version bump only, there were no code changes.

## 0.0.3 (2024-10-07)

This was a version bump only, there were no code changes.

## 0.0.2 (2024-10-07)

This was a version bump only, there were no code changes.
