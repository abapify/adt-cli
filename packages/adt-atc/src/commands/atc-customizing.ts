/**
 * ATC Customizing Command Plugin
 *
 * CLI command for displaying ATC customizing settings.
 *
 * Usage:
 *   adt atc-customizing
 *   adt atc-customizing --json
 *
 * This command reads from /sap/bc/adt/atc/customizing and displays:
 * - Active check variant
 * - CI mode setting
 * - Exemption reasons
 *
 * Mirrors sapcli's `atc customizing` command.
 */

import type { CliCommandPlugin, CliContext } from '@abapify/adt-plugin';

interface AdtClient {
  adt: {
    atc: {
      customizing: {
        get: () => Promise<{
          customizing: {
            properties: { property?: Array<{ name: string; value?: string }> };
          };
        }>;
      };
    };
  };
}

export const atcCustomizingCommand: CliCommandPlugin = {
  name: 'atc-customizing',
  description: 'Display ATC customizing settings (active variant, CI mode)',

  options: [
    {
      flags: '--json',
      description: 'Output as JSON',
    },
  ],

  async execute(args, ctx: CliContext) {
    const options = args as { json?: boolean };

    if (!ctx.getAdtClient) {
      ctx.logger.error('❌ ADT client not available. Run: adt auth login');
      process.exit(1);
    }

    const client = (await ctx.getAdtClient()) as AdtClient;

    try {
      const response = await client.adt.atc.customizing.get();
      const properties = response?.customizing?.properties?.property ?? [];

      const settings: Record<string, string> = {};
      for (const prop of properties) {
        settings[prop.name] = prop.value ?? '';
      }

      if (options.json) {
        console.log(JSON.stringify(settings, null, 2));
        return;
      }

      // Human-readable output
      const variant =
        settings['checkVariant'] ??
        settings['defaultCheckVariant'] ??
        '(not set)';
      const ciMode = settings['ciMode'] ?? settings['CIMode'] ?? '(not set)';

      console.log('📋 ATC Customizing Settings');
      console.log('─'.repeat(40));
      console.log(`  Active check variant: ${variant}`);
      console.log(`  CI mode:              ${ciMode}`);
      console.log('');
      if (Object.keys(settings).length > 0) {
        console.log('  All properties:');
        for (const [key, value] of Object.entries(settings)) {
          console.log(`    ${key}: ${value}`);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.logger.error(`❌ Failed to get ATC customizing: ${message}`);
      process.exit(1);
    }
  },
};

export default atcCustomizingCommand;
