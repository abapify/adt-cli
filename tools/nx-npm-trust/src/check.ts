#!/usr/bin/env bun
// tools/nx-npm-trust/src/check.ts
//
// Validates that a single @abapify/* package (located in $cwd) is ready to be
// published from CI. Run per-package via Nx
// (`nx run <pkg>:npm-trust-check`) or for all publishable packages at once
// (`nx run-many -t npm-trust-check`). Mutations are opt-in:
//   --fix      patch publishConfig + `npm access set`
//   --prepare  publish 0.0.0 placeholder (if new) + `npm trust github`
//
// Checks performed (all read-only by default, no network writes):
//   1. package.json hygiene — name, version, publishConfig.access, exports.
//   2. Does the package exist on npm? (new packages report "first publish").
//   3. `npm access get status` — current public/private visibility on npm.
//   4. `npm access list collaborators` — who can publish (incl. bot account
//      used by GitHub Actions when OIDC is not in play).
//   5. Trusted publisher listing via `npm trust list <pkg>` (npm ≥ 11.5.1).
//
// With `--fix` the script also applies safe remediations:
//   - patches `publishConfig.access = "public"` into package.json if missing;
//   - runs `npm access set status=public <pkg>` on published packages whose
//     remote visibility drifted to `private`;
//   - runs `npm access set mfa=none <pkg>` (only if `--mfa=none` is passed)
//     — required for OIDC trusted publishing without interactive 2FA.
// Every mutation is logged to the structured report under `fixes`.
//
// With `--prepare` the script bootstraps trusted publishing for brand-new
// packages (nx-native equivalent of the `/npm-publish prepare-ci` skill):
//   - if the package does not yet exist on npm, publishes an empty `0.0.0`
//     placeholder (NOT your real code — just a registry stub so `npm trust`
//     can be configured);
//   - runs `npm trust github <pkg> --file <workflow> --repo <owner/repo>
//     --yes` to register the GitHub Actions OIDC trusted publisher.
// Requires npm ≥ 11.5.1 and 2FA on the npm account.
//
// The script exits with code 0 when the package is "ready to publish from
// CI", 1 otherwise. Errors are printed to stderr; the structured report is
// emitted to stdout as a single JSON line, prefixed with a human summary.
//
// Registry handling: to avoid the repo-level `.npmrc` pinning
// `@abapify:registry=https://npm.pkg.github.com/`, the script passes
// `--<scope>:registry=<registry>` on every npm invocation.

import {
  readFileSync,
  existsSync,
  writeFileSync,
  mkdirSync,
  rmSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

interface Pkg {
  name?: string;
  version?: string;
  private?: boolean;
  publishConfig?: { access?: string };
  files?: string[];
}

interface NpmResult {
  code: number;
  timedOut: boolean;
  stdout: string;
  stderr: string;
  json: unknown;
}

interface Report {
  name: string | undefined;
  version: string | undefined;
  access: string | null;
  registry: string;
  scope: string | null;
  mode: 'check' | 'fix' | 'prepare';
  checks: Record<string, unknown>;
  fixes: string[];
  readyForCi: boolean;
  problems: string[];
}

const args = process.argv.slice(2);
const getFlag = (name: string, def: string): string => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : def;
};
const hasFlag = (name: string): boolean => args.includes(`--${name}`);

const registry = getFlag('registry', 'https://registry.npmjs.org/');
const fix = hasFlag('fix');
const prepare = hasFlag('prepare');
const verbose = hasFlag('verbose');
// Optional MFA setting applied only in fix mode. Useful before switching to
// OIDC trusted publishing (`--mfa=none`). Omit to leave MFA untouched.
const mfaTarget = getFlag('mfa', '');
// Trusted-publisher config for `--prepare` mode. Defaults match the repo.
const trustProvider = getFlag('trust-provider', 'github');
const trustWorkflow = getFlag('trust-workflow', 'publish.yml');
const trustRepo = getFlag('trust-repo', '');
const trustNamespace = getFlag('trust-namespace', '');
const trustProject = getFlag('trust-project', '');

