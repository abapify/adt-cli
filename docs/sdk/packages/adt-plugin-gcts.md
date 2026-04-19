---
title: '@abapify/adt-plugin-gcts'
description: gCTS / AFF format plugin.
---

# `@abapify/adt-plugin-gcts`

FormatPlugin implementing the gCTS / AFF (ABAP File Format) on-disk layout.
Self-registers on import.

## Install

```bash
bun add @abapify/adt-plugin-gcts
```

## Public API

```ts
export { gctsFormatPlugin } from '@abapify/adt-plugin-gcts';
export { gctsPlugin, GctsPlugin, default } from '@abapify/adt-plugin-gcts';

export {
  getHandler, getSupportedTypes, isSupported, createHandler,
} from '@abapify/adt-plugin-gcts';
```

## Usage

```bash
adt export --format gcts ./src --transport DEVK900001
```

## Dependencies

- `@abapify/adt-plugin`, `@abapify/adk`

## See also

- [`adt-plugin-abapgit`](./adt-plugin-abapgit), [`adt-plugin-gcts-cli`](./adt-plugin-gcts-cli)
- [gCTS contracts](../contracts/gcts)
