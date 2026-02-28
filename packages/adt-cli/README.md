# @abapify/adt-cli

[![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-cli)](https://www.npmjs.com/package/@abapify/adt-cli)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue)](../../LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)](https://www.typescriptlang.org/)

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
adt export package ZTEST_PKG ./oat-ztest_pkg --create --transport NPLK900123
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

| Option | Description |
|--------|-------------|
| `-o, --output <file>` | Save output — `.xml` for raw XML, `.json` for parsed JSON |

```bash
adt discovery
adt discovery -o services.json
```

### Package Import / Export

#### `adt import package <packageName> [targetFolder] [options]`

Download an ABAP package from SAP to local files.

| Option | Description |
|--------|-------------|
| `-o, --output <path>` | Output directory |
| `-t, --object-types <types>` | Comma-separated types, e.g. `CLAS,INTF` |
| `--sub-packages` | Include subpackages |
| `--format <format>` | `oat` (default) \| `abapgit` \| `json` |
| `--debug` | Debug output |

```bash
adt import package ZTEST_PKG
adt import package ZTEST_PKG --object-types CLAS,INTF --format oat
```

#### `adt export package <packageName> [sourceFolder] [options]`

Deploy local files to SAP.

| Option | Description |
|--------|-------------|
| `-i, --input <path>` | Input directory |
| `-t, --object-types <types>` | Filter by type |
| `--transport <request>` | Transport request |
| `--create` | Apply changes (default is dry run) |
| `--debug` | Debug output |

```bash
# Dry run
adt export package ZTEST_PKG ./oat-ztest_pkg

# Deploy with transport
adt export package ZTEST_PKG ./oat-ztest_pkg --create --transport NPLK900123
```

### Object Inspection

#### `adt get <object> [options]`

Get details about an ABAP object. Supported types: `CLAS`, `INTF`, `DEVC`.

| Option | Description |
|--------|-------------|
| `--source` | Show source code preview |
| `--structure` | Show object structure |
| `--properties` | Show package hierarchy and application component |
| `--json` | JSON output |
| `-o, --output <file>` | Save ADT XML to file |

```bash
adt get ZCL_MY_CLASS
adt get ZCL_MY_CLASS --properties
adt get ZCL_MY_CLASS -o tmp/class.xml
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

| Option | Description |
|--------|-------------|
| `-u, --user <user>` | Filter by user |
| `-s, --status <status>` | `modifiable` or `released` |
| `-m, --max <n>` | Max results (default: 50) |

#### `adt transport get <tr-number> [options]`

Get details for a transport request or task.

| Option | Description |
|--------|-------------|
| `--tasks` | Include task details |
| `--json` | JSON output |

#### `adt transport create [options]`

| Option | Description |
|--------|-------------|
| `-d, --description <desc>` | Description (required) |
| `-t, --type <type>` | `K` (Workbench, default) or `W` (Customizing) |
| `--target <target>` | Target system (default: `LOCAL`) |

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
    format: 'oat',
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

## Command Reference

| Command | Description |
|---------|-------------|
| `adt auth login --file <path>` | Authenticate with BTP service key |
| `adt auth logout` | Clear stored tokens |
| `adt discovery` | List available ADT services |
| `adt discovery -o file.json` | Export services as JSON |
| `adt get <object>` | Get ABAP object details |
| `adt get <object> --properties` | Show package and component info |
| `adt get <object> -o file.xml` | Save ADT XML to file |
| `adt outline <object>` | Show object tree structure |
| `adt import package <pkg>` | Import package from SAP |
| `adt export package <pkg> --create` | Deploy files to SAP |
| `adt transport list` | List transport requests |
| `adt transport get <TR>` | Get transport or task details |
| `adt transport create -d "DESC"` | Create new transport request |

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

