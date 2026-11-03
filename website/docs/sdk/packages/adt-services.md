---
title: '@abapify/adt-services'
description: 'Transport-agnostic ADT service layer shared by adt-cli and adt-mcp'
---

# `@abapify/adt-services`

Transport-agnostic ADT service layer shared by adt-cli and adt-mcp

## Install

```bash
bun add @abapify/adt-services
```

## What's inside

| Export                    | Purpose                                             |
| ------------------------- | --------------------------------------------------- |
| `services/connection`     | ADT connection/discovery helpers                    |
| `services/source`         | Source read/write with the SAP lock protocol        |
| `services/source-history` | Source version history                              |
| `services/check`          | ATC-style syntax checks                             |
| `services/checkin`        | Plan/diff/apply local changes to SAP                |
| `services/changeset`      | Transactional batch operations                      |
| `services/import`         | Transport/object import into the filesystem         |
| `services/cts`            | CTS transport queries                               |
| `services/badi`           | BAdI implementation workflows                       |
| `services/classic-badi`   | Classic BAdI workflows                              |
| `utils/adt-client-v2`     | `getAdtClientV2()` — authenticated v2 client helper |
| `utils/auth`              | `~/.adt` session/credential bridge                  |
| `utils/destinations`      | Destination resolution                              |
| `utils/format-loader`     | Object format plugin loading                        |
| `utils/lock-helpers`      | Lock/unlock convenience wrappers                    |
| `utils/progress-reporter` | Structured progress callbacks for transports        |

## Usage

```ts
import { getAdtClientV2, SourceService } from '@abapify/adt-services';

const client = getAdtClientV2();
const source = new SourceService();
const result = await source.read(client, '/sap/bc/adt/oo/classes/zcl_test');
```

## Architecture

```
adt-cli (commander) ──┐
                      ├──► @abapify/adt-services ──► adt-client / adk / adt-locks
adt-mcp (MCP tools) ──┘
```

The reverse direction (`adt-services` → `adt-cli`/`adt-mcp`) is forbidden.
`@abapify/adt-cli` re-exports these services from its own `index.ts` for
backwards compatibility.

## Source

- Source: [`packages/adt-services`](https://github.com/abapify/adt-cli/blob/main/packages/adt-services)
- README: [`packages/adt-services/README.md`](https://github.com/abapify/adt-cli/blob/main/packages/adt-services/README.md)
