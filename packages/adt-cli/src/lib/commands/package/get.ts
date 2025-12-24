/**
 * Package Get Command
 *
 * Get details about a specific ABAP package.
 * Usage: npx adt get package <name>
 */

import { Command } from 'commander';
import { getAdtClientV2 } from '../../utils/adt-client-v2';
import { render, router } from '../../ui';

export const packageGetCommand = new Command('package')
  .argument('<name>', 'Package name to inspect')
  .description('Get details about a specific ABAP package')
  .option('--json', 'Output as JSON', false)
  .action(async (name, options) => {
    try {
      const client = await getAdtClientV2();

      // Fetch package directly via packages contract
      const pkg = await client.adt.packages.get(name);

      // JSON output
      if (options.json) {
        console.log(JSON.stringify(pkg, null, 2));
        return;
      }

      // Use router to render the package page
      const route = router.get('DEVC');
      // Extract package data - response is wrapped in { package: ... }
      const pkgData = (pkg as { package?: Record<string, unknown> })?.package ?? pkg ?? {};
      if (route) {
        const page = route.page(pkgData, { name });
        render(page);
      } else {
        // Fallback: simple output
        const pkgAny = pkgData as Record<string, unknown>;
        console.log(`📦 Package: ${pkgAny.name || name}`);
        console.log(`   Type: ${pkgAny.type || 'N/A'}`);
        console.log(`   Description: ${pkgAny.description || 'N/A'}`);
        const attrs = pkgAny.attributes as Record<string, unknown> | undefined;
        console.log(`   Package Type: ${attrs?.packageType || 'N/A'}`);
      }
    } catch (error) {
      console.error(
        `❌ Failed to get package:`,
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });
