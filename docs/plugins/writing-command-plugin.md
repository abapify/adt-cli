---
title: Writing a command plugin
sidebar_position: 1
---

# Writing a command plugin

A command plugin adds one (or more) subcommands to `adt`. It's a pure ESM
module implementing [`CliCommandPlugin`](../sdk/packages/adt-plugin), with no
dependency on `commander` or the rest of the CLI — `adt-cli` translates the
plugin definition into a `commander` command at load time.

## What you need to know

- Plugins are **stateless**. Each invocation gets a fresh `CliContext` with a
  logger, config, cwd, and an async `getAdtClient()` factory.
- You never construct `AdtClient` yourself. The CLI wires up auth, session,
  CSRF, and cookies; you just call `await ctx.getAdtClient()`.
- Plugins must not use `process.stdout.write`/`console.log` for anything
  structured — use the provided logger. User-facing output is fine via the
  logger at `info` level or above.

## Minimal example

```ts title="packages/my-plugin/src/commands/hello.ts"
import type { CliCommandPlugin } from '@abapify/adt-plugin';

const helloCommand: CliCommandPlugin = {
  name: 'hello',
  description: 'Say hello to an ABAP package',
  options: [
    {
      flags: '-p, --package <name>',
      description: 'Package name',
      required: true,
    },
    { flags: '--json', description: 'JSON output' },
  ],

  async execute(args, ctx) {
    const pkg = args.package as string;
    ctx.logger.info(`Hello, ${pkg}!`);

    if (!ctx.getAdtClient) {
      throw new Error('This command requires an authenticated CLI context');
    }
    const client =
      (await ctx.getAdtClient()) as import('@abapify/adt-client').AdtClient;

    const result =
      await client.adt.repository.informationsystem.search.quickSearch({
        query: pkg,
        maxResults: 5,
      });

    if (args.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      ctx.logger.info(`Found ${result.length ?? 0} objects`);
    }
  },
};

export default helloCommand;
```

## Package setup

Your package's `package.json` must export each command as a dedicated subpath
so `adt.config.ts` can import it:

```json title="package.json"
{
  "name": "@your-scope/my-plugin",
  "type": "module",
  "exports": {
    ".": "./dist/index.mjs",
    "./commands/hello": "./dist/commands/hello.mjs",
    "./package.json": "./package.json"
  },
  "dependencies": {
    "@abapify/adt-plugin": "^x.y.z"
  }
}
```

Then enable it in `adt.config.ts`:

```ts title="adt.config.ts"
import type { AdtConfig } from '@abapify/adt-config';

export default {
  commands: ['@your-scope/my-plugin/commands/hello'],
} as AdtConfig;
```

Run:

```bash
bunx adt hello --package ZMY_PKG
```

## Subcommands

Use the `subcommands` field to nest (e.g., `adt gcts repo list`):

```ts
const repoList: CliCommandPlugin = { name: 'list' /* … */ };
const repoCreate: CliCommandPlugin = { name: 'create' /* … */ };

export default {
  name: 'gcts',
  description: 'gCTS operations',
  subcommands: [
    {
      name: 'repo',
      description: 'Repository operations',
      subcommands: [repoList, repoCreate],
    },
  ],
} satisfies CliCommandPlugin;
```

## Testing

Unit tests are trivial — plugins are plain objects with an `execute()`
function. Mock `ctx.getAdtClient` to return a fake client; assert on
`ctx.logger` calls and on whatever your `execute` produces.

For integration tests against a real SAP system, install the plugin into the
monorepo's `adt.config.ts` and run `bunx nx test <your-plugin>` — `adt-cli`
exposes an in-process entry point for this.

See existing plugins as reference:

- [`@abapify/adt-atc`](https://github.com/abapify/adt-cli/tree/main/packages/adt-atc)
- [`@abapify/adt-aunit`](https://github.com/abapify/adt-cli/tree/main/packages/adt-aunit)
- [`@abapify/adt-plugin-gcts-cli`](https://github.com/abapify/adt-cli/tree/main/packages/adt-plugin-gcts-cli)

## Conventions

- **One command per file** under `src/commands/`.
- **Default export** is the `CliCommandPlugin`.
- **No console.log for debug** — use `ctx.logger.debug`.
- **Emojis in user output**: follow the [adt-cli conventions](../cli/overview)
  (🔍 search, ✅ success, ❌ error, 💡 hint, 💾 saved).
- **`--json` flag** for every command that returns structured data.
- **Error handling**: throw; the CLI shell catches and pretty-prints.

## What lives where

| Concern                         | Where                                                                             |
| ------------------------------- | --------------------------------------------------------------------------------- |
| Typed HTTP calls to SAP         | [`@abapify/adt-client`](../sdk/packages/adt-client) contracts                     |
| Business logic across endpoints | Service inside your plugin (`src/services/`)                                      |
| CLI argument parsing            | Handled by the CLI shell from `options` / `arguments`                             |
| Session / CSRF / auth           | Handled by the client; don't reimplement                                          |
| Serialization to disk           | A [format plugin](./writing-format-plugin) if it makes sense as a reusable format |

{/_ TODO(D2d): link to architecture page on command lifecycle once written _/}
