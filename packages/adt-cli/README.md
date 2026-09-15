# @abapify/adt-cli

[![version](https://img.shields.io/github/package-json/v/abapify/adt-cli?filename=packages/adt-cli/package.json)](https://github.com/abapify/adt-cli/pkgs/npm/%40abapify%2Fadt-cli)

Command-line interface for SAP ABAP Development Tools (ADT) REST APIs.

Part of the [abapify monorepo](../../README.md).

## Installation

```bash
npm install -g @abapify/adt-cli
```

Or run without installing:

```bash
npx @abapify/adt-cli <command>
```

## Quick Start

```bash
# Authenticate with a BTP service key
adt auth login --file ./service-key.json

# Discover available ADT services
adt discovery

# List transport requests
adt transport list

# Get object details
adt get ZCL_MY_CLASS --properties

# Show object structure as a tree
adt outline ZIF_MY_INTERFACE

# Import a package from SAP to local files
adt import package ZTEST_PKG

# Export local files back to SAP
adt export package ZTEST_PKG ./abapgit-ztest_pkg --create --transport NPLK900123
```

## Commands

### Authentication

#### `adt auth login --file <path>`

Authenticate using a BTP service key file (OAuth 2.0 + PKCE).

```bash
adt auth login --file ./secrets/service-key.json
```

Service key format:

```json
{
  "clientid": "...",
  "clientsecret": "...",
  "url": "https://your-btp-instance.cfapps.eu10.hana.ondemand.com",
  "endpoints": {
    "abap": "https://your-abap-system.cfapps.eu10.hana.ondemand.com"
  },
  "uaadomain": "authentication.eu10.hana.ondemand.com"
}
```

Tokens are stored in `~/.config/adt-cli/` (Linux/macOS) or `%APPDATA%/adt-cli/` (Windows).

#### `adt auth logout`

Clear stored authentication tokens.

### Service Discovery

#### `adt discovery [options]`

List available ADT services and endpoints.

| Option                | Description                                               |
| --------------------- | --------------------------------------------------------- |
| `-o, --output <file>` | Save output — `.xml` for raw XML, `.json` for parsed JSON |

```bash
adt discovery
adt discovery -o services.json
```

### Package Import / Export

#### `adt import package <packageName> [targetFolder] [options]`

Download an ABAP package from SAP to local files.

| Option                       | Description                             |
| ---------------------------- | --------------------------------------- |
| `-o, --output <path>`        | Output directory                        |
| `-t, --object-types <types>` | Comma-separated types, e.g. `CLAS,INTF` |
| `--sub-packages`             | Include subpackages                     |
| `--format <format>`          | `abapgit` (default)                     |
| `--debug`                    | Debug output                            |

```bash
adt import package ZTEST_PKG
adt import package ZTEST_PKG --object-types CLAS,INTF --format abapgit
```

#### `adt export package <packageName> [sourceFolder] [options]`

Deploy local files to SAP.

| Option                       | Description                        |
| ---------------------------- | ---------------------------------- |
| `-i, --input <path>`         | Input directory                    |
| `-t, --object-types <types>` | Filter by type                     |
| `--transport <request>`      | Transport request                  |
| `--create`                   | Apply changes (default is dry run) |
| `--debug`                    | Debug output                       |

```bash
# Dry run
adt export package ZTEST_PKG ./abapgit-ztest_pkg

# Deploy with transport
adt export package ZTEST_PKG ./abapgit-ztest_pkg --create --transport NPLK900123
```

### Object Inspection

#### `adt get <object> [options]`

Get details about an ABAP object. Supported types: `CLAS`, `INTF`, `DEVC`.

| Option                | Description                                      |
| --------------------- | ------------------------------------------------ |
| `--source`            | Show source code preview                         |
| `--structure`         | Show object structure                            |
| `--properties`        | Show package hierarchy and application component |
| `--json`              | JSON output                                      |
| `-o, --output <file>` | Save ADT XML to file                             |

```bash
adt get ZCL_MY_CLASS
adt get ZCL_MY_CLASS --properties
adt get ZCL_MY_CLASS -o tmp/class.xml
```

#### `adt check <object...> [options]`

Run SAP ADT syntax checks. Existing objects are checked using their inactive
source by default; select another source explicitly with
`--source-version active|inactive|new`. The name avoids colliding with the
root `adt --version` flag.

With `--json`, stdout contains only the report array. SAP error/abort messages
(`E`/`A`) keep that JSON readable and set a non-zero process exit status.

```bash
adt check ZCL_MY_CLASS --type CLAS
adt check ZCL_MY_CLASS --type CLAS --source-version active --json
```

#### `adt outline <object>`

Show object structure as a tree (methods, attributes, visibility).

```
ℹ️  ZIF_MY_INTERFACE [interface]
├─ 🟢  GET_DATA [public method]
└─ 🔴  INTERNAL_HELPER [private method]
```

### Transport Requests

`adt transport` has `adt tr` as an alias.

#### `adt transport list [options]`

| Option                  | Description                |
| ----------------------- | -------------------------- |
| `-u, --user <user>`     | Filter by user             |
| `-s, --status <status>` | `modifiable` or `released` |
| `-m, --max <n>`         | Max results (default: 50)  |

#### `adt transport get <tr-number> [options]`

Get details for a transport request or task.

| Option    | Description          |
| --------- | -------------------- |
| `--tasks` | Include task details |
| `--json`  | JSON output          |

#### `adt transport create [options]`

| Option                     | Description                                   |
| -------------------------- | --------------------------------------------- |
| `-d, --description <desc>` | Description (required)                        |
| `-t, --type <type>`        | `K` (Workbench, default) or `W` (Customizing) |
| `--target <target>`        | Target system (default: `LOCAL`)              |

#### `adt cts tr task create <transport> <owner> [options]`

Create a modifiable task under an existing request and verify the new task by
reading the parent request back from SAP.

```bash
adt cts tr task create DEVK900001 DEVELOPER
adt cts tr task create DEVK900001 DEVELOPER --json
```

| Option   | Description           |
| -------- | --------------------- |
| `--json` | JSON result on stdout |

### Exact source history

Source-history commands follow immutable links returned by SAP ADT. Listing
versions and building a manifest return metadata and provenance only; ABAP
source is downloaded only by the explicit `source version get` command.

```bash
# List every source component and its immutable version metadata
adt source versions ZCL_MY_CLASS --type CLAS --json

# Restrict the listing to one exact component id
adt source versions ZCL_MY_CLASS --type CLAS \
  --component implementations --json

# Read one immutable version to stdout or a file
adt source version get --uri /sap/bc/adt/.../versions/2 --output -
adt source version get --uri /sap/bc/adt/.../versions/2 --output before.abap

# Build one metadata-only manifest for an ordered transport set
adt cts tr source-manifest DEVK900001,DEVK900002 --json
adt cts tr source-manifest DEVK900001 \
  --also-transport DEVK900002,DEVK900003 --json
```

Each manifest component has an explicit state:

| State         | Meaning                                                     |
| ------------- | ----------------------------------------------------------- |
| `added`       | Exact in-scope head exists and has no older base            |
| `modified`    | Exact base and head were selected                           |
| `deleted`     | CTS marks deletion and an exact recoverable base exists     |
| `unchanged`   | No source change is represented                             |
| `ambiguous`   | Provenance or ordering cannot prove an isolated exact delta |
| `unsupported` | SAP metadata exposes no usable versioned source component   |
| `failed`      | SAP rejected metadata/history retrieval for the component   |

`ambiguous` and `unsupported` are explicit non-exact results and leave the
command successful. If any entry is `failed`, the complete manifest is still
printed and the command exits non-zero. Structured output and diagnostics never
contain credentials or source bodies.

## Configuration

Create `adt.config.ts` in your project root for TypeScript configuration with full type checking:

```typescript
import type { CliConfig } from '@abapify/adt-cli/config/interfaces';

const config: CliConfig = {
  auth: {
    type: 'btp',
    btp: {
      serviceKey: process.env.BTP_SERVICE_KEY_PATH || './service-key.json',
    },
  },
  defaults: {
    format: 'abapgit',
    outputPath: './output',
  },
};

export default config;
```

YAML is also supported (`adt.config.yaml`).

## Logging

```bash
# Set log level
ADT_LOG_LEVEL=debug adt discovery

# Enable verbose mode
adt transport list --verbose

# Filter log components
ADT_LOG_COMPONENTS=auth,http adt auth login --file service-key.json
```

Available log levels: `trace`, `debug`, `info`, `warn`, `error`, `fatal`.

For SAP operations that legitimately take longer than the native HTTP client's
response-header timeout, set a positive millisecond value:

```bash
ADT_HEADERS_TIMEOUT_MS=900000 adt aunit --transport NPLK900042
```

Leave the variable unset (or set it to an empty string) for the native
default — both are treated equivalently. Invalid, zero, or fractional
values fail before the request is sent.

## Command Reference

| Command                             | Description                       |
| ----------------------------------- | --------------------------------- |
| `adt auth login --file <path>`      | Authenticate with BTP service key |
| `adt auth logout`                   | Clear stored tokens               |
| `adt discovery`                     | List available ADT services       |
| `adt discovery -o file.json`        | Export services as JSON           |
| `adt get <object>`                  | Get ABAP object details           |
| `adt get <object> --properties`     | Show package and component info   |
| `adt get <object> -o file.xml`      | Save ADT XML to file              |
| `adt outline <object>`              | Show object tree structure        |
| `adt import package <pkg>`          | Import package from SAP           |
| `adt export package <pkg> --create` | Deploy files to SAP               |
| `adt transport list`                | List transport requests           |
| `adt transport get <TR>`            | Get transport or task details     |
| `adt transport create -d "DESC"`    | Create new transport request      |

## Architecture

```
adt-cli (Commander.js, plugin loader)
  ├── adt-client   (HTTP + auth interceptor)
  │     └── adt-contracts + adt-schemas
  ├── adk          (ABAP object parsing)
  ├── adt-auth     (session management)
  └── plugins      (adt-atc, adt-export, adt-plugin-abapgit)
```

## License

MIT
