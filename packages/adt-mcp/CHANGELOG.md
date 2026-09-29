## 0.4.16 (2026-09-29)

This was a version bump only for adt-mcp to align it with other projects, there were no code changes.

## 0.4.15 (2026-09-29)

### 🩹 Fixes

- **adt-mcp:** fail closed on unbounded scoped-read dispatch ([#222](https://github.com/abapify/adt-cli/pull/222))

### ❤️ Thank You

- Devin @devin-ai-integration[bot]
- ThePlenkov @ThePlenkov

## 0.4.14 (2026-09-28)

### 🩹 Fixes

- **tests:** restore vitest runner and fix latent build/test gaps ([5b77e658](https://github.com/abapify/adt-cli/commit/5b77e658))

### ❤️ Thank You

- Devin @devin-ai-integration[bot]
- ThePlenkov @ThePlenkov

## 0.4.13 (2026-09-28)

This was a version bump only for adt-mcp to align it with other projects, there were no code changes.

## 0.4.12 (2026-09-28)

### 🚀 Features

- **flow:** add source-free transport indexing ([2cf8bb46](https://github.com/abapify/adt-cli/commit/2cf8bb46))

### 🩹 Fixes

- **mcp:** redact raw flow failure causes ([060a3891](https://github.com/abapify/adt-cli/commit/060a3891))
- **flow:** preserve index-only recovery invariants ([3d587744](https://github.com/abapify/adt-cli/commit/3d587744))

### ❤️ Thank You

- Petr Plenkov @ThePlenkov

## 0.4.11 (2026-09-23)

This was a version bump only for adt-mcp to align it with other projects, there were no code changes.

## 0.4.10 (2026-09-21)

This was a version bump only for adt-mcp to align it with other projects, there were no code changes.

## 0.4.9 (2026-09-20)

This was a version bump only for adt-mcp to align it with other projects, there were no code changes.

## 0.4.8 (2026-09-20)

### 🚀 Features

- expose typed CTS transport metadata ([#186](https://github.com/abapify/adt-cli/pull/186))
- **flow:** persist complete CTS inventories ([#182](https://github.com/abapify/adt-cli/pull/182))
- **adt-mcp:** arc-1 SAPRead parity for get_source ([#162](https://github.com/abapify/adt-cli/pull/162))
- **badi:** classic BAdI read via vit/wb ([#153](https://github.com/abapify/adt-cli/pull/153), [#154](https://github.com/abapify/adt-cli/pull/154))
- **badi:** add `adt badi <name> --implementations` ([#153](https://github.com/abapify/adt-cli/pull/153))
- **cts:** create verified transport tasks ([99447319](https://github.com/abapify/adt-cli/commit/99447319))
- **adt-flow:** add incremental transport checkout ([#150](https://github.com/abapify/adt-cli/pull/150))
- **adt-mcp:** add delegated assistant read scope ([#148](https://github.com/abapify/adt-cli/pull/148))
- **adt-mcp:** add delegated assistant read scope ([b59006b4](https://github.com/abapify/adt-cli/commit/b59006b4))
- **adt-mcp:** enforce scoped safe execution ([#143](https://github.com/abapify/adt-cli/pull/143))
- **adt-mcp:** classify bounded analysis execution ([#141](https://github.com/abapify/adt-cli/pull/141))
- **adt-mcp:** classify bounded analysis execution ([f1d19e7b](https://github.com/abapify/adt-cli/commit/f1d19e7b))
- **adt-mcp:** scope autonomous agent reads ([7baa09f8](https://github.com/abapify/adt-cli/commit/7baa09f8))
- **adt-mcp:** reject raw URI read targets ([c206c1d4](https://github.com/abapify/adt-cli/commit/c206c1d4))
- **adt-mcp:** scope ATC runs without raw URIs ([6665107c](https://github.com/abapify/adt-cli/commit/6665107c))
- **adt-server:** add canonical object metadata REST ([be7857dd](https://github.com/abapify/adt-cli/commit/be7857dd))
- **mcp:** bound current source reads ([e8da7e53](https://github.com/abapify/adt-cli/commit/e8da7e53))
- **adt-mcp:** scope frozen reads to components ([2676ae8f](https://github.com/abapify/adt-cli/commit/2676ae8f))
- **adt-mcp:** enforce frozen AI Review reads ([3c19a052](https://github.com/abapify/adt-cli/commit/3c19a052))
- **adt-server:** configure signed MCP runtime ([d74109ef](https://github.com/abapify/adt-cli/commit/d74109ef))
- **adt-mcp:** verify signed invocations ([f782bf4f](https://github.com/abapify/adt-cli/commit/f782bf4f))
- **adt-mcp:** enforce destination scopes ([3bbb9bf9](https://github.com/abapify/adt-cli/commit/3bbb9bf9))
- **source-history:** add bounded ADT source history support ([04ecb578](https://github.com/abapify/adt-cli/commit/04ecb578))
- simplify import transport - comma-sep multi-TR, --save-tr-metadata, fixed deletion pass ([66c4cd3b](https://github.com/abapify/adt-cli/commit/66c4cd3b))
- transport deletion-aware import with obj_func filter and multi-TR merge ([22fe3d26](https://github.com/abapify/adt-cli/commit/22fe3d26))
- **adt-pilot:** add local dev stack for HTTP MCP and Mastra playground ([e5d204ce](https://github.com/abapify/adt-cli/commit/e5d204ce))
- implement arc-1 parity across adt-lint, adt-contracts, adt-mcp, and adt-cli ([361ff373](https://github.com/abapify/adt-cli/commit/361ff373))
- **adt-mcp,adt-cli:** Wave 3 — transactional changesets (MCP + CLI parity) ([ff70be83](https://github.com/abapify/adt-cli/commit/ff70be83))
- **adt-mcp:** Wave 4 — OAuth 2.1 bearer validation (Okta / Entra ID / Cognito) ([4ac536b9](https://github.com/abapify/adt-cli/commit/4ac536b9))
- **adt-mcp:** Wave 1-C — migrate tools to session-aware args + getAdtClientV2Safe ([9205468f](https://github.com/abapify/adt-cli/commit/9205468f))
- **adt-mcp:** Wave 2 — HTTP auth middleware (bearer + reverse-proxy + CORS) ([f4968329](https://github.com/abapify/adt-cli/commit/f4968329))
- **adt-mcp:** Wave 1 — Streamable HTTP transport + stateful sessions + multi-system routing ([6e6954fe](https://github.com/abapify/adt-cli/commit/6e6954fe))
- **gcts:** format.export — complete checkin roundtrip for gCTS — QC2 ([5590ea19](https://github.com/abapify/adt-cli/commit/5590ea19))
- **real-e2e:** TRL backfill sweep + WB where-used 2-step POST fix ([d64bd853](https://github.com/abapify/adt-cli/commit/d64bd853))
- **flp:** Fiori Launchpad read-only inventory — E14 ([eb890f58](https://github.com/abapify/adt-cli/commit/eb890f58))
- **rfc:** SOAP-over-HTTP RFC transport + adt rfc command — E13 ([a7c491bd](https://github.com/abapify/adt-cli/commit/a7c491bd))
- **badi:** BAdI CRUD + real-SAP e2e harness — E03 ([d36945ba](https://github.com/abapify/adt-cli/commit/d36945ba))
- **rap:** SRVB (Service Binding) CRUD + publish/unpublish — E12 ([55c9b7e5](https://github.com/abapify/adt-cli/commit/55c9b7e5))
- **rap:** SRVD (Service Definition) CRUD — E11 ([bf35ad21](https://github.com/abapify/adt-cli/commit/bf35ad21))
- **rap:** BDEF (Behavior Definition) CRUD — E10 ([dd02c106](https://github.com/abapify/adt-cli/commit/dd02c106))
- **gcts-cli:** gCTS command plugin — E07 ([01295e4e](https://github.com/abapify/adt-cli/commit/01295e4e))
- **checkin:** checkin via batch lock session — E08 ([403b126e](https://github.com/abapify/adt-cli/commit/403b126e))
- **strust:** STRUST PSE/cert CLI + MCP — E04 ([c2bc6699](https://github.com/abapify/adt-cli/commit/c2bc6699))
- **function:** FUGR/FUNC CLI + MCP — E02 ([99b85330](https://github.com/abapify/adt-cli/commit/99b85330))
- **incl:** INCL CLI + MCP — E01 ([8aaeb898](https://github.com/abapify/adt-cli/commit/8aaeb898))
- **aunit:** ABAP Unit code coverage — JaCoCo output + CLI/MCP parity ([ad12d14b](https://github.com/abapify/adt-cli/commit/ad12d14b))
- **parity:** 15 new MCP tools + CLI↔MCP e2e test harness ([60236217](https://github.com/abapify/adt-cli/commit/60236217))
- **adt-mcp:** implement 14 medium-priority MCP tools (#M1-#M10)" ([37488b97](https://github.com/abapify/adt-cli/commit/37488b97))
- **adt-mcp:** add 12 new tools for feature parity with vibing-steampunk (#H1-#H8) ([9802206f](https://github.com/abapify/adt-cli/commit/9802206f))
- **adt-mcp:** add 7 new MCP tools and adt source CLI command ([c2bed22a](https://github.com/abapify/adt-cli/commit/c2bed22a))
- abapGit roundtrip - export, deploy, and structure support ([29859632](https://github.com/abapify/adt-cli/commit/29859632))
- **adt-mcp:** add adt-mcp package from PR #59, resolving conflicts with main ([#59](https://github.com/abapify/adt-cli/issues/59))
- **adt-mcp:** implement MCP server package with tools and mock backend ([3264eac0](https://github.com/abapify/adt-cli/commit/3264eac0))

### 🩹 Fixes

- **adt-mcp:** drop src/lib/mock shims importing private adt-fixtures ([b4af1075](https://github.com/abapify/adt-cli/commit/b4af1075))
- **adt-mcp:** move private adt-fixtures to devDependencies ([cbbffadf](https://github.com/abapify/adt-cli/commit/cbbffadf))
- **adt-mcp:** require HTTPS for HTTP transport ([#207](https://github.com/abapify/adt-cli/pull/207))
- **aunit:** send SAP coverage query bodies ([#179](https://github.com/abapify/adt-cli/pull/179))
- **adk:** release transport task via newreleasejobs, verify by reload ([#173](https://github.com/abapify/adt-cli/pull/173))
- **flow:** skip unsupported transport objects ([#166](https://github.com/abapify/adt-cli/pull/166))
- verify CTS lifecycle, task creation, and lock correlation ([#151](https://github.com/abapify/adt-cli/pull/151))
- **cts:** reconcile task and source lifecycle ([34469d91](https://github.com/abapify/adt-cli/commit/34469d91))
- **cts:** harden task creation verification ([bb8d5862](https://github.com/abapify/adt-cli/commit/bb8d5862))
- verify CTS lifecycle and task deltas ([cbe83c5b](https://github.com/abapify/adt-cli/commit/cbe83c5b))
- review thread fixes (broker, session, source-history, docs, deps) ([3d20361a](https://github.com/abapify/adt-cli/commit/3d20361a))
- **sonar:** resolve S4144, S6551, S6571, S6582, S6644, S7750, S7755, S7786, S5332 ([35b25a45](https://github.com/abapify/adt-cli/commit/35b25a45))
- **sonar:** resolve MAJOR code smells and regenerate client ([1559c2cd](https://github.com/abapify/adt-cli/commit/1559c2cd))
- **sast:** add bearer suppression and reduce registry nesting ([b0d7b17a](https://github.com/abapify/adt-cli/commit/b0d7b17a))
- **sonar/codacy:** reduce destination-mode complexity and add test wrappers ([d0c8413f](https://github.com/abapify/adt-cli/commit/d0c8413f))
- **codacy:** avoid object-injection and user-controlled URL findings ([9c3a249a](https://github.com/abapify/adt-cli/commit/9c3a249a))
- **codacy:** suppress false-positive SSRF and object-injection findings ([05c807bc](https://github.com/abapify/adt-cli/commit/05c807bc))
- **adt-mcp:** include objectUri in find_references and accept uri in get_source_version ([a1cdc51b](https://github.com/abapify/adt-cli/commit/a1cdc51b))
- **adt-mcp,adt-server,adt-server-client:** resolve ESLint errors and unsafe finally ([cfe1c434](https://github.com/abapify/adt-cli/commit/cfe1c434))
- **mcp:** bind immutable sources to capabilities ([ad45ebc4](https://github.com/abapify/adt-cli/commit/ad45ebc4))
- **adt-mcp:** freeze destination access ([8f3fc5c5](https://github.com/abapify/adt-cli/commit/8f3fc5c5))
- resolve SonarCloud reliability and duplication findings ([043824fd](https://github.com/abapify/adt-cli/commit/043824fd))
- optimize findObjectFiles index, restore transportNumber compat, dedup ImportContext ([b4fa93e2](https://github.com/abapify/adt-cli/commit/b4fa93e2))
- **adt-pilot:** address PR #121 review — docs, types, workspace deps ([#121](https://github.com/abapify/adt-cli/issues/121))
- **adt-pilot:** remove unused @mastra/mcp dep; fix URL log sanitization and docs port/env issues ([ca10c0d4](https://github.com/abapify/adt-cli/commit/ca10c0d4))
- reduce duplication, remove useless conditional, harden JSONC parser ([90efa96b](https://github.com/abapify/adt-cli/commit/90efa96b))
- address PR review — regex security, method detection, BTP 404, lint gate, specs ([b72567f3](https://github.com/abapify/adt-cli/commit/b72567f3))
- **packages:** add repository/homepage/bugs to every published package ([85b29310](https://github.com/abapify/adt-cli/commit/85b29310))
- **adt-mcp:** reject systemId mismatch in sap_connect + async resolveClient (Devin findings) ([494ab50e](https://github.com/abapify/adt-cli/commit/494ab50e))
- **adt-mcp:** don't leak locks on force=true rollback failure + docs match code (Devin findings) ([d7964a04](https://github.com/abapify/adt-cli/commit/d7964a04))
- **adt-mcp:** merge tool-call credentials in resolveClient path 3 (Devin finding) ([1f980a54](https://github.com/abapify/adt-cli/commit/1f980a54))
- **adt-mcp:** address review findings (Devin + Copilot) ([6fe50d9f](https://github.com/abapify/adt-cli/commit/6fe50d9f))
- **adt-mcp:** address Devin Review findings ([8e204700](https://github.com/abapify/adt-cli/commit/8e204700))
- **adt-mcp:** SonarCloud quality gate — reduce duplication + fix dead-code CORS branch + Dockerfile hardening ([07d76294](https://github.com/abapify/adt-cli/commit/07d76294))
- **adt-mcp:** ReDoS in Bearer extraction (CodeQL finding) ([8487f89d](https://github.com/abapify/adt-cli/commit/8487f89d))
- **adt-mcp:** lint — preserve cause + no-fallthrough on --help case ([e74d30b0](https://github.com/abapify/adt-cli/commit/e74d30b0))
- **pr-103:** address review comments — type safety, parity, harness, policy ([d5b14cd9](https://github.com/abapify/adt-cli/commit/d5b14cd9))
- **security:** resolve remaining SonarCloud hotspots + reliability bugs ([86337e36](https://github.com/abapify/adt-cli/commit/86337e36))
- **security:** replace regex XML parsing with @xmldom/xmldom — CodeQL + Sonar ([3ef1f4cf](https://github.com/abapify/adt-cli/commit/3ef1f4cf))
- **adt-mcp:** address post-merge PR 101 review findings ([a370ffa5](https://github.com/abapify/adt-cli/commit/a370ffa5))
- **adt-mcp:** address SonarCloud blockers in PR 101 ([eaaf73a1](https://github.com/abapify/adt-cli/commit/eaaf73a1))
- **adt-mcp:** resolve SonarQube quality gate failures ([1c29ef55](https://github.com/abapify/adt-cli/commit/1c29ef55))
- **adt-mcp:** format all new tool files + fix mock server route ordering ([f9c26cec](https://github.com/abapify/adt-cli/commit/f9c26cec))
- **adt-mcp:** fix missing closing parenthesis in get-table-contents schema description ([010d63b8](https://github.com/abapify/adt-cli/commit/010d63b8))
- address all PR #99 review findings ([#99](https://github.com/abapify/adt-cli/issues/99))
- **adt-mcp:** also deduplicate activate-object loop; improve QuickSearchClient JSDoc ([8601e480](https://github.com/abapify/adt-cli/commit/8601e480))
- **adt-mcp:** extract resolveObjectUri helper to eliminate code duplication ([0ee8d1a9](https://github.com/abapify/adt-cli/commit/0ee8d1a9))
- replace manual XML building and fast-xml-parser with schema-based contracts ([1abd7d99](https://github.com/abapify/adt-cli/commit/1abd7d99))
- add comment explaining DEVC case-preservation in URI resolution ([69040226](https://github.com/abapify/adt-cli/commit/69040226))
- **adt-mcp:** apply PR review feedback - not-yet-impl errors, semver deps, mock, docs ([b689cad4](https://github.com/abapify/adt-cli/commit/b689cad4))
- **adt-mcp:** resolve remaining SonarQube issues ([3ade07d0](https://github.com/abapify/adt-cli/commit/3ade07d0))
- **adt-mcp:** resolve all SonarQube issues blocking PR #59 quality gate ([#59](https://github.com/abapify/adt-cli/issues/59))

### 🧱 Updated Dependencies

- Updated adt-plugin-abapgit to 0.5.0
- Updated adt-contracts to 0.5.0
- Updated @abapify/adt-fixtures to 0.5.0
- Updated adt-services to 0.4.8
- Updated adt-schemas to 0.5.0
- Updated @abapify/adt-client to 0.5.0
- Updated @abapify/adt-config to 0.5.0
- Updated adt-plugin to 0.5.0
- Updated adt-aunit to 0.4.8
- Updated adt-locks to 0.4.8
- Updated @abapify/adt-lint to 0.4.8
- Updated adt-flow to 0.4.8
- Updated adt-rfc to 0.4.8
- Updated adk to 0.5.0

### ❤️ Thank You

- Codex @oai-codex
- Cursor @cursoragent
- Devin @devin-ai-integration[bot]
- Devin AI @devin-ai-integration[bot]
- Petr Plenkov @ThePlenkov
- ThePlenkov @ThePlenkov

## 0.4.7 (2026-09-18)

### 🩹 Fixes

- **adt-mcp:** move private adt-fixtures to devDependencies ([cbbffadf](https://github.com/abapify/adt-cli/commit/cbbffadf))

### ❤️ Thank You

- Devin @devin-ai-integration[bot]
- ThePlenkov @ThePlenkov

## 0.4.6 (2026-09-18)

This was a version bump only for adt-mcp to align it with other projects, there were no code changes.

## 0.4.5 (2026-09-17)

This was a version bump only for adt-mcp to align it with other projects, there were no code changes.

## 0.4.4 (2026-09-17)

This was a version bump only for adt-mcp to align it with other projects, there were no code changes.

## 0.4.3 (2026-09-16)

### 🩹 Fixes

- **adt-mcp:** require HTTPS for HTTP transport ([#207](https://github.com/abapify/adt-cli/pull/207))

### ❤️ Thank You

- Devin @devin-ai-integration[bot]
- Petr Plenkov @ThePlenkov
- ThePlenkov @ThePlenkov

## 0.4.2 (2026-09-08)

### 🚀 Features

- expose typed CTS transport metadata ([#186](https://github.com/abapify/adt-cli/pull/186))
- **flow:** persist complete CTS inventories ([#182](https://github.com/abapify/adt-cli/pull/182))
- **adt-mcp:** arc-1 SAPRead parity for get_source ([#162](https://github.com/abapify/adt-cli/pull/162))
- **badi:** classic BAdI read via vit/wb ([#153](https://github.com/abapify/adt-cli/pull/153), [#154](https://github.com/abapify/adt-cli/pull/154))
- **badi:** add `adt badi <name> --implementations` ([#153](https://github.com/abapify/adt-cli/pull/153))
- **cts:** create verified transport tasks ([99447319](https://github.com/abapify/adt-cli/commit/99447319))
- **adt-flow:** add incremental transport checkout ([#150](https://github.com/abapify/adt-cli/pull/150))
- **adt-mcp:** add delegated assistant read scope ([#148](https://github.com/abapify/adt-cli/pull/148))
- **adt-mcp:** add delegated assistant read scope ([b59006b4](https://github.com/abapify/adt-cli/commit/b59006b4))
- **adt-mcp:** enforce scoped safe execution ([#143](https://github.com/abapify/adt-cli/pull/143))
- **adt-mcp:** classify bounded analysis execution ([#141](https://github.com/abapify/adt-cli/pull/141))
- **adt-mcp:** classify bounded analysis execution ([f1d19e7b](https://github.com/abapify/adt-cli/commit/f1d19e7b))
- **adt-mcp:** scope autonomous agent reads ([7baa09f8](https://github.com/abapify/adt-cli/commit/7baa09f8))
- **adt-mcp:** reject raw URI read targets ([c206c1d4](https://github.com/abapify/adt-cli/commit/c206c1d4))
- **adt-mcp:** scope ATC runs without raw URIs ([6665107c](https://github.com/abapify/adt-cli/commit/6665107c))
- **adt-server:** add canonical object metadata REST ([be7857dd](https://github.com/abapify/adt-cli/commit/be7857dd))
- **mcp:** bound current source reads ([e8da7e53](https://github.com/abapify/adt-cli/commit/e8da7e53))
- **adt-mcp:** scope frozen reads to components ([2676ae8f](https://github.com/abapify/adt-cli/commit/2676ae8f))
- **adt-mcp:** enforce frozen AI Review reads ([3c19a052](https://github.com/abapify/adt-cli/commit/3c19a052))
- **adt-server:** configure signed MCP runtime ([d74109ef](https://github.com/abapify/adt-cli/commit/d74109ef))
- **adt-mcp:** verify signed invocations ([f782bf4f](https://github.com/abapify/adt-cli/commit/f782bf4f))
- **adt-mcp:** enforce destination scopes ([3bbb9bf9](https://github.com/abapify/adt-cli/commit/3bbb9bf9))
- **source-history:** add bounded ADT source history support ([04ecb578](https://github.com/abapify/adt-cli/commit/04ecb578))

### 🩹 Fixes

- **aunit:** send SAP coverage query bodies ([#179](https://github.com/abapify/adt-cli/pull/179))
- **adk:** release transport task via newreleasejobs, verify by reload ([#173](https://github.com/abapify/adt-cli/pull/173))
- **flow:** skip unsupported transport objects ([#166](https://github.com/abapify/adt-cli/pull/166))
- verify CTS lifecycle, task creation, and lock correlation ([#151](https://github.com/abapify/adt-cli/pull/151))
- **cts:** reconcile task and source lifecycle ([34469d91](https://github.com/abapify/adt-cli/commit/34469d91))
- **cts:** harden task creation verification ([bb8d5862](https://github.com/abapify/adt-cli/commit/bb8d5862))
- verify CTS lifecycle and task deltas ([cbe83c5b](https://github.com/abapify/adt-cli/commit/cbe83c5b))
- review thread fixes (broker, session, source-history, docs, deps) ([3d20361a](https://github.com/abapify/adt-cli/commit/3d20361a))
- **sonar:** resolve S4144, S6551, S6571, S6582, S6644, S7750, S7755, S7786, S5332 ([35b25a45](https://github.com/abapify/adt-cli/commit/35b25a45))
- **sonar:** resolve MAJOR code smells and regenerate client ([1559c2cd](https://github.com/abapify/adt-cli/commit/1559c2cd))
- **sast:** add bearer suppression and reduce registry nesting ([b0d7b17a](https://github.com/abapify/adt-cli/commit/b0d7b17a))
- **sonar/codacy:** reduce destination-mode complexity and add test wrappers ([d0c8413f](https://github.com/abapify/adt-cli/commit/d0c8413f))
- **codacy:** avoid object-injection and user-controlled URL findings ([9c3a249a](https://github.com/abapify/adt-cli/commit/9c3a249a))
- **codacy:** suppress false-positive SSRF and object-injection findings ([05c807bc](https://github.com/abapify/adt-cli/commit/05c807bc))
- **adt-mcp:** include objectUri in find_references and accept uri in get_source_version ([a1cdc51b](https://github.com/abapify/adt-cli/commit/a1cdc51b))
- **adt-mcp,adt-server,adt-server-client:** resolve ESLint errors and unsafe finally ([cfe1c434](https://github.com/abapify/adt-cli/commit/cfe1c434))
- **mcp:** bind immutable sources to capabilities ([ad45ebc4](https://github.com/abapify/adt-cli/commit/ad45ebc4))
- **adt-mcp:** freeze destination access ([8f3fc5c5](https://github.com/abapify/adt-cli/commit/8f3fc5c5))

### ❤️ Thank You

- Cursor @cursoragent
- Devin @devin-ai-integration[bot]
- Devin AI @devin-ai-integration[bot]
- Petr Plenkov

## 0.4.1 (2026-05-29)

This was a version bump only for adt-mcp to align it with other projects, there were no code changes.

## 0.4.0 (2026-05-29)

### 🚀 Features

- simplify import transport - comma-sep multi-TR, --save-tr-metadata, fixed deletion pass ([877d8eae](https://github.com/abapify/adt-cli/commit/877d8eae))
- transport deletion-aware import with obj_func filter and multi-TR merge ([452f03f4](https://github.com/abapify/adt-cli/commit/452f03f4))
- **adt-pilot:** add local dev stack for HTTP MCP and Mastra playground ([#120](https://github.com/abapify/adt-cli/issues/120))
- implement arc-1 parity across adt-lint, adt-contracts, adt-mcp, and adt-cli ([aeb5e8b2](https://github.com/abapify/adt-cli/commit/aeb5e8b2))

### 🩹 Fixes

- resolve SonarCloud reliability and duplication findings ([ac951739](https://github.com/abapify/adt-cli/commit/ac951739))
- optimize findObjectFiles index, restore transportNumber compat, dedup ImportContext ([4f08ee94](https://github.com/abapify/adt-cli/commit/4f08ee94))
- **adt-pilot:** address PR #121 review — docs, types, workspace deps ([#121](https://github.com/abapify/adt-cli/issues/121))
- **adt-pilot:** remove unused @mastra/mcp dep; fix URL log sanitization and docs port/env issues ([20092cee](https://github.com/abapify/adt-cli/commit/20092cee))
- reduce duplication, remove useless conditional, harden JSONC parser ([7181ab33](https://github.com/abapify/adt-cli/commit/7181ab33))
- address PR review — regex security, method detection, BTP 404, lint gate, specs ([bf634260](https://github.com/abapify/adt-cli/commit/bf634260))

### ❤️ Thank You

- Cursor @cursoragent
- Devin AI @devin-ai-integration[bot]
- Petr Plenkov
- ThePlenkov @ThePlenkov

## 0.3.6 (2026-04-21)

This was a version bump only for adt-mcp to align it with other projects, there were no code changes.

## 0.3.5 (2026-04-20)

This was a version bump only for adt-mcp to align it with other projects, there were no code changes.

## 0.3.4 (2026-04-20)

### 🩹 Fixes

- **packages:** add repository/homepage/bugs to every published package ([e1853e48](https://github.com/abapify/adt-cli/commit/e1853e48))

### ❤️ Thank You

- Petr Plenkov

## 0.3.3 (2026-04-20)

This was a version bump only for adt-mcp to align it with other projects, there were no code changes.

## 0.3.2 (2026-04-20)

This was a version bump only for adt-mcp to align it with other projects, there were no code changes.

## 0.3.1 (2026-04-20)

This was a version bump only for adt-mcp to align it with other projects, there were no code changes.

## 0.3.0 (2026-04-20)

### 🚀 Features

- **adt-mcp,adt-cli:** Wave 3 — transactional changesets (MCP + CLI parity) ([abcb5c3e](https://github.com/abapify/adt-cli/commit/abcb5c3e))
- **adt-mcp:** Wave 4 — OAuth 2.1 bearer validation (Okta / Entra ID / Cognito) ([c25374c2](https://github.com/abapify/adt-cli/commit/c25374c2))
- **adt-mcp:** Wave 1-C — migrate tools to session-aware args + getAdtClientV2Safe ([1d4bb744](https://github.com/abapify/adt-cli/commit/1d4bb744))
- **adt-mcp:** Wave 2 — HTTP auth middleware (bearer + reverse-proxy + CORS) ([caf31a5c](https://github.com/abapify/adt-cli/commit/caf31a5c))
- **adt-mcp:** Wave 1 — Streamable HTTP transport + stateful sessions + multi-system routing ([#110](https://github.com/abapify/adt-cli/issues/110))
- **gcts:** format.export — complete checkin roundtrip for gCTS — QC2 ([1f2442d8](https://github.com/abapify/adt-cli/commit/1f2442d8))
- **real-e2e:** TRL backfill sweep + WB where-used 2-step POST fix ([13e777da](https://github.com/abapify/adt-cli/commit/13e777da))
- **flp:** Fiori Launchpad read-only inventory — E14 ([aa8b42b5](https://github.com/abapify/adt-cli/commit/aa8b42b5))
- **rfc:** SOAP-over-HTTP RFC transport + adt rfc command — E13 ([45487cc4](https://github.com/abapify/adt-cli/commit/45487cc4))
- **badi:** BAdI CRUD + real-SAP e2e harness — E03 ([dd0f8ff0](https://github.com/abapify/adt-cli/commit/dd0f8ff0))
- **rap:** SRVB (Service Binding) CRUD + publish/unpublish — E12 ([f8b6c3ce](https://github.com/abapify/adt-cli/commit/f8b6c3ce))
- **rap:** SRVD (Service Definition) CRUD — E11 ([0c3cb7e1](https://github.com/abapify/adt-cli/commit/0c3cb7e1))
- **rap:** BDEF (Behavior Definition) CRUD — E10 ([af89d726](https://github.com/abapify/adt-cli/commit/af89d726))
- **gcts-cli:** gCTS command plugin — E07 ([94583dc1](https://github.com/abapify/adt-cli/commit/94583dc1))
- **checkin:** checkin via batch lock session — E08 ([027a172d](https://github.com/abapify/adt-cli/commit/027a172d))
- **strust:** STRUST PSE/cert CLI + MCP — E04 ([7a4ed04f](https://github.com/abapify/adt-cli/commit/7a4ed04f))
- **function:** FUGR/FUNC CLI + MCP — E02 ([e763d35c](https://github.com/abapify/adt-cli/commit/e763d35c))
- **incl:** INCL CLI + MCP — E01 ([ffbe4db0](https://github.com/abapify/adt-cli/commit/ffbe4db0))
- **aunit:** ABAP Unit code coverage — JaCoCo output + CLI/MCP parity ([cbc19f4e](https://github.com/abapify/adt-cli/commit/cbc19f4e))
- **parity:** 15 new MCP tools + CLI↔MCP e2e test harness ([457c3cc5](https://github.com/abapify/adt-cli/commit/457c3cc5))
- **adt-mcp:** implement 14 medium-priority MCP tools (#M1-#M10)" ([170a2f68](https://github.com/abapify/adt-cli/commit/170a2f68))
- **adt-mcp:** add 12 new tools for feature parity with vibing-steampunk (#H1-#H8) ([762e9938](https://github.com/abapify/adt-cli/commit/762e9938))
- **adt-mcp:** add 7 new MCP tools and adt source CLI command ([7c184ed1](https://github.com/abapify/adt-cli/commit/7c184ed1))

### 🩹 Fixes

- **adt-mcp:** reject systemId mismatch in sap_connect + async resolveClient (Devin findings) ([b8373868](https://github.com/abapify/adt-cli/commit/b8373868))
- **adt-mcp:** don't leak locks on force=true rollback failure + docs match code (Devin findings) ([8c2f1334](https://github.com/abapify/adt-cli/commit/8c2f1334))
- **adt-mcp:** merge tool-call credentials in resolveClient path 3 (Devin finding) ([75a7d211](https://github.com/abapify/adt-cli/commit/75a7d211))
- **adt-mcp:** address review findings (Devin + Copilot) ([49e25a2c](https://github.com/abapify/adt-cli/commit/49e25a2c))
- **adt-mcp:** address Devin Review findings ([684d5d1c](https://github.com/abapify/adt-cli/commit/684d5d1c))
- **adt-mcp:** SonarCloud quality gate — reduce duplication + fix dead-code CORS branch + Dockerfile hardening ([de6c1ccf](https://github.com/abapify/adt-cli/commit/de6c1ccf))
- **adt-mcp:** ReDoS in Bearer extraction (CodeQL finding) ([#110](https://github.com/abapify/adt-cli/issues/110))
- **adt-mcp:** lint — preserve cause + no-fallthrough on --help case ([#110](https://github.com/abapify/adt-cli/issues/110))
- **pr-103:** address review comments — type safety, parity, harness, policy ([#103](https://github.com/abapify/adt-cli/issues/103))
- **security:** resolve remaining SonarCloud hotspots + reliability bugs ([f860bddb](https://github.com/abapify/adt-cli/commit/f860bddb))
- **security:** replace regex XML parsing with @xmldom/xmldom — CodeQL + Sonar ([c72533af](https://github.com/abapify/adt-cli/commit/c72533af))
- **adt-mcp:** address post-merge PR 101 review findings ([#101](https://github.com/abapify/adt-cli/issues/101))
- **adt-mcp:** address SonarCloud blockers in PR 101 ([a001dede](https://github.com/abapify/adt-cli/commit/a001dede))
- **adt-mcp:** resolve SonarQube quality gate failures ([0c6d97c3](https://github.com/abapify/adt-cli/commit/0c6d97c3))
- **adt-mcp:** format all new tool files + fix mock server route ordering ([2818f49e](https://github.com/abapify/adt-cli/commit/2818f49e))
- **adt-mcp:** fix missing closing parenthesis in get-table-contents schema description ([d7f8b4c9](https://github.com/abapify/adt-cli/commit/d7f8b4c9))
- address all PR #99 review findings ([#99](https://github.com/abapify/adt-cli/issues/99), [#5](https://github.com/abapify/adt-cli/issues/5))
- **adt-mcp:** also deduplicate activate-object loop; improve QuickSearchClient JSDoc ([a63a4a4a](https://github.com/abapify/adt-cli/commit/a63a4a4a))
- **adt-mcp:** extract resolveObjectUri helper to eliminate code duplication ([99d4d0cd](https://github.com/abapify/adt-cli/commit/99d4d0cd))
- replace manual XML building and fast-xml-parser with schema-based contracts ([c91f3745](https://github.com/abapify/adt-cli/commit/c91f3745))
- add comment explaining DEVC case-preservation in URI resolution ([6e97dbb8](https://github.com/abapify/adt-cli/commit/6e97dbb8))

### ❤️ Thank You

- Codex @oai-codex
- Devin @devin-ai-integration[bot]
- Petr Plenkov
- ThePlenkov @ThePlenkov

## 0.2.0 (2026-04-02)

### 🚀 Features

- abapGit roundtrip - export, deploy, and structure support ([0da189a](https://github.com/abapify/adt-cli/commit/0da189a))

### ❤️ Thank You

- Devin
- Petr Plenkov
