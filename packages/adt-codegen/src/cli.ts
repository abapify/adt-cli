#!/usr/bin/env node

/**
 * ADT Codegen CLI (Hook-Based)
 */

import { resolve } from 'path';
import { pathToFileURL } from 'url';
import { existsSync } from 'fs';
import { CodegenFramework } from './framework';
import type { CodegenConfig } from './types';

/**
 * Parse CLI arguments
 */
function parseArgs(): { config?: string } {
  const args = process.argv.slice(2);
  const result: { config?: string } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // --config=path or --config path
    if (arg.startsWith('--config=')) {
      result.config = arg.split('=')[1];
    } else if (arg === '--config' && args[i + 1]) {
      result.config = args[i + 1];
      i++; // Skip next arg
    } else if (!arg.startsWith('--')) {
      // Positional argument (config path)
      result.config = arg;
    }
  }

  return result;
}

/**
 * Find and load config file
 * Priority:
 * 1. Explicit path from CLI (--config or positional)
 * 2. adt.config.ts (with codegen section)
 * 3. adt-codegen.config.ts
 */
async function findConfig(): Promise<{ path: string; config: CodegenConfig }> {
  const cwd = process.cwd();
  const args = parseArgs();

  // 1. Explicit path from CLI
  if (args.config) {
    const configPath = resolve(cwd, args.config);
    const configUrl = pathToFileURL(configPath).href;
    const configModule = await import(configUrl);

    // Check if it's an ADT config with codegen section
    const config = configModule.default?.codegen || configModule.default;
    return { path: configPath, config };
  }

  // 2. Try adt.config.ts with codegen section
  const adtConfigPath = resolve(cwd, 'adt.config.ts');
  if (existsSync(adtConfigPath)) {
    const configUrl = pathToFileURL(adtConfigPath).href;
    const configModule = await import(configUrl);

    if (configModule.default?.codegen) {
      return { path: adtConfigPath, config: configModule.default.codegen };
    }
  }

  // 3. Try adt-codegen.config.ts
  const codegenConfigPath = resolve(cwd, 'adt-codegen.config.ts');
  if (existsSync(codegenConfigPath)) {
    const configUrl = pathToFileURL(codegenConfigPath).href;
    const configModule = await import(configUrl);
    return { path: codegenConfigPath, config: configModule.default };
  }

  throw new Error(
    'No config file found. Please create adt.config.ts or adt-codegen.config.ts',
  );
}

async function main() {
  try {
    // Find and load config
    const { path: configPath, config } = await findConfig();

    // Resolve paths relative to config file location
    const configDir = resolve(configPath, '..');
    config.discovery.path = resolve(configDir, config.discovery.path);
    config.output.baseDir = resolve(configDir, config.output.baseDir);

    // Run framework
    const framework = new CodegenFramework(config);
    await framework.run();
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
