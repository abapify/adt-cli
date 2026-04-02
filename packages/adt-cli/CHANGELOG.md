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
