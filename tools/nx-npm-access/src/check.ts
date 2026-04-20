#!/usr/bin/env bun
// tools/nx-npm-access/src/check.ts
//
// Validates that a single @abapify/* package (located in $cwd) is ready to be
// published from CI. Run per-package via Nx (`nx run <pkg>:npm-check`) or for
// all publishable packages at once (`nx run-many -t npm-check`).
//
// Checks performed (all read-only by default, no network writes):
//   1. package.json hygiene — name, version, publishConfig.access, exports.
//   2. Does the package exist on npm? (new packages report "first publish").
//   3. `npm access get status` — current public/private visibility on npm.
//   4. `npm access list collaborators` — who can publish (incl. bot account
//      used by GitHub Actions when OIDC is not in play).
//   5. Trusted publisher hint — prints a ready-to-click settings URL where
//      the OIDC trusted publisher for this package can be verified. npm has
//      no stable CLI for listing trusted publishers yet (as of npm 11).
//
// With `--fix` the script also applies safe remediations:
//   - patches `publishConfig.access = "public"` into package.json if missing;
//   - runs `npm access set status=public <pkg>` on published packages whose
//     remote visibility drifted to `private`;
//   - runs `npm access set mfa=none <pkg>` (only if `--mfa=none` is passed)
//     — required for OIDC trusted publishing without interactive 2FA.
// Every mutation is logged to the structured report under `fixes`.
//
// Trusted publisher registration (OIDC) still has no CLI, so the script only
// prints the UI link — it does NOT try to automate that step.
//
// The script exits with code 0 when the package is "ready to publish from
// CI", 1 otherwise. Errors are printed to stderr; the structured report is
// emitted to stdout as a single JSON line, prefixed with a human summary.
//
// Registry handling: to avoid the repo-level `.npmrc` pinning
// `@abapify:registry=https://npm.pkg.github.com/`, the script passes
// `--<scope>:registry=<registry>` on every npm invocation.

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
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
  mode: 'check' | 'fix';
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
const quiet = hasFlag('quiet');
const fix = hasFlag('fix');
// Optional MFA setting applied only in fix mode. Useful before switching to
// OIDC trusted publishing (`--mfa=none`). Omit to leave MFA untouched.
const mfaTarget = getFlag('mfa', '');

const pkgPath = join(process.cwd(), 'package.json');
if (!existsSync(pkgPath)) {
  console.error(`[npm-check] no package.json in ${process.cwd()}`);
  process.exit(2);
}
const pkg: Pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

if (pkg.private) {
  if (!quiet) console.log(`[skip] ${pkg.name ?? '<no-name>'} is private`);
  process.exit(0);
}

const name = pkg.name;
const scope = name?.startsWith('@') ? name.split('/')[0] : null;
const scopeFlag = scope ? [`--${scope}:registry=${registry}`] : [];

/**
 * Run an npm subcommand. We deliberately do NOT inherit the repo `.npmrc` —
 * instead we pass registry overrides explicitly. Auth-free commands are
 * preferred (`view`); anything that requires login is still called but
 * failure is reported as "needs auth" rather than blocking.
 */
function npm(cmdArgs: string[]): NpmResult {
  const result = spawnSync(
    'npm',
    [...cmdArgs, `--registry=${registry}`, ...scopeFlag, '--json'],
    {
      encoding: 'utf-8',
      // Individual npm calls are short-lived; if the network (or corporate
      // proxy) hangs, fail fast instead of wedging the whole `nx run-many`.
      timeout: 20_000,
    },
  );
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
  mode: fix ? 'fix' : 'check',
  checks: {},
  fixes: [],
  readyForCi: false,
  problems: [],
};

// 1. package.json hygiene — and patch in --fix mode.
if (!name) report.problems.push('package.json: missing "name"');
if (!pkg.version) report.problems.push('package.json: missing "version"');

const needsPublishConfigFix =
  !pkg.publishConfig || pkg.publishConfig.access !== 'public';
