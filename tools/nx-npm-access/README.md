# @abapify/nx-npm-access

Internal Nx plugin that adds an `npm-check` target to every publishable
`packages/*` workspace package. The target verifies that a package is
ready to be published from CI before a release is attempted.

## Usage

```bash
# Check every publishable package at once:
bunx nx run-many -t npm-check

# Check a single package:
bunx nx run adt-cli:npm-check

# Silence the success lines in CI, keep only problems:
bunx nx run-many -t npm-check --parallel=8 --output-style=stream | \
  grep -E '^(✗|  problems|__NPM_CHECK_JSON__)'
```

The target exits non-zero when a package has `publishConfig.access` missing,
when `npm view` fails unexpectedly, or when required metadata (name,
version) is absent. **First publish** (package not yet on npm) is NOT an
error — it is reported as `NOT on npm — first publish`.

## What is actually checked

For each non-private `packages/*` workspace:

1. `package.json` hygiene — `name`, `version`, `publishConfig.access=public`,
   `files` allowlist.
2. `npm view <name>` — does the package already exist on npm? Returns
   latest version, maintainers, and dist-tags.
3. `npm access get status <name>` — current public/private visibility.
4. `npm access list collaborators <name>` — who currently has publish
   rights (classic tokens).
5. Trusted publisher verification URL — npm v11 does not yet expose a CLI
   for listing trusted publishers, so the script prints a direct link to
   the package's settings page for manual verification.

## Why not just `npm publish --dry-run`?

`--dry-run` still requires auth and a clean working tree, and it hides the
most common blockers for a scoped public package published via OIDC:

- Repo-level `@scope:registry=` pinned to GitHub Packages (common
  `.npmrc` pattern in this monorepo) redirects `npm` metadata requests
  away from npmjs.org and makes authless probes fail with 401.

This plugin always probes the public npm registry via `--registry` +
`--<scope>:registry=` overrides, so the `.npmrc` scope pin does not
interfere.

## How it's wired

Registered in the root `nx.json` under `plugins`:

```json
{
  "plugin": "./tools/nx-npm-access/src/index.ts"
}
```

The plugin's `createNodesV2` matches `packages/*/package.json`, reads each
manifest, skips packages with `"private": true`, and attaches an
`npm-check` target that invokes `src/check.mjs`.

Options (all optional, set via `nx.json` plugin options):

| option       | default                         | purpose                                    |
| ------------ | ------------------------------- | ------------------------------------------ |
| `targetName` | `"npm-check"`                   | Name of the target registered per package. |
| `registry`   | `"https://registry.npmjs.org/"` | Registry probed by the script.             |
