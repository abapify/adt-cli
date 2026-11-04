# @abapify/openai-codegen

[![npm](https://img.shields.io/npm/v/%40abapify%2Fopenai-codegen)](https://www.npmjs.com/package/@abapify/openai-codegen)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/abapify/adt-cli/blob/main/LICENSE)

Deterministic OpenAPI → ABAP client code generator. Emits a single zero-dependency ABAP class per OpenAPI spec, targeting SAP Cloud / on-prem profiles, packaged as abapGit or gCTS.

## Install

```bash
npm install -g @abapify/openai-codegen
```

## Usage

```bash
npx @abapify/openai-codegen \
  --input ./petstore3.json \
  --out ./out/abapgit \
  --base petstore3 \
  --format abapgit \
  --target s4-cloud
```

## Features

- Deterministic OpenAPI → ABAP REST client generation
- Targets SAP BTP ABAP Cloud and on-prem profiles
- Emits abapGit or gCTS packages

## Documentation

**[adt-cli.netlify.app/sdk/packages/openai-codegen](https://adt-cli.netlify.app/sdk/packages/openai-codegen)**

---

Part of [**abapify**](https://github.com/abapify/adt-cli) — open, typed tooling for SAP ABAP Development Tools (ADT): CLI, MCP server, and SDK.
