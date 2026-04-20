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
