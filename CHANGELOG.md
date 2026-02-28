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
