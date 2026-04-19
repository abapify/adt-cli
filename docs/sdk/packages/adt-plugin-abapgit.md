---
title: '@abapify/adt-plugin-abapgit'
description: abapGit format plugin — serialize/deserialize ABAP objects.
---

# `@abapify/adt-plugin-abapgit`

FormatPlugin implementing the abapGit on-disk layout (XML + source files)
for all supported object types. Self-registers into the global `FormatPlugin`
registry on import.

## Install

```bash
bun add @abapify/adt-plugin-abapgit
```

## Public API

```ts
export { abapgitFormatPlugin } from '@abapify/adt-plugin-abapgit';
export { abapGitPlugin, AbapGitPlugin } from '@abapify/adt-plugin-abapgit';
export { createFindingResolver } from '@abapify/adt-plugin-abapgit';

// Handler registry
export {
  getHandler, isSupported, getSupportedTypes,
} from '@abapify/adt-plugin-abapgit';
export type { SerializedFile, ObjectHandler } from '@abapify/adt-plugin-abapgit';

// Utilities
export { parseAbapGitFilename } from '@abapify/adt-plugin-abapgit';
export { adtUriToAbapGitPath } from '@abapify/adt-plugin-abapgit';
```

## Usage

```ts
import '@abapify/adt-plugin-abapgit';  // self-registers
// Then use through adt-cli: adt export --format abapgit
```

## Dependencies

- `@abapify/adt-plugin`, `@abapify/adk`, `@abapify/acds`

## See also

- Package internals: [`packages/adt-plugin-abapgit/AGENTS.md`](https://github.com/abapify/adt-cli/blob/main/packages/adt-plugin-abapgit/AGENTS.md)
- [`adt-plugin-gcts`](./adt-plugin-gcts), [`acds`](./acds)
