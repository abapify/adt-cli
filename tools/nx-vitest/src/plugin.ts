import { type CreateNodesV2, logger, workspaceRoot } from '@nx/devkit';
import { dirname, join, relative } from 'path';
import { existsSync, readFileSync } from 'fs';
import { glob } from 'glob';

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
    logger.info(`[nx-vitest] ${message}`);
  }
}

function getRootVitestProjects(): string[] {
  // Try different possible root config file names
  const possibleConfigs = [
    'vitest.config.ts',
    'vitest.config.js',
    'vitest.config.mts',
    'vitest.config.mjs',
    'vitest.config.cts',
    'vitest.config.cjs',
  ];

  let rootConfigPath: string | null = null;
  for (const configName of possibleConfigs) {
    const path = join(workspaceRoot, configName);
    if (existsSync(path)) {
      rootConfigPath = path;
      break;
    }
  }

  if (!rootConfigPath) {
    logDebug('No root vitest config found');
    return [];
  }

  try {
    const configContent = readFileSync(rootConfigPath, 'utf-8');

    // Extract projects array from the config file
    // Look for projects: [...] pattern
    const projectsMatch = configContent.match(/projects:\s*\[([\s\S]*?)\]/);

    if (!projectsMatch) {
      logDebug('No projects array found in root vitest.config.ts');
      return [];
    }

    // Extract individual project patterns from the array
    const projectsContent = projectsMatch[1];

    // Find all string literals in the content, handling multiline and comments
    const stringMatches = projectsContent.match(/['"`]([^'"`]+)['"`]/g);
    const projectPatterns = stringMatches
      ? stringMatches.map((match) => {
          // Remove the quotes from each match
          const cleaned = match.replace(/^['"`]|['"`]$/g, '');
          return cleaned;
        })
      : [];

    logDebug(`Raw projects content: ${projectsContent}`);
    logDebug(`String matches: ${JSON.stringify(stringMatches)}`);
    logDebug(`Extracted patterns: ${JSON.stringify(projectPatterns)}`);

    logDebug(`Found project patterns: ${projectPatterns.join(', ')}`);
    return projectPatterns;
  } catch (error) {
    logger.warn(`[nx-vitest] Failed to parse root vitest.config.ts: ${error}`);
    return [];
  }
}

function isProjectInVitestConfig(
  projectPath: string,
  vitestProjects: string[],
): boolean {
  const relativePath = relative(workspaceRoot, projectPath);

  for (const pattern of vitestProjects) {
    try {
      // Use glob to find all files matching the pattern
      const matches = glob.sync(pattern, { cwd: workspaceRoot });

      // Check if any of the matched files are in this project directory
      const projectMatches = matches.filter((match) => {
        const matchDir = dirname(match);
        return matchDir === relativePath;
      });

      if (projectMatches.length > 0) {
        logDebug(
          `Project ${relativePath} matches pattern ${pattern} - found files: ${projectMatches.join(
            ', ',
          )}`,
        );
        return true;
      }
    } catch (error) {
      logDebug(`Error matching pattern ${pattern}: ${error}`);
    }
  }

  logDebug(
    `Project ${relativePath} does not match any vitest project patterns`,
  );
  return false;
}

export const createNodesV2: CreateNodesV2 = [
  '**/vitest.config.{ts,js,mts,mjs,cts,cjs}',
  (configFiles, options, context) => {
    const verbose = isVerbose();

    if (verbose) {
      logger.info(
        `[nx-vitest] Processing ${configFiles.length} vitest config files`,
      );
    }

    // Get the project patterns from root vitest config
    const vitestProjects = getRootVitestProjects();

    if (vitestProjects.length === 0) {
      logDebug('No vitest projects configured, skipping test target creation');
      return [];
    }

    return configFiles
      .map((configFile) => {
        const projectRoot = dirname(configFile);
        logDebug(`Found vitest.config.ts in ${projectRoot}`);

        // Skip the root vitest.config.ts file itself
        if (projectRoot === workspaceRoot) {
          logDebug('Skipping root vitest.config.ts');
          return null;
        }

        // Check if this project is included in the root vitest config
        if (!isProjectInVitestConfig(projectRoot, vitestProjects)) {
          logDebug(`Skipping ${projectRoot} - not in root vitest projects`);
          return null;
        }

        const baseInputs = [
          `{projectRoot}/src/**/*.ts`,
          `{projectRoot}/tests/**/*`,
          `{projectRoot}/vitest.config.ts`,
          `{projectRoot}/package.json`,
          `{workspaceRoot}/vitest.config.ts`,
        ];

        const testTarget = {
          executor: 'nx:run-commands',
          options: {
            command: 'npx vitest run --reporter=default',
            cwd: projectRoot,
          },
          outputs: [`{projectRoot}/coverage`],
          cache: true,
          inputs: baseInputs,
          dependsOn: ['^build'],
        };

        const testWatchTarget = {
          executor: 'nx:run-commands',
          options: {
            command: 'npx vitest --reporter=default',
            cwd: projectRoot,
          },
          cache: false, // Watch mode shouldn't be cached
          inputs: baseInputs,
          dependsOn: ['^build'],
        };

        const testCoverageTarget = {
          executor: 'nx:run-commands',
          options: {
            command: 'npx vitest run --coverage --reporter=default',
            cwd: projectRoot,
          },
          outputs: [`{projectRoot}/coverage`],
          cache: true,
          inputs: baseInputs,
          dependsOn: ['^build'],
        };

        return [
          configFile,
          {
            projects: {
              [projectRoot]: {
                targets: {
                  test: testTarget,
                  'test:watch': testWatchTarget,
                  'test:coverage': testCoverageTarget,
                },
              },
            },
          },
        ];
      })
      .filter(Boolean) as Array<[string, any]>;
  },
];
