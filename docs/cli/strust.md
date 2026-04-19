---
title: strust
sidebar_position: 27
description: STRUST SSL certificate management.
---

# `adt strust`

STRUST SSL certificate management — Personal Security Environments (PSEs) and
X.509 certificates. Wraps `/sap/bc/adt/security/strust`.

## Subcommands

| Command | Description |
| --- | --- |
| `adt strust list` | List Personal Security Environments (STRUST identities). |
| `adt strust get <context> <applic>` | List certificates installed in a PSE. |
| `adt strust put <context> <applic> <pem-file>` | Upload a PEM-encoded certificate into a PSE. |
| `adt strust delete <context> <applic> <cert-id>` | Delete a certificate from a PSE. |

The `<context>` is the PSE context (e.g. `SSLC` for SSL-client anonymous,
`SSLS` for SSL-server) and `<applic>` is the application (e.g. `DFAULT`,
`ANONYM`).

## Options

### `list`

| Flag | Description |
| --- | --- |
| `--json` | Output results as JSON. |

### `get <context> <applic>`

| Flag | Description |
| --- | --- |
| `--json` | Output as JSON. |

### `put <context> <applic> <pem-file>`

| Flag | Description |
| --- | --- |
| `<pem-file>` | Path to a PEM-encoded X.509 certificate file. |
| `--json` | Output as JSON. |

### `delete <context> <applic> <cert-id>`

| Flag | Description |
| --- | --- |
| `<cert-id>` | Certificate id (from `adt strust get`). |
| `-y, --yes` | Skip confirmation prompt (default: `false`). |
| `--json` | Output as JSON. |

## Examples

```bash
# Inspect available PSEs
adt strust list

# List certs in the anonymous SSL client PSE
adt strust get SSLC ANONYM

# Trust a new CA
adt strust put SSLC ANONYM ./ca-bundle.pem

# Remove a specific cert by id
adt strust delete SSLC ANONYM 123456789 -y
```

## See also

- <!-- TODO: link after D1b --> MCP tool `strust_list`
- SAP Note 510007 — STRUST basics
