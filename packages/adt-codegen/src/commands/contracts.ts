/**
 * Contracts Command Plugin
 *
 * CLI-agnostic command for generating type-safe contracts from SAP ADT discovery.
 *
 * Features:
 * - Auto-fetches discovery from SAP if not cached
 * - Caches discovery XML locally for offline use
 * - Generates contracts directly from discovery (no pre-processing needed)
 *
 * NOTE: This plugin expects config to be loaded by the CLI and passed via ctx.config.
 * It does NOT load config itself - that's the CLI's responsibility.
 */

import type { CliCommandPlugin } from '@abapify/adt-plugin';
import type { ContractsConfig } from '@abapify/adt-config';
import { resolve, dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { generateContractsFromDiscovery } from '../plugins/generate-contracts';

/**
 * Contracts command - generates type-safe speci contracts from ADT discovery data
 */
export const contractsCommand: CliCommandPlugin = {
  name: 'contracts',
  description: 'Generate type-safe contracts from SAP ADT discovery',

  options: [
    {
      flags: '--discovery <file>',
      description:
        'Path to discovery XML file (fetched from SAP if not exists)',
    },
    {
      flags: '--output <dir>',
      description: 'Output directory for generated contracts',
    },
    {
      flags: '--docs <dir>',
      description: 'Output directory for documentation',
    },
    {
      flags: '--fetch',
      description: 'Force fetch discovery from SAP (even if cached)',
    },
  ],

  async execute(args, ctx) {
    ctx.logger.info('🔄 Generating contracts...\n');

    // Config is loaded by CLI and passed via context
    const contractsConfig = ctx.config.contracts as ContractsConfig | undefined;

    if (!contractsConfig) {
      ctx.logger.error('❌ No contracts config found in adt.config.ts');
      ctx.logger.error(
        '   Add a "contracts" section with discovery, contentTypeMapping, and enabledEndpoints',
      );
      process.exit(1);
    }

    // Discovery path from CLI or config
    const discoveryPath = args.discovery
      ? resolve(ctx.cwd, args.discovery as string)
      : contractsConfig.discovery
        ? resolve(ctx.cwd, contractsConfig.discovery)
        : resolve(ctx.cwd, 'tmp/discovery/discovery.xml');

    // Check if we need to fetch discovery
    const forceFetch = args.fetch === true;
    const needsFetch = forceFetch || !existsSync(discoveryPath);

    if (needsFetch) {
      ctx.logger.info('📡 Fetching discovery from SAP...');

      try {
        // Use adt CLI to fetch discovery - no internal API dependencies
        mkdirSync(dirname(discoveryPath), { recursive: true });
        execSync(`npx adt discovery --output "${discoveryPath}"`, {
          stdio: 'inherit',
          cwd: ctx.cwd,
        });
        ctx.logger.info(`💾 Discovery cached to: ${discoveryPath}`);
      } catch (error) {
        ctx.logger.error('❌ Failed to fetch discovery from SAP');
        ctx.logger.error(
          '   Make sure you are authenticated: npx adt auth login',
        );
        ctx.logger.error(
          '   Error: ' +
            (error instanceof Error ? error.message : String(error)),
        );
        process.exit(1);
      }
    } else {
      ctx.logger.info(`📂 Using cached discovery: ${discoveryPath}`);
    }

    // Output paths from config or CLI override
    const outputDir = args.output
      ? resolve(ctx.cwd, args.output as string)
      : contractsConfig.output
        ? resolve(ctx.cwd, contractsConfig.output)
        : null;

    if (!outputDir) {
      ctx.logger.error(
        '❌ Output directory not configured. Set contracts.output in adt.config.ts or use --output',
      );
      process.exit(1);
    }

    const docsDir = args.docs
      ? resolve(ctx.cwd, args.docs as string)
      : contractsConfig.docs
        ? resolve(ctx.cwd, contractsConfig.docs)
        : null;

    if (!docsDir) {
      ctx.logger.error(
        '❌ Docs directory not configured. Set contracts.docs in adt.config.ts or use --docs',
      );
      process.exit(1);
    }

    // Mapping config from adt.config.ts
    const contentTypeMapping = contractsConfig.contentTypeMapping;
    if (!contentTypeMapping) {
      ctx.logger.error(
        '❌ Content type mapping not configured. Set contracts.contentTypeMapping in adt.config.ts',
      );
      process.exit(1);
    }

    const enabledEndpoints = contractsConfig.enabledEndpoints;
    if (!enabledEndpoints) {
      ctx.logger.error(
        '❌ Enabled endpoints not configured. Set contracts.enabledEndpoints in adt.config.ts',
      );
      process.exit(1);
    }

    await generateContractsFromDiscovery({
      discoveryXml: discoveryPath,
      outputDir,
      docsDir,
      contentTypeMapping,
      enabledEndpoints,
      resolveImports: contractsConfig.resolveImports,
      clean: contractsConfig.clean,
    });

    ctx.logger.info('\n✅ Contract generation complete!');
  },
};

export default contractsCommand;
