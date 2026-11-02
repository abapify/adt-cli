import { type CreateNodes, logger, workspaceRoot } from '@nx/devkit';
import { dirname, join, relative } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

interface NxDepsCheckOptions {
  /**
   * Target name registered on every project that carries a package.json.
   * @default "deps-check"
   */
  targetName?: string;
  /**
   * Runtime used to execute the checker script.
   * @default "bun"
   */
  runtime?: string;
  /**
   * Project-root prefixes to skip entirely (for example "website/" if the
   * site intentionally keeps a self-contained dependency set).
   * @default []
   */
  excludePaths?: string[];
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
  if (isVerbose()) logger.info(`[nx-deps-check] ${msg}`);
}

function shouldSkipPath(projectRoot: string, excludePaths: string[]): boolean {
  if (projectRoot === '.' || projectRoot === '') return true;
  const rel = relative(workspaceRoot, join(workspaceRoot, projectRoot));
  if (!rel || rel.startsWith('..')) return true;
  if (rel.includes('node_modules')) return true;
  return excludePaths.some((prefix) => projectRoot.startsWith(prefix));
}

/**
 * Phantom-dependency gate for a bun/npm workspace: bun hoists everything to
 * the root node_modules, so a package can import a dependency it never
 * declared and the breakage only shows up after publish. The check lives in
 * `src/check.ts` — it compares every external import under the project root
 * against the project's own manifest plus the workspace root devDependencies
 * (the sanctioned shared toolchain).
 */
export const createNodesV2: CreateNodes<NxDepsCheckOptions> = [
  '**/package.json',
  (configFiles, options) => {
    const targetName = options?.targetName ?? 'deps-check';
    const runtime = options?.runtime ?? 'bun';
    const excludePaths = options?.excludePaths ?? [];
    const scriptPath = join(workspaceRoot, 'tools/nx-deps-check/src/check.ts');
    const command = `${runtime} ${JSON.stringify(scriptPath)}`;

    return configFiles
      .map((configFile) => {
        const projectRoot = dirname(configFile);
        if (shouldSkipPath(projectRoot, excludePaths)) return null;

        log(`register ${targetName} for ${projectRoot}`);

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
                    },
                    // Fast and deterministic — always run, never cache.
                    cache: false,
                  },
                },
              },
            },
          },
        ] as const;
      })
      .filter((n): n is NonNullable<typeof n> => n !== null);
  },
];