const pkgPath = join(process.cwd(), 'package.json');
if (!existsSync(pkgPath)) {
  console.error(`[npm-trust-check] no package.json in ${process.cwd()}`);
  process.exit(2);
}
const pkg: Pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

if (pkg.private) {
  console.log(`- ${pkg.name ?? '<no-name>'} (private, skipped)`);
  process.exit(0);
}

const name = pkg.name;
const scope = name?.startsWith('@') ? name.split('/')[0] : null;
const scopeFlag = scope ? [`--${scope}:registry=${registry}`] : [];

/**
 * Pick the first meaningful error line out of an npm stderr blob. npm
 * chatters with `npm notice` (release reminders), `npm warn` (config
 * deprecations), and escape-code banners that bury the real error. We
 * prefer anything starting with `npm error`; fall back to the first
 * non-chatter line; otherwise the raw first line.
 */
function firstErrorLine(stderr: string): string {
  const lines = (stderr ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  return (
    lines.find((l) => /^npm\s+(error|err!)/i.test(l)) ??
    lines.find((l) => !/^npm\s+(notice|warn|http|info|verb|sill)/i.test(l)) ??
    lines[0] ??
    'no stderr'
  );
}

interface NpmCallOptions {
  /** Append `--json`. Disable for subcommands that reject it (e.g. older
   * versions of `npm trust`). Default: true. */
  jsonOutput?: boolean;
  /** Append `--@<scope>:registry=<registry>` to bypass the repo-level
   * `.npmrc` scope pin. Disable for subcommands that don't accept
   * unknown flags (e.g. `npm trust github`, which rejects it with
   * `EUSAGE Unknown flag`). Default: true. */
  scopeRegistry?: boolean;
}

/**
 * Run an npm subcommand. We deliberately do NOT inherit the repo `.npmrc` —
 * instead we pass registry overrides explicitly for read-only probes. For
 * subcommands that don't parse arbitrary flags (`npm trust …`), pass
 * `{ scopeRegistry: false, jsonOutput: false }`.
 */
function npm(cmdArgs: string[], opts: NpmCallOptions = {}): NpmResult {
  const { jsonOutput = true, scopeRegistry = true } = opts;
  const extra = [
    `--registry=${registry}`,
    ...(scopeRegistry ? scopeFlag : []),
    ...(jsonOutput ? ['--json'] : []),
  ];
  const result = spawnSync('npm', [...cmdArgs, ...extra], {
    encoding: 'utf-8',
    // Individual npm calls are short-lived; if the network (or corporate
    // proxy) hangs, fail fast instead of wedging the whole `nx run-many`.
    timeout: 20_000,
  });
  let parsed: unknown = null;
  if (result.stdout) {
    try {
      parsed = JSON.parse(result.stdout);
    } catch {
      parsed = result.stdout.trim();
    }
  }
  const err = result.error as NodeJS.ErrnoException | undefined;
  return {
    code: result.status ?? -1,
    timedOut: result.signal === 'SIGTERM' || err?.code === 'ETIMEDOUT',
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    json: parsed,
  };
}

type ViewJson = {
  version?: string;
  maintainers?: unknown;
  'dist-tags'?: unknown;
  error?: { code?: string };
};

const report: Report = {
  name,
  version: pkg.version,
  access: pkg.publishConfig?.access ?? null,
  registry,
  scope,
  mode: prepare ? 'prepare' : fix ? 'fix' : 'check',
  checks: {},
  fixes: [],
  readyForCi: false,
  problems: [],
};

// 1. package.json hygiene — with --fix, mutate the manifest in-place and
// flush a single write at the end. Each issue either becomes a fix (if
// `--fix` is on and it is auto-fixable) or a blocking problem otherwise.
if (!name) report.problems.push('missing "name"');
if (!pkg.version) report.problems.push('missing "version"');

let manifestDirty = false;
const draft: Pkg = { ...pkg };

// publishConfig.access must be "public" for scoped packages.
if (!draft.publishConfig || draft.publishConfig.access !== 'public') {
  if (fix) {
    draft.publishConfig = { ...(draft.publishConfig ?? {}), access: 'public' };
    report.fixes.push('set publishConfig.access=public');
    report.access = 'public';
    manifestDirty = true;
  } else {
    report.problems.push('publishConfig.access missing (run with --fix)');
  }
}

// `files` allowlist — default to `["dist", "README.md"]`, which matches
// every other package in the monorepo (tsdown emits to dist/, README lives
// at the package root). Without this, the npm tarball leaks src/, tests/,
// node_modules/, etc.
if (draft.files === undefined) {
  if (fix) {
    draft.files = ['dist', 'README.md'];
    report.fixes.push('set files=["dist","README.md"]');
    manifestDirty = true;
  } else {
    report.problems.push('no "files" allowlist (run with --fix)');
  }
}

if (manifestDirty) {
  // Preserve trailing newline + 2-space indent to match the rest of the
  // monorepo's package.json style (Prettier will normalise anyway).
  writeFileSync(pkgPath, JSON.stringify(draft, null, 2) + '\n', 'utf-8');
}

// 2. Does it exist on npm?
const view = npm(['view', name ?? '']);
const viewJson = view.json as ViewJson | string | null;
const isObjJson = viewJson !== null && typeof viewJson === 'object';
if (view.code === 0 && isObjJson && !(viewJson as ViewJson).error) {
  const v = viewJson as ViewJson;
  report.checks.exists = true;
  report.checks.latestVersion = v.version;
  report.checks.maintainers = v.maintainers ?? [];
  report.checks.distTags = v['dist-tags'] ?? {};
} else if (
  view.stderr.includes('E404') ||
  (isObjJson && (viewJson as ViewJson).error?.code === 'E404')
) {
  report.checks.exists = false;
} else if (view.timedOut) {
  report.checks.exists = 'unknown';
  report.problems.push('npm view timed out (registry unreachable)');
} else {
  report.checks.exists = 'unknown';
  report.problems.push(
    `npm view failed: ${firstErrorLine(view.stderr) || view.code}`,
  );
}

// 3. access status (only meaningful if published)
if (report.checks.exists === true && name) {
  const status = npm(['access', 'get', 'status', name]);
  if (status.code === 0) {
    report.checks.accessStatus = status.json ?? status.stdout.trim();
  } else {
    report.checks.accessStatus = `ERR: ${firstErrorLine(status.stderr) || status.code}`;
  }

  // 4. collaborators
  const collabs = npm(['access', 'list', 'collaborators', name]);
  if (collabs.code === 0) {
    report.checks.collaborators = collabs.json ?? collabs.stdout.trim();
  } else {
    report.checks.collaborators = `ERR: ${firstErrorLine(collabs.stderr) || collabs.code}`;
  }

  // --fix: flip visibility to public if npm reports it as private.
  if (fix) {
    const currentStatus =
      typeof report.checks.accessStatus === 'object' &&
      report.checks.accessStatus !== null
        ? (report.checks.accessStatus as Record<string, string>)[name]
        : typeof report.checks.accessStatus === 'string'
          ? report.checks.accessStatus
          : undefined;
    if (currentStatus && currentStatus !== 'public') {
      const setPub = npm(['access', 'set', 'status=public', name]);
      if (setPub.code === 0) {
        report.fixes.push(`npm access set status=public ${name}`);
        report.checks.accessStatus = 'public';
      } else {
        report.problems.push(
          `npm access set status=public failed: ${firstErrorLine(setPub.stderr)} — needs login (\`npm login\`) or OIDC env`,
        );
      }
    }

    // Optional: align MFA policy (e.g. `--mfa=none` for OIDC trusted pub).
    if (mfaTarget) {
      const setMfa = npm(['access', 'set', `mfa=${mfaTarget}`, name]);
      if (setMfa.code === 0) {
        report.fixes.push(`npm access set mfa=${mfaTarget} ${name}`);
        // Stored as `mfaPolicy` (not `mfa`) to reflect that the value is the
        // configured publish policy (`none` / `automatic`), not a user secret
        // or authentication factor. Keeping the name `mfa` triggered CodeQL's
        // `js/clear-text-logging` heuristic on the JSON report log below.
        report.checks.mfaPolicy = mfaTarget;
      } else {
        report.problems.push(
          `npm access set mfa=${mfaTarget} failed: ${firstErrorLine(setMfa.stderr)}`,
        );
      }
    }
  }
}

// 5. trusted publishers (npm ≥ 11.5.1 exposes `npm trust list <pkg>`).
if (name) {
  const trust = npm(['trust', 'list', name]);
  if (trust.code === 0) {
    report.checks.trustedPublishers = trust.json ?? trust.stdout.trim();
  } else if (trust.stderr.includes('E404') || trust.code === 1) {
    // 404 for packages that don't exist yet, or empty list.
    report.checks.trustedPublishers = [];
  } else {
    report.checks.trustedPublishers = `ERR: ${firstErrorLine(trust.stderr) || trust.code}`;
  }
  // Keep the UI link as a fallback for humans who want to double-check.
  if (name.startsWith('@')) {
    const [s, p] = name.slice(1).split('/');
    report.checks.trustedPublisherSettingsUrl = `https://www.npmjs.com/settings/${s}/packages?q=${p}`;
  }
  report.checks.trustedPublisherPackageUrl = `https://www.npmjs.com/package/${name}/access`;
}

// 6. --prepare: bootstrap trusted publishing for brand-new packages.
// Mirrors the logic of the `/npm-publish prepare-ci` skill, but per package
// and driven by nx (so it plays well with `run-many`).
if (prepare && name) {
  // `npm trust` CLI requires npm >= 11.10.0. Older versions silently
  // ignore unknown flags and emit cryptic warnings, which masks the
  // real cause. Fail fast with an actionable message instead.
  const versionResult = spawnSync('npm', ['--version'], {
    encoding: 'utf-8',
  });
  const npmVersion = (versionResult.stdout ?? '').trim();
  const [maj, min] = npmVersion.split('.').map((n) => parseInt(n, 10));
  const hasTrust = maj > 11 || (maj === 11 && min >= 10);
  if (!hasTrust) {
    report.problems.push(
      `--prepare needs npm >= 11.10.0 for \`npm trust\` (detected ${npmVersion || 'unknown'}) — run \`npm i -g npm@latest\``,
    );
  } else if (trustProvider === 'github' && !trustRepo) {
    report.problems.push(
      '--prepare --trust-provider=github requires --trust-repo=<owner/repo>',
    );
  } else if (trustProvider === 'gitlab' && (!trustNamespace || !trustProject)) {
    report.problems.push(
      '--prepare --trust-provider=gitlab requires --trust-namespace and --trust-project',
    );
  } else {
    // 6a. publish 0.0.0 placeholder if not yet on npm.
    if (report.checks.exists === false) {
      const tmpDir = join(
        tmpdir(),
        `npm-prepare-${Date.now()}-${name.replaceAll(/\//g, '__')}`,
      );
      mkdirSync(tmpDir, { recursive: true });
      writeFileSync(
        join(tmpDir, 'package.json'),
        JSON.stringify(
          {
            name,
            version: '0.0.0',
            description:
              'Placeholder — real package is published via CI/CD (trusted publishing).',
          },
          null,
          2,
        ),
      );
      writeFileSync(
        join(tmpDir, 'README.md'),
        `# ${name}\n\nPlaceholder. The real release is published via CI/CD.\n`,
      );
      const publishResult = spawnSync(
        'npm',
        ['publish', `--registry=${registry}`, ...scopeFlag, '--access=public'],
        { cwd: tmpDir, encoding: 'utf-8' },
      );
      if (publishResult.status === 0) {
        report.fixes.push(`published 0.0.0 placeholder for ${name}`);
        report.checks.exists = true;
        report.checks.latestVersion = '0.0.0';
      } else {
        report.problems.push(
          `npm publish placeholder failed: ${firstErrorLine(publishResult.stderr)} — run \`npm login\` first`,
        );
      }
      rmSync(tmpDir, { recursive: true, force: true });
    }

    // 6b. register the trusted publisher.
    // `npm trust` does NOT accept `--json`, so disable it for these calls.
    const trustArgs =
      trustProvider === 'github'
        ? [
            'trust',
            'github',
            name,
            '--file',
            trustWorkflow,
            '--repo',
            trustRepo,
            '--yes',
          ]
        : trustProvider === 'gitlab'
          ? [
              'trust',
              'gitlab',
              name,
              '--file',
              trustWorkflow,
              // `npm trust gitlab` takes a single --project=<namespace>/<project>
              // identifier; it does NOT accept separate --namespace + --project.
              '--project',
              trustNamespace && trustProject
                ? `${trustNamespace}/${trustProject}`
                : trustProject,
              '--yes',
            ]
          : null;

    if (!trustArgs) {
      report.problems.push(
        `unsupported --trust-provider=${trustProvider} (expected github|gitlab)`,
      );
    } else {
      const trustResult = npm(trustArgs, {
        // `npm trust github` is a strict-argv command — it rejects unknown
        // flags with EUSAGE, so we must not append the scope registry
        // override here. `--json` is supported by `npm trust` on modern
        // npm (>= 11.10), but we keep it off to be conservative and let
        // `firstErrorLine` handle the plain-text output.
        jsonOutput: false,
        scopeRegistry: false,
      });
      if (trustResult.code === 0) {
        const trustTarget = trustRepo || `${trustNamespace}/${trustProject}`;
        report.fixes.push(
          `npm trust ${trustProvider} ${name} → ${trustTarget} / ${trustWorkflow}`,
        );
      } else {
        const line = firstErrorLine(trustResult.stderr);
        // Idempotent: `already exists` is not a failure.
        if (line.toLowerCase().includes('already')) {
          report.fixes.push(
            `npm trust ${trustProvider} ${name}: already configured (skip)`,
          );
        } else {
          report.problems.push(
            `npm trust ${trustProvider} failed: ${line || trustResult.code}`,
          );
        }
      }
    }
  }
}

// Decide overall readiness
const hasPublishConfig = pkg.publishConfig?.access === 'public';
const existsOrNew =
  report.checks.exists === true || report.checks.exists === false;
report.readyForCi = Boolean(
  hasPublishConfig && existsOrNew && name && pkg.version,
);

// Human summary
const hasProblems = report.problems.length > 0;
const symbol = hasProblems ? '✗' : '✓';
const existsTag =
  report.checks.exists === true
    ? `on npm @ ${report.checks.latestVersion as string}`
    : report.checks.exists === false
      ? 'not on npm'
      : 'state unknown';
const fixesSummary =
  report.fixes.length > 0 ? `  + ${report.fixes.join(', ')}` : '';
const problemsSummary =
  report.problems.length > 0 ? `  ! ${report.problems.join(', ')}` : '';

const modeTag = prepare ? ' [prepare]' : fix ? ' [fix]' : '';
const parts = [
  `${symbol} ${name}@${pkg.version}${modeTag} — ${existsTag}`,
  fixesSummary,
  problemsSummary,
].filter(Boolean);
console.log(parts.join('\n'));

// Structured JSON report for aggregation — opt-in, keeps human logs clean.
if (verbose) {
  console.log(`__NPM_CHECK_JSON__ ${JSON.stringify(report)}`);
}

// Exit code reflects the *final* state after any fixes were applied: a
// problem that was successfully auto-fixed no longer counts against it.
process.exit(hasProblems ? 1 : 0);