if (needsPublishConfigFix) {
  if (fix) {
    const patched: Pkg = {
      ...pkg,
      publishConfig: { ...(pkg.publishConfig ?? {}), access: 'public' },
    };
    // Preserve trailing newline + 2-space indent to match the rest of the
    // monorepo's package.json style (Prettier will normalise anyway).
    writeFileSync(pkgPath, JSON.stringify(patched, null, 2) + '\n', 'utf-8');
    report.fixes.push('package.json: set publishConfig.access = "public"');
    report.access = 'public';
  } else {
    report.problems.push(
      'package.json: publishConfig.access should be "public" (scoped packages default to restricted on npm; CI publishes would 402 Payment Required) — re-run with `--fix` to patch',
    );
  }
}
if (pkg.files === undefined) {
  // Not auto-fixable: the correct files list is package-specific.
  report.problems.push(
    'package.json: "files" not declared — publish will include everything (incl. node_modules, dist build artefacts, tests). Add a narrow allowlist (e.g. ["dist", "README.md"]).',
  );
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
  report.problems.push(
    `npm view timed out after 20s — registry ${registry} unreachable from this host`,
  );
} else {
  report.checks.exists = 'unknown';
  report.problems.push(
    `npm view failed unexpectedly: ${view.stderr.split('\n')[0] ?? 'no stderr'}`,
  );
}

// 3. access status (only meaningful if published)
if (report.checks.exists === true && name) {
  const status = npm(['access', 'get', 'status', name]);
  if (status.code === 0) {
    report.checks.accessStatus = status.json ?? status.stdout.trim();
  } else {
    report.checks.accessStatus = `ERR: ${status.stderr.split('\n')[0] ?? status.code}`;
  }

  // 4. collaborators
  const collabs = npm(['access', 'list', 'collaborators', name]);
  if (collabs.code === 0) {
    report.checks.collaborators = collabs.json ?? collabs.stdout.trim();
  } else {
    report.checks.collaborators = `ERR: ${collabs.stderr.split('\n')[0] ?? collabs.code}`;
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
          `npm access set status=public failed: ${setPub.stderr.split('\n')[0] ?? 'no stderr'} — needs login (\`npm login\`) or OIDC env`,
        );
      }
    }

    // Optional: align MFA policy (e.g. `--mfa=none` for OIDC trusted pub).
    if (mfaTarget) {
      const setMfa = npm(['access', 'set', `mfa=${mfaTarget}`, name]);
      if (setMfa.code === 0) {
        report.fixes.push(`npm access set mfa=${mfaTarget} ${name}`);
        report.checks.mfa = mfaTarget;
      } else {
        report.problems.push(
          `npm access set mfa=${mfaTarget} failed: ${setMfa.stderr.split('\n')[0] ?? 'no stderr'}`,
        );
      }
    }
  }
}

// 5. trusted publisher hint (npm has no stable CLI for listing these yet)
if (name?.startsWith('@')) {
  const [s, p] = name.slice(1).split('/');
  report.checks.trustedPublisherSettingsUrl = `https://www.npmjs.com/settings/${s}/packages?q=${p}`;
  report.checks.trustedPublisherPackageUrl = `https://www.npmjs.com/package/${name}/access`;
} else if (name) {
  report.checks.trustedPublisherPackageUrl = `https://www.npmjs.com/package/${name}/access`;
}

// Decide overall readiness
const hasPublishConfig = pkg.publishConfig?.access === 'public';
const existsOrNew =
  report.checks.exists === true || report.checks.exists === false;
report.readyForCi = Boolean(
  hasPublishConfig && existsOrNew && name && pkg.version,
);

// Human summary
const symbol = report.readyForCi ? '✓' : '✗';
const existsTag =
  report.checks.exists === true
    ? `on npm @ ${report.checks.latestVersion as string}`
    : report.checks.exists === false
      ? 'NOT on npm — first publish'
      : 'npm state unknown';
const fixesSummary =
  report.fixes.length > 0
    ? `\n  fixes applied:\n    + ${report.fixes.join('\n    + ')}`
    : '';
const problemsSummary =
  report.problems.length > 0
    ? `\n  problems:\n    - ${report.problems.join('\n    - ')}`
    : '';

const modeTag = fix ? ' [fix]' : '';
console.log(
  `${symbol} ${name}@${pkg.version}${modeTag} (${existsTag})${fixesSummary}${problemsSummary}`,
);
// Structured line for aggregation:
console.log(`__NPM_CHECK_JSON__ ${JSON.stringify(report)}`);

process.exit(report.readyForCi && report.problems.length === 0 ? 0 : 1);
