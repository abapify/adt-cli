import { type CreateNodesV2, logger, workspaceRoot } from '@nx/devkit';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

function isVerbose(): boolean {
  // Check for --verbose flag in process arguments
  if (process.argv.includes('--verbose')) {
    return true;
  }

  // Check NX_VERBOSE_LOGGING environment variable
  if (process.env.NX_VERBOSE_LOGGING === 'true') {
    return true;
  }

  // Check for .env file with NX_VERBOSE_LOGGING
  try {
    const envPath = join(workspaceRoot, '.env');
    if (existsSync(envPath)) {
      const envContent = require('fs').readFileSync(envPath, 'utf-8');
      return envContent.includes('NX_VERBOSE_LOGGING=true');
    }
  } catch (e) {
    // Ignore errors
  }

  return false;
}

function logDebug(message: string) {
  if (isVerbose()) {
    logger.info(`[nx-tsdown] ${message}`);
  }
}

export const createNodesV2: CreateNodesV2 = [
  '**/tsdown.config.ts',
  (configFiles, options, context) => {
    const verbose = isVerbose();

    if (verbose) {
      logger.info(
        `[nx-tsdown] Processing ${configFiles.length} tsdown config files`,
      );
    }

    return configFiles.map((configFile) => {
      const projectRoot = dirname(configFile);
      logDebug(`Found tsdown.config.ts in ${projectRoot}`);

      const buildTarget = {
        executor: 'nx:run-commands',
        options: {
          command: 'npx tsdown',
          cwd: projectRoot,
        },
        outputs: [`{projectRoot}/dist`],
        cache: true,
        inputs: [
          `{projectRoot}/src/**/*.ts`,
          `{projectRoot}/tsconfig.lib.json`,
          `{projectRoot}/tsdown.config.ts`,
          `{projectRoot}/package.json`,
        ],
        dependsOn: ['^build'],
      };

      return [
        configFile,
        {
          projects: {
            [projectRoot]: {
              targets: {
                build: buildTarget,
              },
            },
          },
        },
      ];
    });
  },
];
