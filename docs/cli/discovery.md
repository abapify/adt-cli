---
title: discovery
sidebar_position: 25
description: ADT discovery document.
---

# `adt discovery`

Discover available ADT services (`/sap/bc/adt/discovery`). Parses the Atom
service document that lists every ADT workspace / collection installed on the
target system.

## Options

| Flag | Description |
| --- | --- |
| `-o, --output <file>` | Save discovery data to file (JSON or XML based on extension). |
| `-f, --filter <text>` | Filter workspaces by title. |

## Examples

```bash
# Full discovery document (human table)
adt discovery

# Save the raw XML for offline analysis
adt discovery -o discovery.xml

# Only CTS-related collections, JSON
adt discovery -f CTS -o cts-endpoints.json
```

## See also

- [`info`](./info) — system metadata
- [`fetch`](./fetch) — drill into a specific endpoint
- `@abapify/adt-contracts` — typed contracts derived from discovery
