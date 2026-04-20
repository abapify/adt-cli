# @abapify/nx-npm-trust

Internal Nx plugin that registers a single `npm-trust-check` target on
every publishable `packages/*` workspace package. The target drives the
full **npm publishing lifecycle** from a single entry point — read-only
checks by default, safe remediations with `--fix`, and OIDC trusted
publishing bootstrap with `--prepare`.

## Usage

```bash
# Read-only — CI gate before `nx release publish`:
bunx nx run-many -t npm-trust-check

# Patch publishConfig, fix npm access status + MFA (requires npm login):
bunx nx run-many -t npm-trust-check --args="--fix"

# Bootstrap trusted publishing (0.0.0 placeholder + `npm trust github`):
bunx nx run-many -t npm-trust-check --args="--prepare"

# Full lap on a single package:
bunx nx run adt-cli:npm-trust-check --args="--fix --prepare"
```

One target, opt-in behaviour via flags. Flags reach the script through
`forwardAllArgs: true` + `nx --args="..."`.

| flag                 | effect                                                                                     | needs npm auth? |
| -------------------- | ------------------------------------------------------------------------------------------ | --------------- |
| _(none)_             | Read-only probe (`npm view`, `npm access get`, `npm trust list`).                          | no              |
| `--fix`              | Also patches `publishConfig.access=public` in `package.json` and runs `npm access set`.    | yes             |
| `--mfa=<target>`     | With `--fix`: runs `npm access set mfa=<target> <pkg>` (e.g. `none` for OIDC).             | yes             |
| `--prepare`          | Publishes a `0.0.0` placeholder for brand-new packages + `npm trust github …`.             | yes + 2FA       |
| `--trust-workflow=…` | GitHub Actions workflow filename (default `publish.yml`).                                  | —               |
| `--trust-repo=…`     | `<owner>/<repo>` allowed to publish via OIDC. Auto-detected from `git remote`.             | —               |
| `--trust-provider=…` | `github` (default) or `gitlab`. GitLab also needs `--trust-namespace` + `--trust-project`. | —               |

## What is actually checked

For each non-private `packages/*` workspace:

1. `package.json` hygiene — `name`, `version`, `publishConfig.access=public`,
   `files` allowlist.
2. `npm view <name>` — exists on npm? first publish? network unreachable?
3. `npm access get status <name>` — current public/private visibility.
4. `npm access list collaborators <name>` — who can publish via classic
   tokens.
5. `npm trust list <name>` — currently registered trusted publishers
   (GitHub Actions / GitLab / CircleCI OIDC) — requires npm ≥ 11.5.1.

Exits non-zero when required metadata is missing or
`publishConfig.access` is wrong. **First publish** (package not yet on
npm) is NOT an error — it is reported as `NOT on npm — first publish`.

## What `--fix` does

On top of the checks:

1. **Local `package.json` patch** — sets `publishConfig.access = "public"`
   in place when missing or wrong. Offline, idempotent.
2. **`npm access set status=public <pkg>`** — only for packages already on
   npm whose remote visibility drifted to `private`.
3. **`npm access set mfa=<target> <pkg>`** — only when `--mfa=<target>` is
   explicitly passed (e.g. `--mfa=none` before moving a package to OIDC
   trusted publishing).

## What `--prepare` does

For each non-private `packages/*` workspace:

1. If the package does not exist on npm yet, publishes a **`0.0.0`
   placeholder** from a temp directory. **This is not your real code** —
   only a registry stub so that `npm trust` has something to attach to.
   The real release happens later via the normal `nx release publish`
   path in CI.
2. Runs `npm trust github <pkg> --file <workflow> --repo <owner/repo>
--yes` to register the GitHub Actions OIDC trusted publisher. If the
   trust entry already exists the output contains `already` and the
   target treats it as a successful no-op.

After `npm-trust-check --prepare` is green for every package, CI can
publish via OIDC without any long-lived `NPM_TOKEN` secret.

Requirements:

- npm CLI ≥ 11.5.1 (`npm install -g npm@^11.10.0`)
- Node.js ≥ 22.14.0
- 2FA on the npm account
- `npm login` completed in the current shell

## Why not just `npm publish --dry-run`?

`--dry-run` still requires auth and a clean working tree, and it hides
the most common blockers for a scoped public package published via OIDC:

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
  "plugin": "./tools/nx-npm-trust/src/index.ts"
}
```

The plugin's `createNodesV2` matches `packages/*/package.json`, reads
each manifest, skips packages with `"private": true`, and attaches a
single `npm-trust-check` target that invokes `src/check.ts` via `bun`.
No build step — `bun` runs the `.ts` source directly.

Options (all optional, set via `nx.json` plugin options):

| option          | default                         | purpose                                              |
| --------------- | ------------------------------- | ---------------------------------------------------- |
| `targetName`    | `"npm-trust-check"`             | Name of the target.                                  |
| `registry`      | `"https://registry.npmjs.org/"` | Registry probed and published to.                    |
| `trustWorkflow` | `"publish.yml"`                 | GitHub Actions workflow allowed to publish via OIDC. |
| `trustRepo`     | auto (git remote)               | `<owner>/<repo>` allowed to publish.                 |

## Credits

The `--prepare` logic is ported from @pplenkov's `npm-publish` skill
(`scripts/prepare-ci.mjs`) — same workflow (detect provider → find
publishable packages → publish `0.0.0` placeholders → `npm trust …`),
reshaped as a per-package Nx target so it plays well with
`nx run-many` / `nx affected`.
