import { type CreateNodesV2, type CreateNodesResult, logger, workspaceRoot } from '@nx/devkit';
import { dirname, relative, basename, join } from 'node:path';
import { existsSync } from 'node:fs';

interface NxTypecheckPluginOptions {
  tsgo?: boolean;
  configFile?: string;
  clean?: boolean;
}

function isVerbose(): boolean {
  if (process.argv.includes('--verbose')) {
    return true;
  }

  if (process.env.NX_VERBOSE_LOGGING === 'true') {
    return true;
  }

  try {
    const envPath = join(workspaceRoot, '.env');
    if (existsSync(envPath)) {
      const envContent = require('node:fs').readFileSync(envPath, 'utf-8');
      return envContent.includes('NX_VERBOSE_LOGGING=true');
    }
  } catch {
    // ignore
  }

  return false;
}

function logDebug(message: string) {
  if (isVerbose()) {
    logger.info(`[nx-typecheck] ${message}`);
  }
}

function shouldSkipPath(projectRoot: string): boolean {
  if (projectRoot === workspaceRoot) {
    return true;
  }

  const rel = relative(workspaceRoot, projectRoot);
  if (!rel || rel.startsWith('..')) {
    return true;
  }

  if (rel.includes('node_modules')) {
    return true;
  }

  return false;
}

export const createNodesV2: CreateNodesV2<NxTypecheckPluginOptions> = [
  '**/tsconfig*.json',
  (configFiles, options = {}) => {
    const configFileName = options.configFile ?? 'tsconfig.json';
    const useTsgo = options.tsgo ?? false;
    const executorCommand = useTsgo ? 'npx tsgo' : 'npx tsc';
    const externalDependency = useTsgo
      ? '@typescript/native-preview'
      : 'typescript';
    const cleanEnabled = options.clean ?? false;

    const filteredConfigFiles = configFiles.filter(
      (configFile) => basename(configFile) === configFileName
    );

    logDebug(
      `Detected ${filteredConfigFiles.length} ${configFileName} files for typecheck targets`
    );

    return filteredConfigFiles
      .map((configFile) => {
        const projectRoot = dirname(configFile);

        if (shouldSkipPath(projectRoot)) {
          logDebug(`Skipping ${projectRoot} (outside workspace or ignored)`);
          return null;
        }

        const relativeRoot = relative(workspaceRoot, projectRoot) || '.';
        logDebug(`Registering typecheck target for ${relativeRoot}`);

        const buildCommand = `${executorCommand} --build ${configFileName}`;
        const command = cleanEnabled
          ? `${executorCommand} --build --clean ${configFileName} && ${buildCommand}`
          : buildCommand;

        const typecheckTarget = {
          executor: 'nx:run-commands',
          options: {
            command,
            cwd: projectRoot,
          },
          cache: true,
          inputs: [
            `{projectRoot}/src/**/*.ts`,
            `{projectRoot}/${configFileName}`,
            `{projectRoot}/package.json`,
            `{workspaceRoot}/tsconfig.base.json`,
            { externalDependencies: [externalDependency] },
          ],
        };

        const result: [string, CreateNodesResult] = [
          configFile,
          {
            projects: {
              [projectRoot]: {
                targets: {
                  typecheck: typecheckTarget,
                },
              },
            },
          },
        ];
        return result;
      })
      .filter((result): result is [string, CreateNodesResult] => result !== null);
  },
];
