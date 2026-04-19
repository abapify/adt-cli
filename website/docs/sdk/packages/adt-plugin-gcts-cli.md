---
title: '@abapify/adt-plugin-gcts-cli'
description: '`adt gcts …` CLI command plugin.'
---

# `@abapify/adt-plugin-gcts-cli`

CLI command plugin that adds the `adt gcts …` subcommand tree (clone, pull,
push, branch, commit, config, …) mirroring the sapcli surface.

## Install

```bash
bun add @abapify/adt-plugin-gcts-cli
```

```ts
// adt.config.ts
export default { commands: ['@abapify/adt-plugin-gcts-cli'] };
```

## Public API

```ts
export { gctsCommand, default } from '@abapify/adt-plugin-gcts-cli';
export type { GctsClient } from '@abapify/adt-plugin-gcts-cli';
```

## Usage

```bash
adt gcts repository list
adt gcts repository clone git@github.com/foo/bar.git
adt gcts branches switch <rid> main
```

## Dependencies

- `@abapify/adt-plugin`, `@abapify/adt-client`, `@abapify/adt-contracts` (gCTS namespace)

## See also

- [gCTS contracts](../contracts/gcts), [`adt-plugin-gcts`](./adt-plugin-gcts)
