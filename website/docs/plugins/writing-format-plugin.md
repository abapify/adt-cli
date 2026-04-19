---
title: Writing a format plugin
sidebar_position: 2
---

# Writing a format plugin

A format plugin converts [ADK](../sdk/packages/adk) objects to and from files
on disk. It has **two generators**:

- **import** — ADK object(s) → files (used by `adt import`, `adt checkout`)
- **export** — files → ADK object(s) (used by `adt export`, `adt checkin`)

Format plugins are completely stateless and client-agnostic. They never call
the ADT server; the CLI or an export command plugin does that. A format
plugin's only job is to know the **file layout** and the **metadata schema**.

Before writing from scratch, skim the two reference implementations:

- [abapGit format](./abapgit-format) — XML metadata, XSD-driven
- [gCTS / AFF format](./gcts-format) — JSON metadata

## Plugin contract

```ts
import { createPlugin, type AdtPlugin } from '@abapify/adt-plugin';

export const myFormat = createPlugin({
  name: 'myformat',
  version: '1.0.0',
  description: 'My custom on-disk layout',

  registry: {
    isSupported: (type) => ['CLAS', 'INTF'].includes(type),
    getSupportedTypes: () => ['CLAS', 'INTF'],
  },

  format: {
    // ADK object → files on disk
    import: async (object, targetPath, ctx) => {
      // ctx.createFile(relativePath, contents) — queues a file for writing
      // ctx.resolvePackagePath(name) — walk the package hierarchy
      return {
        success: true,
        filesCreated: [
          /* relative paths */
        ],
      };
    },

    // files on disk → ADK objects (optional)
    export: async function* (fileTree /* FileTree */) {
      for (const path of await fileTree.glob('**/*.myformat.json')) {
        yield /* AdkObject */;
      }
    },
  },
});

export default myFormat;
```

The plugin **self-registers** with `@abapify/adt-plugin` on import — callers
use `getFormatPlugin('myformat')` to retrieve it.

## Handler pattern (recommended)

For formats with many object types, don't implement `import` as a giant
switch. Use the **handler pattern** both reference plugins use:

```text
format.import(object, targetPath, ctx)
  └─ lookup handler for object.kind
       └─ handler.serialize(object, ctx) → files
```

Each handler is a tiny object:

```ts
import { createHandler } from './base';
import { myschema } from '../schemas/generated';
import { AdkClass } from '@abapify/adk';

export const classHandler = createHandler(AdkClass, {
  schema: myschema, // provides type inference
  toMyFormat: (obj) => ({
    // ← whole mapping lives here
    name: obj.name,
    description: obj.description,
  }),
  getSource: (obj) => obj.getSource(), // optional: ABAP source files
});
```

The `createHandler` factory:

- Registers the handler in the plugin registry.
- Builds the metadata file via `schema.build(toMyFormat(obj))`.
- Writes source files from `getSource()` / `getSources()` with the correct
  filename convention.
- Leaves I/O to the CLI (it calls `ctx.createFile(path, contents)` — the CLI
  decides whether to actually write, dry-run, diff, etc.).

## Filename conventions

Nail these down **before writing handlers**:

| Decision                   | Example: abapgit             | Example: gcts/aff     |
| -------------------------- | ---------------------------- | --------------------- |
| Metadata extension         | `.clas.xml`                  | `.clas.json`          |
| Source extension           | `.clas.abap`                 | `.clas.abap`          |
| CDS source extension       | `.acds`                      | `.asddls` / `.asdcls` |
| Namespace encoding         | `#abapify#zfoo/`             | `(abapify)/zfoo/`     |
| Package file name          | `package.devc.xml`           | `package.devc.json`   |
| Include suffixes (classes) | `.clas.locals_def.abap` etc. | same                  |

Write the table into your plugin's README (or AGENTS) and have your
handlers match it exactly.

## Testing

All testing follows the same pattern as the abapgit plugin:

1. **Fixture tests** — real SAP XML/JSON samples under `tests/fixtures/`,
   round-tripped through parse/build. Use [`adt-fixtures`](../sdk/packages/adt-fixtures)
   where possible to share with contract tests.
2. **Handler tests** — assert that `handler.toFormat(sampleAdkObject)` yields
   the expected structure.
3. **Schema tests** — if your metadata has a schema (XSD, JSON Schema), run it
   against the fixtures to catch drift.

```ts
import { describe, it, expect } from 'vitest';
import { fixtures } from 'adt-fixtures';
import { classHandler } from '../src/lib/handlers/objects/class';

it('round-trips a class', async () => {
  const xml = await fixtures.classes.single.load();
  const parsed = myschema.parse(xml);
  const rebuilt = myschema.build(parsed);
  expect(rebuilt).toBe(xml);
});
```

## Checklist

- [ ] Plugin name is stable and lowercase (`myformat`, not `MyFormat`).
- [ ] Self-registers on import.
- [ ] `registry.getSupportedTypes()` matches what you actually handle.
- [ ] Every handler is one file under `src/lib/handlers/objects/`.
- [ ] File I/O is delegated to `ctx.createFile()` (no `fs.writeFile` in handlers).
- [ ] Fixtures live in `tests/fixtures/`, covered by round-trip tests.
- [ ] README documents the filename table.
- [ ] AGENTS.md documents the handler template for future contributors.

See the [adt-plugin-abapgit AGENTS.md](https://github.com/abapify/adt-cli/blob/main/packages/adt-plugin-abapgit/AGENTS)
for an exhaustive walkthrough of the XSD → codegen → handler pipeline.
