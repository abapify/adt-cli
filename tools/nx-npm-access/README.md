# @abapify/nx-npm-access

Internal Nx plugin that registers two targets on every publishable
`packages/*` workspace package:

- `npm-check` — read-only readiness probe (`npm view`, `npm access get`).
- `npm-fix` — safe auto-remediation (patches `package.json`, runs
  `npm access set status=public`, optionally `npm access set mfa=...`).

## Usage

```bash
# Read-only — run this as a CI gate before `nx release publish`:
bunx nx run-many -t npm-check

# Apply safe fixes across the whole workspace (requires `npm login` or an
# authenticated OIDC context for the `npm access set` calls):
bunx nx run-many -t npm-fix

# Target one package:
bunx nx run adt-cli:npm-check
bunx nx run adt-cli:npm-fix

# Extra flags are forwarded through nx:
bunx nx run adt-cli:npm-fix --args="--mfa=none"
```

`npm-check` exits non-zero when a package has `publishConfig.access`
missing, when `npm view` fails unexpectedly, or when required metadata
(name, version) is absent. **First publish** (package not yet on npm) is
NOT an error — it is reported as `NOT on npm — first publish`.

`npm-fix` does the same checks and additionally applies:

1. **package.json patch** — sets `publishConfig.access = "public"` in
   place when missing or wrong. Safe, offline, idempotent.
2. **`npm access set status=public <pkg>`** — only for packages already
   on npm whose remote visibility drifted to `private`.
3. **`npm access set mfa=<target> <pkg>`** — only when `--mfa=<target>`
   is passed (e.g. `--mfa=none` before switching a package to OIDC
   trusted publishing).

Trusted publisher (OIDC) registration is **not automated** — npm v11
ships no CLI for it. The script prints a ready-to-click settings URL
instead.

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
manifest, skips packages with `"private": true`, and attaches both the
`npm-check` and `npm-fix` targets. Both invoke `src/check.ts` via `bun`
(same runtime used everywhere else in the monorepo — no build step).

Options (all optional, set via `nx.json` plugin options):

| option            | default                         | purpose                                          |
| ----------------- | ------------------------------- | ------------------------------------------------ |
| `checkTargetName` | `"npm-check"`                   | Name of the read-only target registered per pkg. |
| `fixTargetName`   | `"npm-fix"`                     | Name of the auto-remediating target.             |
| `registry`        | `"https://registry.npmjs.org/"` | Registry probed by the script.                   |
