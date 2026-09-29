## 0.4.16 (2026-09-29)

This was a version bump only for adt-cli to align it with other projects, there were no code changes.

## 0.4.15 (2026-09-29)

This was a version bump only for adt-cli to align it with other projects, there were no code changes.

## 0.4.14 (2026-09-28)

This was a version bump only for adt-cli to align it with other projects, there were no code changes.

## 0.4.13 (2026-09-28)

### 🩹 Fixes

- **cli:** render safe flow diagnostics ([a60e7153](https://github.com/abapify/adt-cli/commit/a60e7153))

### ❤️ Thank You

- Petr Plenkov @ThePlenkov

## 0.4.12 (2026-09-28)

This was a version bump only for adt-cli to align it with other projects, there were no code changes.

## 0.4.11 (2026-09-23)

This was a version bump only for adt-cli to align it with other projects, there were no code changes.

## 0.4.10 (2026-09-21)

This was a version bump only for adt-cli to align it with other projects, there were no code changes.

## 0.4.9 (2026-09-20)

This was a version bump only for adt-cli to align it with other projects, there were no code changes.

## 0.4.8 (2026-09-20)

### 🚀 Features

- **adt:** add @abapify/adt standalone bundle package ([6f0e57fa](https://github.com/abapify/adt-cli/commit/6f0e57fa))

### 🩹 Fixes

- **cli:** use unicode escapes in error sanitizer patterns ([61cf7b7e](https://github.com/abapify/adt-cli/commit/61cf7b7e))
- **cli:** sanitize typed plugin errors and gate messages behind codes ([f5479611](https://github.com/abapify/adt-cli/commit/f5479611))
- **adt-cli:** report real package version; fix typecheck regressions ([0dd4b802](https://github.com/abapify/adt-cli/commit/0dd4b802))
- **cli:** hide plugin error stacks ([583ee8ec](https://github.com/abapify/adt-cli/commit/583ee8ec))

### ❤️ Thank You

- Devin @devin-ai-integration[bot]
- ThePlenkov @ThePlenkov

## 0.5.0 (2026-09-20)

### 🚀 Features

- **adt:** add @abapify/adt standalone bundle package ([6f0e57fa](https://github.com/abapify/adt-cli/commit/6f0e57fa))
- **gcts:** Full AFF abap-file-formats support — Wave 0+1+2 ([#193](https://github.com/abapify/adt-cli/pull/193))
- expose typed CTS transport metadata ([#186](https://github.com/abapify/adt-cli/pull/186))
- **flow:** persist complete CTS inventories ([#182](https://github.com/abapify/adt-cli/pull/182))
- **adt-mcp:** arc-1 SAPRead parity for get_source ([#162](https://github.com/abapify/adt-cli/pull/162))
- **badi:** classic BAdI read via vit/wb ([#153](https://github.com/abapify/adt-cli/pull/153), [#154](https://github.com/abapify/adt-cli/pull/154))
- **badi:** add `adt badi <name> --implementations` ([#153](https://github.com/abapify/adt-cli/pull/153))
- **cts:** create verified transport tasks ([99447319](https://github.com/abapify/adt-cli/commit/99447319))
- **source-history:** add bounded ADT source history support ([04ecb578](https://github.com/abapify/adt-cli/commit/04ecb578))
- add ADT proxy server with JSON↔XML conversion ([49271e22](https://github.com/abapify/adt-cli/commit/49271e22))
- simplify import transport - comma-sep multi-TR, --save-tr-metadata, fixed deletion pass ([66c4cd3b](https://github.com/abapify/adt-cli/commit/66c4cd3b))
- transport deletion-aware import with obj_func filter and multi-TR merge ([22fe3d26](https://github.com/abapify/adt-cli/commit/22fe3d26))
- implement arc-1 parity across adt-lint, adt-contracts, adt-mcp, and adt-cli ([361ff373](https://github.com/abapify/adt-cli/commit/361ff373))
- **adt-mcp,adt-cli:** Wave 3 — transactional changesets (MCP + CLI parity) ([ff70be83](https://github.com/abapify/adt-cli/commit/ff70be83))
- **adt-mcp:** Wave 1-C — migrate tools to session-aware args + getAdtClientV2Safe ([9205468f](https://github.com/abapify/adt-cli/commit/9205468f))
- **adt-mcp:** Wave 1 — Streamable HTTP transport + stateful sessions + multi-system routing ([6e6954fe](https://github.com/abapify/adt-cli/commit/6e6954fe))
- **gcts:** format.export — complete checkin roundtrip for gCTS — QC2 ([5590ea19](https://github.com/abapify/adt-cli/commit/5590ea19))
- **real-e2e:** TRL backfill sweep + WB where-used 2-step POST fix ([d64bd853](https://github.com/abapify/adt-cli/commit/d64bd853))
- **wb:** workbench CLI + real-e2e uncovers MCP endpoint bugs — E15 ([e7022111](https://github.com/abapify/adt-cli/commit/e7022111))
- **flp:** Fiori Launchpad read-only inventory — E14 ([eb890f58](https://github.com/abapify/adt-cli/commit/eb890f58))
- **rfc:** SOAP-over-HTTP RFC transport + adt rfc command — E13 ([a7c491bd](https://github.com/abapify/adt-cli/commit/a7c491bd))
- **badi:** BAdI CRUD + real-SAP e2e harness — E03 ([d36945ba](https://github.com/abapify/adt-cli/commit/d36945ba))
- **rap:** SRVB (Service Binding) CRUD + publish/unpublish — E12 ([55c9b7e5](https://github.com/abapify/adt-cli/commit/55c9b7e5))
- **rap:** SRVD (Service Definition) CRUD — E11 ([bf35ad21](https://github.com/abapify/adt-cli/commit/bf35ad21))
- **rap:** BDEF (Behavior Definition) CRUD — E10 ([dd02c106](https://github.com/abapify/adt-cli/commit/dd02c106))
- **gcts-cli:** gCTS command plugin — E07 ([01295e4e](https://github.com/abapify/adt-cli/commit/01295e4e))
- **checkin:** checkin via batch lock session — E08 ([403b126e](https://github.com/abapify/adt-cli/commit/403b126e))
- **gcts:** AFF/gCTS format plugin — E06 ([67676d24](https://github.com/abapify/adt-cli/commit/67676d24))
- **plugin:** FormatPlugin API foundation — E05 ([dbcf8fb1](https://github.com/abapify/adt-cli/commit/dbcf8fb1))
- **strust:** STRUST PSE/cert CLI + MCP — E04 ([c2bc6699](https://github.com/abapify/adt-cli/commit/c2bc6699))
- **function:** FUGR/FUNC CLI + MCP — E02 ([99b85330](https://github.com/abapify/adt-cli/commit/99b85330))
- **incl:** INCL CLI + MCP — E01 ([8aaeb898](https://github.com/abapify/adt-cli/commit/8aaeb898))
- **aunit:** ABAP Unit code coverage — JaCoCo output + CLI/MCP parity ([ad12d14b](https://github.com/abapify/adt-cli/commit/ad12d14b))
- **parity:** 15 new MCP tools + CLI↔MCP e2e test harness ([60236217](https://github.com/abapify/adt-cli/commit/60236217))
- add checkout command and remaining CDS/DDIC subtask completions ([c2d80f75](https://github.com/abapify/adt-cli/commit/c2d80f75))
- add CDS DDL and DCL source commands with XML injection fix ([0391f4aa](https://github.com/abapify/adt-cli/commit/0391f4aa))
- add datapreview osql, abap run, and DDIC object commands ([7d0630ee](https://github.com/abapify/adt-cli/commit/7d0630ee))
- add package CRUD and object CRUD commands (class, program, interface) ([bf469bac](https://github.com/abapify/adt-cli/commit/bf469bac))
- add CTS tr reassign command to change transport owner ([003ea32f](https://github.com/abapify/adt-cli/commit/003ea32f))
- **adt-mcp:** add 7 new MCP tools and adt source CLI command ([c2bed22a](https://github.com/abapify/adt-cli/commit/c2bed22a))
- **adt:** add user lookup command and system contract ([3257eeec](https://github.com/abapify/adt-cli/commit/3257eeec))
- **adk,adt-cli:** fix ETag invalidation after lock acquisition, improve DEVC subpackage filtering, add --objects to package get ([45fd3873](https://github.com/abapify/adt-cli/commit/45fd3873))
- **adk,adt-cli:** centralize lock operations in LockService, add force-unlock, remove duplicate lock logic ([76f45210](https://github.com/abapify/adt-cli/commit/76f45210))
- **adk,adt-cli:** add FUGR name normalization, lock handle persistence, and root URI extraction ([1e5ad7f5](https://github.com/abapify/adt-cli/commit/1e5ad7f5))
- **adt-auth:** add port retry logic for OAuth callback server, fix refresh logging ([71149806](https://github.com/abapify/adt-cli/commit/71149806))
- **adt-diff:** add --raw mode, fix abapLanguageVersion auth issue, defer CLAS include saves ([39997c2d](https://github.com/abapify/adt-cli/commit/39997c2d))
- add adt diff command and fix CDS-to-abapGit serialization ([e79ecb8f](https://github.com/abapify/adt-cli/commit/e79ecb8f))
- abapGit roundtrip - export, deploy, and structure support ([29859632](https://github.com/abapify/adt-cli/commit/29859632))
- remove OAT format everywhere, make abapgit the default ([d7a82b41](https://github.com/abapify/adt-cli/commit/d7a82b41))
- enhance service key authentication and add redirect URI support ([831c6b24](https://github.com/abapify/adt-cli/commit/831c6b24))
- add --service-key CLI option, Bearer token support, and CI e2e auth test ([4055c554](https://github.com/abapify/adt-cli/commit/4055c554))
- **adt-auth:** add service-key auth plugin and env resolver ([042466e0](https://github.com/abapify/adt-cli/commit/042466e0))
- add Bun standalone executable support with all plugins bundled ([a4b275a7](https://github.com/abapify/adt-cli/commit/a4b275a7))
- **release:** setup Nx Release publishing with GitHub CI ([0243482f](https://github.com/abapify/adt-cli/commit/0243482f))
- **import:** support plugin format options for abapgit folder logic ([143cec32](https://github.com/abapify/adt-cli/commit/143cec32))
- **adt-config:** implement --config flag support in config loader ([afe9d8d0](https://github.com/abapify/adt-cli/commit/afe9d8d0))
- **adt-cli:** add ls command and atc --from-file option ([6d61447b](https://github.com/abapify/adt-cli/commit/6d61447b))
- **adt-cli:** add --config option for explicit config file ([f5f92d69](https://github.com/abapify/adt-cli/commit/f5f92d69))
- **adt-cli:** extract error cause for better network error diagnostics ([e0478348](https://github.com/abapify/adt-cli/commit/e0478348))
- **adt-cli:** improve error handling with error codes and stack traces ([ff8aae85](https://github.com/abapify/adt-cli/commit/ff8aae85))
- **adt-cli:** add --config option for explicit config file ([025bbe60](https://github.com/abapify/adt-cli/commit/025bbe60))
- **adt-cli:** extract error cause for better network error diagnostics ([9eeab348](https://github.com/abapify/adt-cli/commit/9eeab348))
- **adt-cli:** improve error handling with error codes and stack traces ([5a84eb99](https://github.com/abapify/adt-cli/commit/5a84eb99))
- **devc:** implement DEVC package support with type inference ([2d314008](https://github.com/abapify/adt-cli/commit/2d314008))
- decommission old transport commands, add cts tr commands, adt-tui package ([b1fcbfbe](https://github.com/abapify/adt-cli/commit/b1fcbfbe))
- **ts-xsd:** add XSD inheritance support with complexContent/extension parsing ([5cceaf74](https://github.com/abapify/adt-cli/commit/5cceaf74))
- **adt-cli:** add interactive TUI editor for CTS tree configuration with optimistic locking ([4eb38c39](https://github.com/abapify/adt-cli/commit/4eb38c39))
- **ts-xsd:** add batch codegen with config file support and CLI improvements ([f5aea76b](https://github.com/abapify/adt-cli/commit/f5aea76b))
- **adt-client-v2:** add logger support to client architecture ([d4ffb9cd](https://github.com/abapify/adt-cli/commit/d4ffb9cd))
- **adt-cli:** propagate CLI logger to v2 client via plugin ([70f6555b](https://github.com/abapify/adt-cli/commit/70f6555b))
- **adt-cli:** add pluggable logger to client helper ([372ab66c](https://github.com/abapify/adt-cli/commit/372ab66c))
- **adt-client-v2:** implement repository search contract and migrate CLI command ([9451fff5](https://github.com/abapify/adt-cli/commit/9451fff5))
- ⚠️ **adt-client-v2:** add pluggable response system and fix XML attribute parsing ([e5fb3348](https://github.com/abapify/adt-cli/commit/e5fb3348))
- add XML/XSLT processing and JSON validation dependencies ([c54bb034](https://github.com/abapify/adt-cli/commit/c54bb034))
- **adk:** implement ADK architecture alignment with lazy loading ([6313ce60](https://github.com/abapify/adt-cli/commit/6313ce60))
- Add Basic Authentication support for on-premise SAP systems ([#8](https://github.com/abapify/adt-cli/pull/8))
- Enhance ADT client with object locking and session management features ([0e61924c](https://github.com/abapify/adt-cli/commit/0e61924c))
- Implement deploy and lock/unlock commands for SAP ADT objects ([aaa191ae](https://github.com/abapify/adt-cli/commit/aaa191ae))
- add inheritance support to xmld with metadata merging and build system updates ([6d9b1fdb](https://github.com/abapify/adt-cli/commit/6d9b1fdb))
- add uv package manager to devcontainer for Python dependencies ([9463e401](https://github.com/abapify/adt-cli/commit/9463e401))
- enhance transport get command with tree-style task and object display ([b04bb57d](https://github.com/abapify/adt-cli/commit/b04bb57d))
- implement transport object extraction from ADT API endpoint ([a225590e](https://github.com/abapify/adt-cli/commit/a225590e))
- add transport import functionality to ADT CLI with specification-driven development docs ([e769ae0d](https://github.com/abapify/adt-cli/commit/e769ae0d))
- add petstore e2e example with interface and tests ([307c58b3](https://github.com/abapify/adt-cli/commit/307c58b3))
- **adt-cli:** refine get command output and enhance object properties display ([11e9b59d](https://github.com/abapify/adt-cli/commit/11e9b59d))
- **adt-cli:** enhance object inspection with properties and outline commands ([51a43a93](https://github.com/abapify/adt-cli/commit/51a43a93))
- **adt-cli:** integrate ADK for native ADT XML parsing in CLI ([0feb9517](https://github.com/abapify/adt-cli/commit/0feb9517))
- **adt-cli:** enhance get command with object structure display for classes ([dad33159](https://github.com/abapify/adt-cli/commit/dad33159))
- **adt-cli:** add object structure option to get command ([1da86029](https://github.com/abapify/adt-cli/commit/1da86029))
- **adt-cli:** add ADT XML export option to get command ([f65aaf32](https://github.com/abapify/adt-cli/commit/f65aaf32))
- implement package-based directory structure and enhance config handling for OAT format ([bae0be19](https://github.com/abapify/adt-cli/commit/bae0be19))
- enhance import command and ADT client for improved performance and error handling ([10746073](https://github.com/abapify/adt-cli/commit/10746073))
- enhance abapGit format with disclaimer and update import command help ([d278034a](https://github.com/abapify/adt-cli/commit/d278034a))
- refactor CLI command structure for improved modularity ([7f198083](https://github.com/abapify/adt-cli/commit/7f198083))
- add search and import commands for ABAP objects ([5a8e7577](https://github.com/abapify/adt-cli/commit/5a8e7577))
- implement transport creation command with CSRF protection and session handling ([ec872641](https://github.com/abapify/adt-cli/commit/ec872641))
- add transport get command for detailed transport and task information ([d2f4e9eb](https://github.com/abapify/adt-cli/commit/d2f4e9eb))
- enhance transport list command with full ADT protocol support and debug mode ([4d0ae84d](https://github.com/abapify/adt-cli/commit/4d0ae84d))
- implement transport management and discovery services with comprehensive command support ([2392b48e](https://github.com/abapify/adt-cli/commit/2392b48e))
- enhance authentication flow with automatic token refresh and add refresh_token to OAuthToken ([746db449](https://github.com/abapify/adt-cli/commit/746db449))
- update ADT CLI documentation and enhance settings for vitest ([de50d4ff](https://github.com/abapify/adt-cli/commit/de50d4ff))
- Add discovery XML parsing and output options to ADT CLI ([590ee90c](https://github.com/abapify/adt-cli/commit/590ee90c))
- Implement OAuth 2.0 PKCE authentication flow for ADT CLI ([05047840](https://github.com/abapify/adt-cli/commit/05047840))

### 🩹 Fixes

- **cli:** use unicode escapes in error sanitizer patterns ([61cf7b7e](https://github.com/abapify/adt-cli/commit/61cf7b7e))
- **cli:** sanitize typed plugin errors and gate messages behind codes ([f5479611](https://github.com/abapify/adt-cli/commit/f5479611))
- **adt-cli:** report real package version; fix typecheck regressions ([0dd4b802](https://github.com/abapify/adt-cli/commit/0dd4b802))
- **cli:** hide plugin error stacks ([583ee8ec](https://github.com/abapify/adt-cli/commit/583ee8ec))
- **adt-mcp:** require HTTPS for HTTP transport ([#207](https://github.com/abapify/adt-cli/pull/207))
- **import:** support typed CDS and RAP imports ([#185](https://github.com/abapify/adt-cli/pull/185))
- **client:** support long-running SAP requests ([#177](https://github.com/abapify/adt-cli/pull/177))
- **cli:** expose safe fetch failure diagnostics ([#174](https://github.com/abapify/adt-cli/pull/174))
- **cli:** keep payload stdout pipe-safe ([#165](https://github.com/abapify/adt-cli/pull/165))
- **cli:** honor explicit config for plugins ([#163](https://github.com/abapify/adt-cli/pull/163))
- CTS lifecycle follow-ups — lock correlation, release details, flow scope ([#157](https://github.com/abapify/adt-cli/pull/157))
- verify CTS lifecycle, task creation, and lock correlation ([#151](https://github.com/abapify/adt-cli/pull/151))
- **cts:** reconcile task and source lifecycle ([34469d91](https://github.com/abapify/adt-cli/commit/34469d91))
- **cli:** honor lock correlation on source writes ([b2763ef7](https://github.com/abapify/adt-cli/commit/b2763ef7))
- verify CTS lifecycle and task deltas ([cbe83c5b](https://github.com/abapify/adt-cli/commit/cbe83c5b))
- review thread fixes (broker, session, source-history, docs, deps) ([3d20361a](https://github.com/abapify/adt-cli/commit/3d20361a))
- **sonar:** resolve MAJOR code smells and regenerate client ([1559c2cd](https://github.com/abapify/adt-cli/commit/1559c2cd))
- **adt-cli:** normalize source-history metadata output to avoid leaking source URIs ([4fbe2a8f](https://github.com/abapify/adt-cli/commit/4fbe2a8f))
- **lint:** use const for defaultHeaders in proxy command ([8ebef5f4](https://github.com/abapify/adt-cli/commit/8ebef5f4))
- address 3 blocking issues in ADT proxy rework ([c259a4e8](https://github.com/abapify/adt-cli/commit/c259a4e8))
- use bunx instead of npx in auth hint ([89fc796b](https://github.com/abapify/adt-cli/commit/89fc796b))
- address all review feedback - round 2 ([bbef42f2](https://github.com/abapify/adt-cli/commit/bbef42f2))
- address CodeRabbit review feedback ([a9676264](https://github.com/abapify/adt-cli/commit/a9676264))
- resolve SonarCloud reliability and duplication findings ([043824fd](https://github.com/abapify/adt-cli/commit/043824fd))
- optimize findObjectFiles index, restore transportNumber compat, dedup ImportContext ([b4fa93e2](https://github.com/abapify/adt-cli/commit/b4fa93e2))
- apply prettier formatting to service.ts ([7e7db742](https://github.com/abapify/adt-cli/commit/7e7db742))
- prefer-const lint error in cts tr objects command ([a42ae780](https://github.com/abapify/adt-cli/commit/a42ae780))
- reduce duplication, remove useless conditional, harden JSONC parser ([90efa96b](https://github.com/abapify/adt-cli/commit/90efa96b))
- address PR review — regex security, method detection, BTP 404, lint gate, specs ([b72567f3](https://github.com/abapify/adt-cli/commit/b72567f3))
- **security:** unblock SonarCloud Quality Gate on new_security_hotspots_reviewed ([d08777c1](https://github.com/abapify/adt-cli/commit/d08777c1))
- **sonarcloud-review:** safe-guard JSON.stringify in S6551 helpers ([bd72acaf](https://github.com/abapify/adt-cli/commit/bd72acaf))
- **packages:** add repository/homepage/bugs to every published package ([85b29310](https://github.com/abapify/adt-cli/commit/85b29310))
- **pr-103:** address review comments — type safety, parity, harness, policy ([d5b14cd9](https://github.com/abapify/adt-cli/commit/d5b14cd9))
- **security:** resolve remaining SonarCloud hotspots + reliability bugs ([86337e36](https://github.com/abapify/adt-cli/commit/86337e36))
- **security:** replace regex XML parsing with @xmldom/xmldom — CodeQL + Sonar ([3ef1f4cf](https://github.com/abapify/adt-cli/commit/3ef1f4cf))
- **ci:** adt-cli tests depend on adt-mcp:build (harness imports it) ([1a17352e](https://github.com/abapify/adt-cli/commit/1a17352e))
- **ci:** resolve CodeQL ReDoS + code-quality findings, fix main CI ([9670d6df](https://github.com/abapify/adt-cli/commit/9670d6df))
- resolve all pre-existing typecheck + test failures — QC1 ([c1970023](https://github.com/abapify/adt-cli/commit/c1970023))
- address all PR #99 review findings ([#99](https://github.com/abapify/adt-cli/issues/99))
- **adt-cli:** harden user command JSON mode and input validation ([6ade4f53](https://github.com/abapify/adt-cli/commit/6ade4f53))
- resolve merge conflict and fix SonarQube duplication findings ([c5168250](https://github.com/abapify/adt-cli/commit/c5168250))
- address all SonarQube findings for PR #81 ([#81](https://github.com/abapify/adt-cli/issues/81))
- **lint:** fix 3 CI failures: ts-xsd lint, adt-cli lazy-load error, adt-contracts test header ([c5b8e50c](https://github.com/abapify/adt-cli/commit/c5b8e50c))
- remove inlinedDependencies and alwaysBundle from adt-cli tsdown config ([b1fc0b19](https://github.com/abapify/adt-cli/commit/b1fc0b19))
- readServiceKey only accepts file paths; clear error when raw JSON passed ([cdbd7c1a](https://github.com/abapify/adt-cli/commit/cdbd7c1a))
- add missing ts-morph and adk deps, bump to 0.1.10 ([ed143378](https://github.com/abapify/adt-cli/commit/ed143378))
- add missing zod dependency to adt-schemas and ts-xsd, bump to 0.1.9 ([c85f3a8c](https://github.com/abapify/adt-cli/commit/c85f3a8c))
- address all Qodo review comments from today's PRs (#44-#49) ([#44](https://github.com/abapify/adt-cli/issues/44), [#49](https://github.com/abapify/adt-cli/issues/49))
- update tsdown configuration to use deps for bundling options ([21dd7bc6](https://github.com/abapify/adt-cli/commit/21dd7bc6))
- resolve typecheck failures across workspace ([e6d46651](https://github.com/abapify/adt-cli/commit/e6d46651))
- **ci:** address Qodo review comments on release workflows ([645ee885](https://github.com/abapify/adt-cli/commit/645ee885))
- **ci:** fix format and lint errors to unblock CI pipeline ([74f4a1d9](https://github.com/abapify/adt-cli/commit/74f4a1d9))
- **adt-cli:** parse --config option from argv before parseAsync ([f55a8857](https://github.com/abapify/adt-cli/commit/f55a8857))
- **adt-cli:** use correct plugin path for basic auth ([01febfda](https://github.com/abapify/adt-cli/commit/01febfda))
- **adt-cli:** parse --config option from argv before parseAsync ([4645773b](https://github.com/abapify/adt-cli/commit/4645773b))
- **adt-cli:** use correct plugin path for basic auth ([0a2dfbc4](https://github.com/abapify/adt-cli/commit/0a2dfbc4))
- improve browser opening in OAuth flow with BROWSER env var support ([2a9aeff8](https://github.com/abapify/adt-cli/commit/2a9aeff8))
- resolve CI pipeline failures ([2a239e2a](https://github.com/abapify/adt-cli/commit/2a239e2a))
- update @abapify/adt-client dependency to use standard version specifier ([0346080b](https://github.com/abapify/adt-cli/commit/0346080b))

### ⚠️ Breaking Changes

- **adt-client-v2:** add pluggable response system and fix XML attribute parsing ([e5fb3348](https://github.com/abapify/adt-cli/commit/e5fb3348))
  Schema attribute names no longer use @ prefix

### 🧱 Updated Dependencies

- Updated adt-plugin-gcts-cli to 0.4.8
- Updated adt-plugin-abapgit to 0.5.0
- Updated adt-plugin-gcts to 0.4.8
- Updated adt-contracts to 0.5.0
- Updated @abapify/adt-fixtures to 0.5.0
- Updated adt-services to 0.4.8
- Updated @abapify/adt-codegen to 0.5.0
- Updated adt-schemas to 0.5.0
- Updated @abapify/adt-client to 0.5.0
- Updated @abapify/adt-config to 0.5.0
- Updated adt-export to 0.5.0
- Updated adt-plugin to 0.5.0
- Updated adt-aunit to 0.4.8
- Updated adt-locks to 0.4.8
- Updated adt-proxy to 0.4.8
- Updated @abapify/adt-lint to 0.4.8
- Updated adt-auth to 0.5.0
- Updated adt-diff to 0.4.8
- Updated adt-atc to 0.5.0
- Updated adt-mcp to 0.4.8
- Updated adt-rfc to 0.4.8
- Updated adt-tui to 0.5.0
- Updated @abapify/logger to 0.5.0
- Updated adk to 0.5.0

### ❤️ Thank You

- Birch (gastown)
- Claude
- Cursor @cursoragent
- Devin @devin-ai-integration[bot]
- Devin AI @devin-ai-integration[bot]
- Maple (gastown)
- Petr Plenkov @ThePlenkov
- ThePlenkov @ThePlenkov

## 0.4.7 (2026-09-18)

This was a version bump only for adt-cli to align it with other projects, there were no code changes.

## 0.4.6 (2026-09-18)

This was a version bump only for adt-cli to align it with other projects, there were no code changes.

## 0.4.5 (2026-09-17)

This was a version bump only for adt-cli to align it with other projects, there were no code changes.

## 0.4.4 (2026-09-17)

This was a version bump only for adt-cli to align it with other projects, there were no code changes.

## 0.4.3 (2026-09-16)

### 🩹 Fixes

- **adt-mcp:** require HTTPS for HTTP transport ([#207](https://github.com/abapify/adt-cli/pull/207))

### ❤️ Thank You

- Devin @devin-ai-integration[bot]
- Petr Plenkov @ThePlenkov
- ThePlenkov @ThePlenkov

## 0.4.2 (2026-09-08)

### 🚀 Features

- **gcts:** Full AFF abap-file-formats support — Wave 0+1+2 ([#193](https://github.com/abapify/adt-cli/pull/193))
- expose typed CTS transport metadata ([#186](https://github.com/abapify/adt-cli/pull/186))
- **flow:** persist complete CTS inventories ([#182](https://github.com/abapify/adt-cli/pull/182))
- **adt-mcp:** arc-1 SAPRead parity for get_source ([#162](https://github.com/abapify/adt-cli/pull/162))
- **badi:** classic BAdI read via vit/wb ([#153](https://github.com/abapify/adt-cli/pull/153), [#154](https://github.com/abapify/adt-cli/pull/154))
- **badi:** add `adt badi <name> --implementations` ([#153](https://github.com/abapify/adt-cli/pull/153))
- **cts:** create verified transport tasks ([99447319](https://github.com/abapify/adt-cli/commit/99447319))
- **source-history:** add bounded ADT source history support ([04ecb578](https://github.com/abapify/adt-cli/commit/04ecb578))
- add ADT proxy server with JSON↔XML conversion ([49271e22](https://github.com/abapify/adt-cli/commit/49271e22))

### 🩹 Fixes

- **import:** support typed CDS and RAP imports ([#185](https://github.com/abapify/adt-cli/pull/185))
- **client:** support long-running SAP requests ([#177](https://github.com/abapify/adt-cli/pull/177))
- **cli:** expose safe fetch failure diagnostics ([#174](https://github.com/abapify/adt-cli/pull/174))
- **cli:** keep payload stdout pipe-safe ([#165](https://github.com/abapify/adt-cli/pull/165))
- **cli:** honor explicit config for plugins ([#163](https://github.com/abapify/adt-cli/pull/163))
- CTS lifecycle follow-ups — lock correlation, release details, flow scope ([#157](https://github.com/abapify/adt-cli/pull/157))
- verify CTS lifecycle, task creation, and lock correlation ([#151](https://github.com/abapify/adt-cli/pull/151))
- **cts:** reconcile task and source lifecycle ([34469d91](https://github.com/abapify/adt-cli/commit/34469d91))
- **cli:** honor lock correlation on source writes ([b2763ef7](https://github.com/abapify/adt-cli/commit/b2763ef7))
- verify CTS lifecycle and task deltas ([cbe83c5b](https://github.com/abapify/adt-cli/commit/cbe83c5b))
- review thread fixes (broker, session, source-history, docs, deps) ([3d20361a](https://github.com/abapify/adt-cli/commit/3d20361a))
- **sonar:** resolve MAJOR code smells and regenerate client ([1559c2cd](https://github.com/abapify/adt-cli/commit/1559c2cd))
- **adt-cli:** normalize source-history metadata output to avoid leaking source URIs ([4fbe2a8f](https://github.com/abapify/adt-cli/commit/4fbe2a8f))
- **lint:** use const for defaultHeaders in proxy command ([8ebef5f4](https://github.com/abapify/adt-cli/commit/8ebef5f4))
- address 3 blocking issues in ADT proxy rework ([c259a4e8](https://github.com/abapify/adt-cli/commit/c259a4e8))
- use bunx instead of npx in auth hint ([89fc796b](https://github.com/abapify/adt-cli/commit/89fc796b))
- address all review feedback - round 2 ([bbef42f2](https://github.com/abapify/adt-cli/commit/bbef42f2))
- address CodeRabbit review feedback ([a9676264](https://github.com/abapify/adt-cli/commit/a9676264))

### ❤️ Thank You

- Birch (gastown)
- Cursor @cursoragent
- Devin @devin-ai-integration[bot]
- Devin AI @devin-ai-integration[bot]
- Maple (gastown)
- Petr Plenkov @ThePlenkov
- ThePlenkov @ThePlenkov

## 0.4.1 (2026-05-29)

This was a version bump only for adt-cli to align it with other projects, there were no code changes.

## 0.4.0 (2026-05-29)

### 🚀 Features

- simplify import transport - comma-sep multi-TR, --save-tr-metadata, fixed deletion pass ([877d8eae](https://github.com/abapify/adt-cli/commit/877d8eae))
- transport deletion-aware import with obj_func filter and multi-TR merge ([452f03f4](https://github.com/abapify/adt-cli/commit/452f03f4))
- implement arc-1 parity across adt-lint, adt-contracts, adt-mcp, and adt-cli ([aeb5e8b2](https://github.com/abapify/adt-cli/commit/aeb5e8b2))

### 🩹 Fixes

- resolve SonarCloud reliability and duplication findings ([ac951739](https://github.com/abapify/adt-cli/commit/ac951739))
- optimize findObjectFiles index, restore transportNumber compat, dedup ImportContext ([4f08ee94](https://github.com/abapify/adt-cli/commit/4f08ee94))
- apply prettier formatting to service.ts ([52dfffae](https://github.com/abapify/adt-cli/commit/52dfffae))
- prefer-const lint error in cts tr objects command ([11da0c54](https://github.com/abapify/adt-cli/commit/11da0c54))
- reduce duplication, remove useless conditional, harden JSONC parser ([7181ab33](https://github.com/abapify/adt-cli/commit/7181ab33))
- address PR review — regex security, method detection, BTP 404, lint gate, specs ([bf634260](https://github.com/abapify/adt-cli/commit/bf634260))
- **security:** unblock SonarCloud Quality Gate on new_security_hotspots_reviewed ([#113](https://github.com/abapify/adt-cli/issues/113))
- **sonarcloud-review:** safe-guard JSON.stringify in S6551 helpers ([#113](https://github.com/abapify/adt-cli/issues/113))

### ❤️ Thank You

- Devin AI @devin-ai-integration[bot]
- Petr Plenkov
- ThePlenkov @ThePlenkov

## 0.3.6 (2026-04-21)

This was a version bump only for adt-cli to align it with other projects, there were no code changes.

## 0.3.5 (2026-04-20)

This was a version bump only for adt-cli to align it with other projects, there were no code changes.

## 0.3.4 (2026-04-20)

### 🩹 Fixes

- **packages:** add repository/homepage/bugs to every published package ([e1853e48](https://github.com/abapify/adt-cli/commit/e1853e48))

### ❤️ Thank You

- Petr Plenkov

## 0.3.3 (2026-04-20)

This was a version bump only for adt-cli to align it with other projects, there were no code changes.

## 0.3.2 (2026-04-20)

This was a version bump only for adt-cli to align it with other projects, there were no code changes.

## 0.3.1 (2026-04-20)

This was a version bump only for adt-cli to align it with other projects, there were no code changes.

## 0.3.0 (2026-04-20)

### 🚀 Features

- **adt-mcp,adt-cli:** Wave 3 — transactional changesets (MCP + CLI parity) ([abcb5c3e](https://github.com/abapify/adt-cli/commit/abcb5c3e))
- **adt-mcp:** Wave 1-C — migrate tools to session-aware args + getAdtClientV2Safe ([1d4bb744](https://github.com/abapify/adt-cli/commit/1d4bb744))
- **adt-mcp:** Wave 1 — Streamable HTTP transport + stateful sessions + multi-system routing ([#110](https://github.com/abapify/adt-cli/issues/110))
- **gcts:** format.export — complete checkin roundtrip for gCTS — QC2 ([1f2442d8](https://github.com/abapify/adt-cli/commit/1f2442d8))
- **real-e2e:** TRL backfill sweep + WB where-used 2-step POST fix ([13e777da](https://github.com/abapify/adt-cli/commit/13e777da))
- **wb:** workbench CLI + real-e2e uncovers MCP endpoint bugs — E15 ([f2d73d4b](https://github.com/abapify/adt-cli/commit/f2d73d4b))
- **flp:** Fiori Launchpad read-only inventory — E14 ([aa8b42b5](https://github.com/abapify/adt-cli/commit/aa8b42b5))
- **rfc:** SOAP-over-HTTP RFC transport + adt rfc command — E13 ([45487cc4](https://github.com/abapify/adt-cli/commit/45487cc4))
- **badi:** BAdI CRUD + real-SAP e2e harness — E03 ([dd0f8ff0](https://github.com/abapify/adt-cli/commit/dd0f8ff0))
- **rap:** SRVB (Service Binding) CRUD + publish/unpublish — E12 ([f8b6c3ce](https://github.com/abapify/adt-cli/commit/f8b6c3ce))
- **rap:** SRVD (Service Definition) CRUD — E11 ([0c3cb7e1](https://github.com/abapify/adt-cli/commit/0c3cb7e1))
- **rap:** BDEF (Behavior Definition) CRUD — E10 ([af89d726](https://github.com/abapify/adt-cli/commit/af89d726))
- **gcts-cli:** gCTS command plugin — E07 ([94583dc1](https://github.com/abapify/adt-cli/commit/94583dc1))
- **checkin:** checkin via batch lock session — E08 ([027a172d](https://github.com/abapify/adt-cli/commit/027a172d))
- **gcts:** AFF/gCTS format plugin — E06 ([665c16df](https://github.com/abapify/adt-cli/commit/665c16df))
- **plugin:** FormatPlugin API foundation — E05 ([a4e6eeef](https://github.com/abapify/adt-cli/commit/a4e6eeef))
- **strust:** STRUST PSE/cert CLI + MCP — E04 ([7a4ed04f](https://github.com/abapify/adt-cli/commit/7a4ed04f))
- **function:** FUGR/FUNC CLI + MCP — E02 ([e763d35c](https://github.com/abapify/adt-cli/commit/e763d35c))
- **incl:** INCL CLI + MCP — E01 ([ffbe4db0](https://github.com/abapify/adt-cli/commit/ffbe4db0))
- **aunit:** ABAP Unit code coverage — JaCoCo output + CLI/MCP parity ([cbc19f4e](https://github.com/abapify/adt-cli/commit/cbc19f4e))
- **parity:** 15 new MCP tools + CLI↔MCP e2e test harness ([457c3cc5](https://github.com/abapify/adt-cli/commit/457c3cc5))
- add checkout command and remaining CDS/DDIC subtask completions ([bf97ca6c](https://github.com/abapify/adt-cli/commit/bf97ca6c))
- add CDS DDL and DCL source commands with XML injection fix ([6b49e9af](https://github.com/abapify/adt-cli/commit/6b49e9af))
- add datapreview osql, abap run, and DDIC object commands ([9e9289e0](https://github.com/abapify/adt-cli/commit/9e9289e0))
- add package CRUD and object CRUD commands (class, program, interface) ([5fbb8600](https://github.com/abapify/adt-cli/commit/5fbb8600))
- add CTS tr reassign command to change transport owner ([cfd8b705](https://github.com/abapify/adt-cli/commit/cfd8b705))
- **adt-mcp:** add 7 new MCP tools and adt source CLI command ([7c184ed1](https://github.com/abapify/adt-cli/commit/7c184ed1))
- **adt:** add user lookup command and system contract ([431e4e19](https://github.com/abapify/adt-cli/commit/431e4e19))

### 🩹 Fixes

- **pr-103:** address review comments — type safety, parity, harness, policy ([#103](https://github.com/abapify/adt-cli/issues/103))
- **security:** resolve remaining SonarCloud hotspots + reliability bugs ([f860bddb](https://github.com/abapify/adt-cli/commit/f860bddb))
- **security:** replace regex XML parsing with @xmldom/xmldom — CodeQL + Sonar ([c72533af](https://github.com/abapify/adt-cli/commit/c72533af))
- **ci:** adt-cli tests depend on adt-mcp:build (harness imports it) ([faa86972](https://github.com/abapify/adt-cli/commit/faa86972))
- **ci:** resolve CodeQL ReDoS + code-quality findings, fix main CI ([b4bfebc6](https://github.com/abapify/adt-cli/commit/b4bfebc6))
- resolve all pre-existing typecheck + test failures — QC1 ([81152316](https://github.com/abapify/adt-cli/commit/81152316))
- address all PR #99 review findings ([#99](https://github.com/abapify/adt-cli/issues/99), [#5](https://github.com/abapify/adt-cli/issues/5))
- **adt-cli:** harden user command JSON mode and input validation ([f1d980de](https://github.com/abapify/adt-cli/commit/f1d980de))

### ❤️ Thank You

- Devin @devin-ai-integration[bot]
- Petr Plenkov
- ThePlenkov @ThePlenkov

## 0.2.0 (2026-04-02)

### 🚀 Features

- **adk,adt-cli:** fix ETag invalidation after lock acquisition, improve DEVC subpackage filtering, add --objects to package get ([979aad9](https://github.com/abapify/adt-cli/commit/979aad9))
- **adk,adt-cli:** centralize lock operations in LockService, add force-unlock, remove duplicate lock logic ([66da454](https://github.com/abapify/adt-cli/commit/66da454))
- **adk,adt-cli:** add FUGR name normalization, lock handle persistence, and root URI extraction ([ee2c300](https://github.com/abapify/adt-cli/commit/ee2c300))
- **adt-auth:** add port retry logic for OAuth callback server, fix refresh logging ([cef30df](https://github.com/abapify/adt-cli/commit/cef30df))
- **adt-diff:** add --raw mode, fix abapLanguageVersion auth issue, defer CLAS include saves ([e0b4c04](https://github.com/abapify/adt-cli/commit/e0b4c04))
- add adt diff command and fix CDS-to-abapGit serialization ([130168d](https://github.com/abapify/adt-cli/commit/130168d))
- abapGit roundtrip - export, deploy, and structure support ([0da189a](https://github.com/abapify/adt-cli/commit/0da189a))
- remove OAT format everywhere, make abapgit the default ([4596efd](https://github.com/abapify/adt-cli/commit/4596efd))
- enhance service key authentication and add redirect URI support ([4e2276f](https://github.com/abapify/adt-cli/commit/4e2276f))

### 🩹 Fixes

- resolve merge conflict and fix SonarQube duplication findings ([f1edc75](https://github.com/abapify/adt-cli/commit/f1edc75))
- address all SonarQube findings for PR #81 ([#81](https://github.com/abapify/adt-cli/issues/81))

### ❤️ Thank You

- Devin
- Petr Plenkov
- ThePlenkov @ThePlenkov

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Transport Management** - Complete CRUD operations: `list`, `get`, and `create` transport requests
- **Smart Transport/Task Detection** - Automatically distinguishes between transport requests and tasks in output
- **Full ADT Protocol Support** - Implements complete ADT transport organizer protocol with search configuration
- **Service-Oriented Architecture** - Refactored to modular service structure for better maintainability
- **Automatic Re-authentication** - CLI automatically re-authenticates when tokens expire using stored service key
- **Command Aliases** - Added `adt tr` as alias for `adt transport`
- **Advanced Filtering** - Transport list supports filtering by user, status, and result limits
- **CSRF Protection** - Automatic CSRF token handling for POST operations
- **Debug Mode** - Added `--debug` flag for troubleshooting API calls and XML parsing
- **Comprehensive Documentation** - Updated README with new commands and API reference

### Changed

- **Discovery Service** - Moved discovery logic to service-oriented architecture
- **HTTP Client** - Centralized ADT HTTP requests through `ADTClient` base class
- **Error Handling** - Improved error messages with better context and suggestions

### Technical

- **Parser Library** - Switched from `xml2js` to `fast-xml-parser` for better performance
- **TypeScript Types** - Added comprehensive type definitions for transport and discovery data
- **Code Organization** - Services organized by domain (`services/transport/`, `services/discovery/`)

## [0.0.1] - Initial Release

### Added

- **OAuth Authentication** - Browser-based BTP authentication with PKCE
- **Service Discovery** - Discover and list available ADT services
- **Export Options** - Save discovery data as XML or JSON
- **CLI Interface** - Commander.js-based command-line interface
- **Authentication Management** - Secure token storage and session management
