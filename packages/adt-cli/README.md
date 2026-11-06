# @abapify/adt-cli

[![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-cli)](https://www.npmjs.com/package/@abapify/adt-cli)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/abapify/adt-cli/blob/main/LICENSE)

Command-line interface for SAP ABAP Development Tools — the adt binary, plus plugin loader and top-level service layer.

## Install

```bash
npm install -g @abapify/adt-cli
```

## Usage

```bash
adt auth login                       # connect a system
adt search "ZCL_*"                   # find objects
adt source get ZCL_MY_CLASS          # read source
adt checkout package ZMY_PKG ./src   # SAP → abapGit files
adt checkin ./src                    # files → SAP
```

## Features

- Repository search, source read/write, activation, and transports
- abapGit / gCTS checkout and checkin
- ATC, ABAP Unit, and coverage with CI-friendly output
- Extensible with command plugins via `adt.config.ts`

## YAML configuration

The configuration loader also supports `adt.config.yaml` and `adt.config.yml`.
YAML uses the data-only core schema: plain dates remain strings, anchors and
merge keys are supported, and duplicate keys, cyclic values, excessive alias
expansion, and tags outside that schema are rejected. Environment references
such as `${OUTPUT_PATH}` are expanded after parsing. Use `adt.config.ts` when
configuration requires executable code rather than YAML data.

## Documentation

**[adt-cli.netlify.app/cli/overview](https://adt-cli.netlify.app/cli/overview)**

---

Part of [**abapify**](https://github.com/abapify/adt-cli) — open, typed tooling for SAP ABAP Development Tools (ADT): CLI, MCP server, and SDK.
