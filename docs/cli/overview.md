---
title: CLI Overview
sidebar_position: 1
description: Reference for the `adt` command-line tool.
---

# `adt` CLI Reference

`adt` is the command-line entry point to every capability exposed by SAP ABAP
Development Tools (ADT). Commands are thin wrappers around typed contracts from
[`@abapify/adt-client`](../sdk/packages/overview.md) and business services from
[`@abapify/adk`](../sdk/packages/overview.md).

Run `adt --help` or `adt <command> --help` to see the live help text; this
section documents each command group in depth.

## Global options

These options are accepted by the root `adt` command and are inherited by every
subcommand (they can appear anywhere on the command line):

| Flag | Description |
| --- | --- |
| `--sid <sid>` | SAP System ID (e.g. `BHF`, `S0D`). Overrides the default system picked by `adt auth set-default`. |
| `-v, --verbose [components]` | Enable verbose logging. Optionally filter by component name (`adt`, `http`, `auth`, ...) or `all`. |
| `--log-level <level>` | Log level: `trace`, `debug`, `info`, `warn`, `error` (default: `info`). |
| `--log-output <dir>` | Output directory for log files (default: `./tmp/logs`). |
| `--log-response-files` | Save ADT responses as separate files alongside logs. |
| `--config <path>` | Path to a config file (default: `adt.config.ts`, or `.adt/config.ts` if present). |
| `-h, --help` | Show help. |
| `-V, --version` | Print the CLI version. |

## Conventions

- **Auth is implicit.** Every command that talks to SAP calls
  [`getAdtClientV2()`](../sdk/packages/overview.md) internally; it reads the
  cached session from `~/.adt/auth.json` (written by `adt auth login`). If no
  session exists or the token has expired, the command exits with an error.
- **Object names** are upper-cased automatically — you can type `zcl_foo` or
  `ZCL_FOO`.
- **`--json`** switches machine-readable output. Most commands print a
  human-readable table/summary by default and emit a structured JSON document
  with `--json`.
- **Exit codes**: `0` = success, `1` = failure, `10` = not-found (for `stat`-style
  commands such as `adt package stat`).

## Command groups

### Authentication

| Command | Description |
| --- | --- |
| [`auth`](./auth) | `login`, `logout`, `status`, `list`, `set-default`, `refresh` |

### ABAP development objects

| Command | Description |
| --- | --- |
| [`class` / `interface` / `program` / `include`](./objects) | Classic source objects (CRUD: create / read / write / activate / delete) |
| [`domain` / `dataelement` / `table` / `structure`](./ddic) | DDIC metadata objects |
| [`ddl` / `dcl`](./cds) | CDS DDL sources and access controls |
| [`bdef` / `srvd` / `srvb`](./rap) | RAP behavior definitions, service definitions and bindings |
| [`function`](./function) | Function groups and function modules |
| [`package`](./package) | ABAP package CRUD |
| [`badi`](./badi) | BAdI / Enhancement implementations (ENHO/XHH) |

### Transports and versioning

| Command | Description |
| --- | --- |
| [`cts`](./cts-transport) | Transport requests (`tr`, `search`, `tree`) |
| [`gcts`](./gcts) | git-enabled CTS — repositories, branches, commits |

### Import / export (disk ⇄ SAP)

| Command | Description |
| --- | --- |
| [`checkout`](./checkout) | Download objects to abapGit-compatible files |
| [`checkin`](./checkin) | Push a local abapGit/gCTS directory into SAP |
| [`import`](./import) | Import an object, package, or transport |

### Source and locking

| Command | Description |
| --- | --- |
| [`source`](./source) | Read (`get`) and write (`put`) ABAP source |
| [`lock` / `unlock` / `locks`](./lock) | Lock handling |

### Testing and quality

| Command | Description |
| --- | --- |
| [`aunit`](./aunit) | Run ABAP Unit tests with coverage output (JaCoCo / Sonar) |
| [`check`](./check) | Syntax check (checkruns) |
| [`datapreview`](./datapreview) | Open SQL preview |
| [`abap run`](./abap-run) | Execute an ad-hoc ABAP snippet |

### Navigation and inspection

| Command | Description |
| --- | --- |
| [`wb`](./wb) | Workbench navigation — where-used, callers, callees, definition, outline |
| [`search`](./search) | Quick object search |
| [`get`](./get) | Resolve an object by name |
| [`ls`](./ls) | List objects in the repository or local filesystem |
| [`user`](./user) | User lookup |
| [`info`](./info) | System and session information |
| [`discovery`](./discovery) | ADT discovery document |
| [`fetch`](./fetch) | Raw authenticated HTTP request |

### Security and admin

| Command | Description |
| --- | --- |
| [`strust`](./strust) | PSE and certificate management |

### Fiori Launchpad and RFC

| Command | Description |
| --- | --- |
| [`flp`](./flp) | Fiori Launchpad inventory (read-only) |
| [`rfc`](./rfc) | SOAP-over-HTTP RFC function-module calls |

### Interactive

| Command | Description |
| --- | --- |
| [`repl`](./repl) | Interactive hypermedia navigator |

## Authenticating for the first time

```bash
adt auth login --sid DEV
# interactive: choose destination, enter credentials
adt auth status      # confirm
```

Once authenticated, every other command re-uses the cached session.
