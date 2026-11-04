# @abapify/adt-aunit

[![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-aunit)](https://www.npmjs.com/package/@abapify/adt-aunit)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/abapify/adt-cli/blob/main/LICENSE)

ABAP Unit Test CLI plugin for adt-cli with JUnit XML output for GitLab CI.

## Install

```bash
npm install @abapify/adt-aunit @abapify/adt-cli
```

## Usage

Register the command plugin in your project config:

```ts
// adt.config.ts
export default {
  commands: ['@abapify/adt-aunit/commands/aunit'],
};
```

Then:

```bash
adt aunit --package ZMY_PKG --format junit --output aunit.xml
```

## Features

- Run ABAP Unit tests from the terminal or CI
- JUnit and Sonar test reports for CI
- ABAP code coverage as JaCoCo or Sonar generic format

## Documentation

**[adt-cli.netlify.app/sdk/packages/adt-aunit](https://adt-cli.netlify.app/sdk/packages/adt-aunit)**

---

Part of [**abapify**](https://github.com/abapify/adt-cli) — open, typed tooling for SAP ABAP Development Tools (ADT): CLI, MCP server, and SDK.
