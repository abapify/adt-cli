---
title: Installation
sidebar_position: 1
description: Install the adt CLI globally and verify the binary is on PATH.
---

# Installation

`adt` is distributed as [`@abapify/adt-cli`](https://www.npmjs.com/package/@abapify/adt-cli) on npm. It runs on any OS with a recent Node.js runtime.

## Prerequisites

| Requirement        | Minimum                                          | Notes                                                             |
| ------------------ | ------------------------------------------------ | ----------------------------------------------------------------- |
| Node.js            | 20 LTS                                           | 22 LTS recommended. Bun 1.1+ also works.                          |
| SAP system         | NetWeaver 7.50+ / S/4HANA / BTP ABAP Environment | ADT REST endpoints must be enabled (`/sap/bc/adt/*`).             |
| User authorization | Developer role with ADT access                   | For write operations: change authorization and an open transport. |

## Install

```bash
# npm
npm install -g @abapify/adt-cli

# bun
bun add -g @abapify/adt-cli

# pnpm
pnpm add -g @abapify/adt-cli

# yarn
yarn global add @abapify/adt-cli
```

Verify:

```bash
adt --version
adt --help
```

If `adt` is not found, make sure your package manager's global `bin` directory is on `PATH` (`npm config get prefix`, `bun pm bin -g`, etc.).

## Corporate proxies and private registries

If your workstation is behind a TLS-intercepting proxy or can only reach an internal mirror, point npm/bun at the mirror before installing:

```bash
# npm
npm config set registry https://your.artifactory.example.com/api/npm/npm/

# bun (per-shell)
export BUN_CONFIG_REGISTRY=https://your.artifactory.example.com/api/npm/npm/
```

:::tip
Most corporate proxies re-sign TLS with a custom CA. Install the CA into your OS trust store; both Node's `--use-openssl-ca` and `NODE_EXTRA_CA_CERTS=/path/to/ca.pem` also work.
:::

## Running from source (monorepo)

For contributors or early adopters who want the tip of `main`:

```bash
git clone https://github.com/abapify/adt-cli.git
cd adt-cli
bun install
bunx nx build adt-cli

# Run the built CLI
node packages/adt-cli/dist/bin/adt.js --help
```

See [`AGENTS.md`](https://github.com/abapify/adt-cli/blob/main/AGENTS.md) for the monorepo development conventions.

## Next steps

- [Authenticate against your first system](./auth.md)
- [Run your first commands](./first-commands.md)
- [Wire the MCP server into your AI client](./mcp-setup.md)
