import { type CreateNodesV2, logger, workspaceRoot } from '@nx/devkit';
import { dirname, join, relative } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

interface NxNpmTrustOptions {
  /**
   * Target name registered on each publishable package.
   * @default "npm-trust-check"
   */
  targetName?: string;
  /**
   * npm registry used for access probes. Defaults to the public registry.
   * The script also overrides scope-level registry pins via
   * `--@<scope>:registry=<url>`, so a repo-level `.npmrc` that pins the scope
   * to GitHub Packages does NOT interfere.
   * @default "https://registry.npmjs.org/"
   */
  registry?: string;
  /**
   * GitHub Actions workflow filename that is allowed to publish via OIDC.
   * Used when the caller passes `--prepare` (the script invokes
   * `npm trust github … --file <workflow>`).
   * @default "publish.yml"
   */
  trustWorkflow?: string;
  /**
   * `<owner>/<repo>` — GitHub repository allowed to publish via OIDC.
   * Auto-detected from `git remote get-url origin` when absent.
   */
  trustRepo?: string;
}

function isVerbose(): boolean {
  if (process.argv.includes('--verbose')) return true;
  if (process.env.NX_VERBOSE_LOGGING === 'true') return true;
  try {
    const envPath = join(workspaceRoot, '.env');
    if (existsSync(envPath)) {
      return readFileSync(envPath, 'utf-8').includes('NX_VERBOSE_LOGGING=true');
    }
  } catch {
    /* ignore */
  }
  return false;
}

function log(msg: string) {
  if (isVerbose()) logger.info(`[nx-npm-trust] ${msg}`);
}

function shouldSkipPath(projectRoot: string): boolean {
  if (projectRoot === '.' || projectRoot === '') return true;
  const rel = relative(workspaceRoot, join(workspaceRoot, projectRoot));
  if (!rel || rel.startsWith('..')) return true;
  if (rel.includes('node_modules')) return true;
  return false;
}

/** Strip a trailing `.git` and return `owner/repo`, or null if the path
 *  does not match that exact shape. */
function parseOwnerRepo(path: string): string | null {
  const m = path.match(/^([^/]+\/[^/.]+?)(?:\.git)?$/);
  return m ? m[1] : null;
}

/**
 * Parse `<owner>/<repo>` from a git remote URL (https, git, ssh, git+ssh,
 * or SCP-style `git@host:owner/repo`). Returns null for non-GitHub remotes.
 *
 * The host check is anchored via `URL.hostname` (for URL-form) or the
 * explicit SCP pattern (for `user@host:path` form), so substrings like
 * `github.com.attacker.com` or `evil/github.com/...` cannot match. Fixes
 * CodeQL `js/incomplete-url-substring-sanitization`.
 */
function detectGithubRepo(): string | null {
  const res = spawnSync('git', ['remote', 'get-url', 'origin'], {
    cwd: workspaceRoot,
    encoding: 'utf-8',
  });
  if (res.status !== 0) return null;
  const raw = res.stdout.trim();

  // SCP-style: user@host:path. Must be handled manually because `new URL()`
  // does not accept it.
  const scp = raw.match(/^[^@\s]+@([^:]+):(.+)$/);
  if (scp) {
    return scp[1] === 'github.com' ? parseOwnerRepo(scp[2]) : null;
  }

  // Any proper URL scheme (https, http, git, ssh, git+ssh, …).
  try {
    const u = new URL(raw);
    if (u.hostname !== 'github.com') return null;
    return parseOwnerRepo(u.pathname.replace(/^\//, ''));
  } catch {
    return null;
  }
}

export const createNodesV2: CreateNodesV2<NxNpmTrustOptions> = [
  '**/package.json',
  (configFiles, options = {}) => {
    const targetName = options.targetName ?? 'npm-trust-check';
    const registry = options.registry ?? 'https://registry.npmjs.org/';
    const trustWorkflow = options.trustWorkflow ?? 'publish.yml';
    const trustRepo = options.trustRepo ?? detectGithubRepo() ?? '';

    const scriptPath = join(__dirname, 'check.ts');
    const scriptArg = JSON.stringify(scriptPath);
    // Baseline command: read-only probe. Callers opt into mutations by
    // passing `--fix` and/or `--prepare` through `nx --args="..."`.
    const baseParts = [
      `bun ${scriptArg}`,
      `--registry=${registry}`,
      `--trust-workflow=${trustWorkflow}`,
      trustRepo ? `--trust-repo=${trustRepo}` : '',
    ].filter(Boolean);
    const command = baseParts.join(' ');

    return configFiles
      .map((configFile) => {
        const projectRoot = dirname(configFile);
        if (shouldSkipPath(projectRoot)) return null;

        // Only packages/** are considered publishable in this repo.
        if (!projectRoot.startsWith('packages/')) return null;

        const pkgJsonPath = join(workspaceRoot, configFile);
        let pkg: {
          name?: string;
          private?: boolean;
          publishConfig?: { access?: string };
        };
        try {
          pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
        } catch (e) {
          log(`cannot parse ${configFile}: ${(e as Error).message}`);
          return null;
        }

        // Skip private packages — they are never published.
        if (pkg.private) {
          log(`skip ${pkg.name ?? projectRoot}: private`);
          return null;
        }
        if (!pkg.name) {
          log(`skip ${projectRoot}: no name`);
          return null;
        }

        log(`register ${targetName} for ${pkg.name}`);

        return [
          configFile,
          {
            projects: {
              [projectRoot]: {
                targets: {
                  [targetName]: {
                    executor: 'nx:run-commands',
                    options: {
                      command,
                      cwd: projectRoot,
                      // Allow the caller to add flags via `nx --args="--fix"`
                      // etc. without re-declaring the target.
                      forwardAllArgs: true,
                    },
                    cache: false,
                    inputs: ['{projectRoot}/package.json'],
                  },
                },
              },
            },
          },
        ] as [string, { projects: Record<string, unknown> }];
      })
      .filter(
        (x): x is NonNullable<typeof x> => x !== null,
      ) as unknown as ReturnType<CreateNodesV2<NxNpmTrustOptions>[1]>;
  },
];
