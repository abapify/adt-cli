---
title: SDK Packages
sidebar_position: 1
---

# SDK Packages

Every workspace package under `@abapify/*` is documented here. Packages fall into
a few layers:

| Layer | Packages |
|-------|----------|
| Foundation | [`ts-xsd`](./ts-xsd), [`speci`](./speci), [`logger`](./logger), [`asjson-parser`](./asjson-parser) |
| Schemas & contracts | [`adt-schemas`](./adt-schemas), [`adt-contracts`](./adt-contracts), [`adt-fixtures`](./adt-fixtures) |
| Client & locks | [`adt-client`](./adt-client), [`adt-locks`](./adt-locks), [`adt-config`](./adt-config) |
| Object model | [`adk`](./adk), [`acds`](./acds) |
| Auth | [`adt-auth`](./adt-auth), [`browser-auth`](./browser-auth), [`adt-playwright`](./adt-playwright), [`adt-puppeteer`](./adt-puppeteer) |
| Plugins | [`adt-plugin`](./adt-plugin), [`adt-plugin-abapgit`](./adt-plugin-abapgit), [`adt-plugin-gcts`](./adt-plugin-gcts), [`adt-plugin-gcts-cli`](./adt-plugin-gcts-cli) |
| Domain CLI plugins | [`adt-atc`](./adt-atc), [`adt-aunit`](./adt-aunit), [`adt-diff`](./adt-diff), [`adt-export`](./adt-export) |
| Transports | [`adt-rfc`](./adt-rfc) |
| Developer tools | [`adt-codegen`](./adt-codegen), [`adt-tui`](./adt-tui) |
| Applications | [`adt-cli`](./adt-cli), [`adt-mcp`](./adt-mcp) |

## Package index

| Package | Tagline |
|---------|---------|
| [`@abapify/acds`](./acds) | ABAP CDS DDL source parser (lexer, parser, typed AST). |
| [`@abapify/adk`](./adk) | ABAP Development Kit — object model (AdkClass, AdkInterface, …) and save/lock orchestration. |
| [`@abapify/adt-atc`](./adt-atc) | ATC (ABAP Test Cockpit) CLI plugin with SARIF / GitLab Code Quality output. |
| [`@abapify/adt-aunit`](./adt-aunit) | ABAP Unit CLI plugin with JUnit XML output for GitLab CI. |
| [`@abapify/adt-auth`](./adt-auth) | Auth manager, storage, and built-in auth plugins (basic, service-key, …). |
| [`@abapify/adt-cli`](./adt-cli) | The `adt` CLI binary and programmatic service API. |
| [`@abapify/adt-client`](./adt-client) | Typed REST client generated from `adt-contracts`. |
| [`@abapify/adt-codegen`](./adt-codegen) | Hook-based codegen toolkit (OpenAPI, collections, schemas, types). |
| [`@abapify/adt-config`](./adt-config) | Loader for `adt.config.ts` destinations and plugin wiring. |
| [`@abapify/adt-contracts`](./adt-contracts) | `speci`-based ADT REST API contract descriptors. |
| [`@abapify/adt-diff`](./adt-diff) | Diff CLI plugin: compare local files vs SAP remote source. |
| [`@abapify/adt-export`](./adt-export) | Export / round-trip / activate CLI commands. |
| [`@abapify/adt-fixtures`](./adt-fixtures) | Real SAP XML fixtures and the mock ADT HTTP server. |
| [`@abapify/adt-locks`](./adt-locks) | Lock/unlock service, batch-lock sessions, lock stores. |
| [`@abapify/adt-mcp`](./adt-mcp) | MCP server exposing ADT operations to AI clients. |
| [`@abapify/adt-playwright`](./adt-playwright) | Playwright-based browser SSO auth plugin. |
| [`@abapify/adt-plugin`](./adt-plugin) | Plugin interfaces (Format + CLI-command plugins) and registry. |
| [`@abapify/adt-plugin-abapgit`](./adt-plugin-abapgit) | abapGit format plugin (serialize/deserialize ABAP objects). |
| [`@abapify/adt-plugin-gcts`](./adt-plugin-gcts) | gCTS/AFF format plugin. |
| [`@abapify/adt-plugin-gcts-cli`](./adt-plugin-gcts-cli) | `adt gcts …` CLI command plugin. |
| [`@abapify/adt-puppeteer`](./adt-puppeteer) | Puppeteer-based browser SSO auth plugin. |
| [`@abapify/adt-rfc`](./adt-rfc) | SOAP-over-HTTP RFC transport (separate from `/sap/bc/adt`). |
| [`@abapify/adt-schemas`](./adt-schemas) | W3C XSD-generated TypedSchemas for SAP ADT XML. |
| [`@abapify/adt-tui`](./adt-tui) | Ink/React terminal UI framework for ADT navigation. |
| [`@abapify/asjson-parser`](./asjson-parser) | ABAP Simple-JSON (`ASJSON`) parser. |
| [`@abapify/browser-auth`](./browser-auth) | Browser SSO core shared by Playwright/Puppeteer adapters. |
| [`@abapify/logger`](./logger) | Minimal Logger interface and `NoOp`/`Console` implementations. |
| [`@abapify/speci`](./speci) | Zero-DSL contract specification primitives (REST + generator). |
| [`@abapify/ts-xsd`](./ts-xsd) | W3C XSD 1.1 parser, builder, and type inference. |
