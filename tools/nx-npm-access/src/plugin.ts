import { type CreateNodesV2, logger, workspaceRoot } from '@nx/devkit';
import { dirname, join, relative } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

interface NxNpmAccessOptions {
  /**
   * Target name registered on each publishable package for the read-only
   * readiness check.
   * @default "npm-check"
   */
  checkTargetName?: string;
  /**
   * Target name registered on each publishable package for the
   * auto-remediating fix (patches `publishConfig.access` locally and runs
   * `npm access set` remotely).
   * @default "npm-fix"
   */
  fixTargetName?: string;
  /**
   * npm registry used for access probes. Defaults to the public registry.
   * The script also overrides scope-level registry pins via
   * `--@<scope>:registry=<url>`, so a repo-level `.npmrc` that pins the scope
   * to GitHub Packages does NOT interfere.
   * @default "https://registry.npmjs.org/"
   */
  registry?: string;
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
  if (isVerbose()) logger.info(`[nx-npm-access] ${msg}`);
}

function shouldSkipPath(projectRoot: string): boolean {
  if (projectRoot === '.' || projectRoot === '') return true;
  const rel = relative(workspaceRoot, join(workspaceRoot, projectRoot));
  if (!rel || rel.startsWith('..')) return true;
  if (rel.includes('node_modules')) return true;
  return false;
}

export const createNodesV2: CreateNodesV2<NxNpmAccessOptions> = [
  '**/package.json',
  (configFiles, options = {}) => {
    const checkTargetName = options.checkTargetName ?? 'npm-check';
    const fixTargetName = options.fixTargetName ?? 'npm-fix';
    const registry = options.registry ?? 'https://registry.npmjs.org/';

    const scriptPath = join(__dirname, 'check.ts');
    const scriptArg = JSON.stringify(scriptPath);
    const baseCmd = `bun ${scriptArg} --registry=${registry}`;

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

        log(`register ${checkTargetName} + ${fixTargetName} for ${pkg.name}`);

        // Shared shape: cwd + no arg forwarding, no cache (network-dependent).
        const makeTarget = (extraArg: string | null) => ({
          executor: 'nx:run-commands' as const,
          options: {
            command: extraArg ? `${baseCmd} ${extraArg}` : baseCmd,
            cwd: projectRoot,
            // Prevents nx from swallowing stderr from npm, and lets the user
            // pass extra flags (e.g. `--args="--mfa=none"`) through nx.
            forwardAllArgs: true,
          },
          cache: false,
          inputs: [`{projectRoot}/package.json`],
        });

        return [
          configFile,
          {
            projects: {
              [projectRoot]: {
                targets: {
                  [checkTargetName]: makeTarget(null),
                  [fixTargetName]: makeTarget('--fix'),
                },
              },
            },
          },
        ] as const;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null) as ReturnType<
      CreateNodesV2<NxNpmAccessOptions>[1]
    >;
  },
];
