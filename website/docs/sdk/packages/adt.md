---
title: '@abapify/adt'
description: Standalone single-file bundle of the adt CLI with zero runtime dependencies.
---

# `@abapify/adt`

The same `adt` CLI as [`@abapify/adt-cli`](./adt-cli.md), shipped as one
minified ESM file with every runtime dependency embedded. Use it when you want
a fast, small global install (about 12 MB instead of a full `node_modules`
tree), for example in CI images.

## Install

```bash
npm install -g @abapify/adt
adt --help
```

Requires Node.js 18 or later.

## What's inside

- The full `adt` CLI with the built-in plugins: codegen, ATC, export, diff,
  flow, abapGit and gCTS.
- `yoga.wasm`, the terminal UI layout engine, shipped next to the bundle.

Command plugins you install separately still load: `adt` resolves them from
the global `node_modules`.

## When to use `@abapify/adt-cli` instead

Install [`@abapify/adt-cli`](./adt-cli.md) when you want per-package installs
or need the programmatic services (`ImportService`, `CheckinService`, …) from
your own code.

See the [command reference](../../cli/reference/index.md) for every command.
