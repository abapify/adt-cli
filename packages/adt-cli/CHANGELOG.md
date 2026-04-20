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
