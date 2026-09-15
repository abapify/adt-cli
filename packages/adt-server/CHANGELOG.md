## 0.4.2 (2026-09-08)

### 🚀 Features

- **flow:** persist complete CTS inventories ([#182](https://github.com/abapify/adt-cli/pull/182))
- **badi:** classic BAdI read via vit/wb ([#153](https://github.com/abapify/adt-cli/pull/153), [#154](https://github.com/abapify/adt-cli/pull/154))
- **adt-mcp:** add delegated assistant read scope ([#148](https://github.com/abapify/adt-cli/pull/148))
- **adt-server:** wire safe_execute hooks from environment URLs ([#146](https://github.com/abapify/adt-cli/pull/146))
- **adt-mcp:** enforce scoped safe execution ([#143](https://github.com/abapify/adt-cli/pull/143))
- **adt-server:** generate typed REST client ([7ac85f6c](https://github.com/abapify/adt-cli/commit/7ac85f6c))
- **adt-server:** add canonical ATC REST ([0c16a8f3](https://github.com/abapify/adt-cli/commit/0c16a8f3))
- **adt-server:** add bounded object source REST ([05ce2705](https://github.com/abapify/adt-cli/commit/05ce2705))
- **adt-server:** add canonical object history REST ([40ba0aa5](https://github.com/abapify/adt-cli/commit/40ba0aa5))
- **adt-server:** add canonical object metadata REST ([be7857dd](https://github.com/abapify/adt-cli/commit/be7857dd))
- **adt-server:** page direct package objects ([f7971303](https://github.com/abapify/adt-cli/commit/f7971303))
- **adt-server:** require shared REST state secrets ([d031b846](https://github.com/abapify/adt-cli/commit/d031b846))
- **adt-server:** paginate canonical object search ([9e43a2ad](https://github.com/abapify/adt-cli/commit/9e43a2ad))
- **adt-server:** paginate canonical package search ([96c41c30](https://github.com/abapify/adt-cli/commit/96c41c30))
- **adt-server:** schema capability source responses ([28a77ab5](https://github.com/abapify/adt-cli/commit/28a77ab5))
- **adt-server:** add canonical transport detail REST ([d6a74218](https://github.com/abapify/adt-cli/commit/d6a74218))
- **adt-server:** release broker leases with audit ([90a43953](https://github.com/abapify/adt-cli/commit/90a43953))
- **adt-server:** normalize system transport search ([e9b0779e](https://github.com/abapify/adt-cli/commit/e9b0779e))
- **adt-server:** allow local REST bearer auth ([eff9104d](https://github.com/abapify/adt-cli/commit/eff9104d))
- **adt-server:** add capability-bound source reads ([c07df84d](https://github.com/abapify/adt-cli/commit/c07df84d))
- **adt-mcp:** enforce frozen AI Review reads ([3c19a052](https://github.com/abapify/adt-cli/commit/3c19a052))
- **adt-server:** configure signed MCP runtime ([d74109ef](https://github.com/abapify/adt-cli/commit/d74109ef))
- **adt-server:** add guarded MCP sidecar ([ebd6f5f5](https://github.com/abapify/adt-cli/commit/ebd6f5f5))

### 🩹 Fixes

- **server:** propagate request cancellation through ADT Server ([#160](https://github.com/abapify/adt-cli/pull/160))
- **adt-server:** guard capability services behind rest/mcp, share secret assertion ([d43cc8a1](https://github.com/abapify/adt-cli/commit/d43cc8a1))
- **adt-server:** require capability secrets in startAdtServer, use test helper in server tests ([d491cfae](https://github.com/abapify/adt-cli/commit/d491cfae))
- **source-capabilities:** require explicit secret or allowEphemeralSecret opt-in ([c421fba2](https://github.com/abapify/adt-cli/commit/c421fba2))
- **broker:** use node:https for UAA token to avoid Codacy fetch SSRF false positive ([f30fabc8](https://github.com/abapify/adt-cli/commit/f30fabc8))
- **broker:** use nosemgrep to suppress validated UAA fetch finding ([73829783](https://github.com/abapify/adt-cli/commit/73829783))
- **broker:** suppress Codacy SSRF false positive after UAA URL validation ([53a01945](https://github.com/abapify/adt-cli/commit/53a01945))
- review thread fixes (broker, session, source-history, docs, deps) ([3d20361a](https://github.com/abapify/adt-cli/commit/3d20361a))
- **sonar:** resolve S4144, S6551, S6571, S6582, S6644, S7750, S7755, S7786, S5332 ([35b25a45](https://github.com/abapify/adt-cli/commit/35b25a45))
- **sonar:** resolve MAJOR code smells and regenerate client ([1559c2cd](https://github.com/abapify/adt-cli/commit/1559c2cd))
- **sonar:** add assertions to tests and suppress remaining complexity findings ([983b2dd7](https://github.com/abapify/adt-cli/commit/983b2dd7))
- **sonar:** resolve S2187 tests and triage cognitive complexity with NOSONAR ([25c39e09](https://github.com/abapify/adt-cli/commit/25c39e09))
- **adt-server:** pass explicit authTagLength to aes-256-gcm decipher ([5186a0d4](https://github.com/abapify/adt-cli/commit/5186a0d4))
- **adt-mcp,adt-server,adt-server-client:** resolve ESLint errors and unsafe finally ([cfe1c434](https://github.com/abapify/adt-cli/commit/cfe1c434))

### ❤️ Thank You

- Cursor @cursoragent
- Devin AI @devin-ai-integration[bot]
- Petr Plenkov
- ThePlenkov
