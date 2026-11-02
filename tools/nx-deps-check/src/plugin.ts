import { type CreateNodesV2, workspaceRoot } from '@nx/devkit';
import { dirname, join, relative } from 'node:path';

interface NxDepsCheckOptions {
  /** Target name registered on every project that carries a package.json. */
  targetName?: string;
  /** Runtime used to execute the checker script. */
  runtime?: string;
  /** Project-root prefixes to skip entirely. */
  excludePaths?: string[];
}

/**
 * Phantom-dependency gate: bun hoists everything to root node_modules, so a
 * package can import a dep it never declared and the breakage only shows up
 * after publish. src/check.ts compares every external import under a project
 * against its own manifest plus the root devDependencies toolchain.
 */
export const createNodesV2: CreateNodesV2<NxDepsCheckOptions> = [
  '**/package.json',
  (configFiles, options) => {
    const targetName = options?.targetName ?? 'deps-check';
    const runtime = options?.runtime ?? 'bun';
    const excludePaths = options?.excludePaths ?? [];
    const script = join(workspaceRoot, 'tools/nx-deps-check/src/check.ts');
    const command = `${runtime} ${JSON.stringify(script)}`;

    return configFiles
      .map((configFile) => {
        const projectRoot = dirname(configFile);
        if (!projectRoot || projectRoot === '.') return null;
        const rel = relative(workspaceRoot, join(workspaceRoot, projectRoot));
        if (!rel || rel.startsWith('..') || rel.includes('node_modules'))
          return null;
        if (excludePaths.some((p) => projectRoot.startsWith(p))) return null;

        return [
          configFile,
          {
            projects: {
              [projectRoot]: {
                targets: {
                  [targetName]: {
                    executor: 'nx:run-commands',
                    options: { command, cwd: projectRoot },
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
