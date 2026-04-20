# @abapify/nx-npm-access

Internal Nx plugin that registers three targets on every publishable
`packages/*` workspace package:

| target        | what it does                                                                                                                                                                              | needs npm auth?                   |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `npm-check`   | Read-only probe: `npm view`, `npm access get`, collaborators, `npm trust list`.                                                                                                           | no (works anonymous)              |
| `npm-fix`     | `--check` + patches `publishConfig.access=public` in `package.json` + `npm access set status=public` / `set mfa=…`.                                                                       | yes (for remote part)             |
| `npm-prepare` | Bootstraps trusted publishing: publishes a `0.0.0` placeholder for brand-new packages + `npm trust github` on every package. nx-native equivalent of the `/npm-publish prepare-ci` skill. | yes (logged-in npm user with 2FA) |

## Usage

```bash
# Read-only — CI gate before `nx release publish`:
bunx nx run-many -t npm-check

# Safe auto-remediation (publishConfig + npm access set):
bunx nx run-many -t npm-fix
bunx nx run adt-cli:npm-fix --args="--mfa=none"

# Bootstrap OIDC trusted publishing for brand-new packages:
bunx nx run-many -t npm-prepare     # publishes 0.0.0 stubs + npm trust
```

The `npm-prepare` target requires:

- npm CLI ≥ 11.5.1 (`npm install -g npm@^11.10.0`)
- Node.js ≥ 22.14.0
- 2FA on the npm account
- `npm login` completed in the current shell

The trusted-publisher config defaults to GitHub Actions with
`publish.yml` as the workflow filename and the repository auto-detected
from `git remote get-url origin`. Override via plugin options in
`nx.json` or ad-hoc flags:

```bash
bunx nx run adt-cli:npm-prepare --args="--trust-workflow=release.yml"
bunx nx run adt-cli:npm-prepare --args="--trust-repo=myorg/myrepo"
```

For GitLab, pass `--args="--trust-provider=gitlab --trust-namespace=<ns> --trust-project=<proj>"`.

## What is actually checked (`npm-check`)

For each non-private `packages/*` workspace:

1. `package.json` hygiene — `name`, `version`, `publishConfig.access=public`,
   `files` allowlist.
2. `npm view <name>` — exists on npm? first publish? network unreachable?
3. `npm access get status <name>` — current public/private visibility.
4. `npm access list collaborators <name>` — who can publish via classic
   tokens.
5. `npm trust list <name>` — currently registered trusted publishers
   (GitHub Actions / GitLab / CircleCI OIDC).

`npm-check` exits non-zero when required metadata is missing or
`publishConfig.access` is wrong. **First publish** (package not yet on
npm) is NOT an error — it is reported as `NOT on npm — first publish`.

## What is actually fixed (`npm-fix`)

On top of the checks, `npm-fix` applies:

1. **Local `package.json` patch** — sets `publishConfig.access = "public"`
   in place when missing or wrong. Offline, idempotent.
2. **`npm access set status=public <pkg>`** — only for packages already on
   npm whose remote visibility drifted to `private`.
3. **`npm access set mfa=<target> <pkg>`** — only when `--mfa=<target>` is
   explicitly passed (e.g. `--mfa=none` before moving a package to OIDC
   trusted publishing).

## What is actually prepared (`npm-prepare`)

For each non-private `packages/*` workspace:

1. If the package does not exist on npm yet, publishes a **`0.0.0`
   placeholder** from a temp directory. **This is not your real code** —
   only a registry stub so that `npm trust` has something to attach to.
   The real release happens later via the normal `nx release publish`
   path in CI.
2. Runs `npm trust github <pkg> --file <workflow> --repo <owner/repo>
--yes` to register the GitHub Actions OIDC trusted publisher. If the
   trust entry already exists, the output includes `already` and the
   target treats it as a successful no-op.

After `npm-prepare` is green for every package, subsequent CI runs can
publish via OIDC without any long-lived `NPM_TOKEN` secret.

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
  "plugin": "./tools/nx-npm-access/src/index.ts"
}
```

The plugin's `createNodesV2` matches `packages/*/package.json`, reads
each manifest, skips packages with `"private": true`, and attaches
`npm-check`, `npm-fix`, and `npm-prepare`. Every target invokes
`src/check.ts` via `bun` (no build step) with a different flag set.

Options (all optional, set via `nx.json` plugin options):

| option              | default                         | purpose                                              |
| ------------------- | ------------------------------- | ---------------------------------------------------- |
| `checkTargetName`   | `"npm-check"`                   | Name of the read-only target.                        |
| `fixTargetName`     | `"npm-fix"`                     | Name of the auto-remediating target.                 |
| `prepareTargetName` | `"npm-prepare"`                 | Name of the trusted-publishing bootstrap target.     |
| `registry`          | `"https://registry.npmjs.org/"` | Registry probed and published to.                    |
| `trustWorkflow`     | `"publish.yml"`                 | GitHub Actions workflow allowed to publish via OIDC. |
| `trustRepo`         | auto (git remote)               | `<owner>/<repo>` allowed to publish.                 |

## Credits

The `npm-prepare` logic is ported from @pplenkov's `npm-publish` skill
(`scripts/prepare-ci.mjs`) — same workflow (detect provider → find
publishable packages → publish `0.0.0` placeholders → `npm trust …`),
reshaped as a per-package Nx target so it plays well with
`nx run-many` / `nx affected`.
