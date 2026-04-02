/**
 * Package Get Command
 *
 * Get details about a specific ABAP package.
 * Usage: npx adt get package <name>
 *        npx adt get package <name> --objects
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getAdtClientV2 } from '../../utils/adt-client-v2';
import { render, router } from '../../ui';
import { AdkPackage } from '@abapify/adk';
import { adtLink, packageLink } from '../../ui/components';

// =============================================================================
// Objects Section Renderer
// =============================================================================

interface PackageObject {
  type: string;
  name: string;
  description: string;
  uri: string;
  packageName: string;
}

/**
 * Render objects section using the same visual style as Section/Field components.
 * Groups objects by type with ADT links for each object name.
 */
function renderObjectsSection(
  objects: PackageObject[],
  pkgName: string,
  includesSubpackages: boolean,
): void {
  // Group by type
  const byType = new Map<string, PackageObject[]>();
  for (const obj of objects) {
    const list = byType.get(obj.type) ?? [];
    list.push(obj);
    byType.set(obj.type, list);
  }

  // Section header (matches Section component style: empty line + underlined title)
  console.log();
  console.log(chalk.underline(`▼ Objects (${objects.length})`));

  for (const [type, list] of [...byType.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    console.log(chalk.dim(`  ${type} (${list.length})`));
    for (const obj of list.sort((a, b) => a.name.localeCompare(b.name))) {
      const nameStr = adtLink({
        name: obj.name,
        type: obj.type,
        uri: obj.uri,
      });
      const desc = obj.description ? chalk.dim(` — ${obj.description}`) : '';
      const pkgNote =
        includesSubpackages &&
        obj.packageName.toUpperCase() !== pkgName.toUpperCase()
          ? ` [${packageLink(obj.packageName)}]`
          : '';
      console.log(`    ${nameStr}${desc}${pkgNote}`);
    }
  }
}

// =============================================================================
// Command
// =============================================================================

export const packageGetCommand = new Command('package')
  .argument('<name>', 'Package name to inspect')
  .description('Get details about a specific ABAP package')
  .option('--json', 'Output as JSON', false)
  .option('--objects', 'List objects in the package')
  .option('--no-sub-packages', 'Exclude subpackages when listing objects')
  .action(async (name, options) => {
    try {
      const client = await getAdtClientV2();

      // Always fetch package details
      const pkgResponse = await client.adt.packages.get(name);

      // Fetch objects if requested
      let objects: PackageObject[] | undefined;
      if (options.objects) {
        const pkg = await AdkPackage.get(name.toUpperCase());
        objects = (options.subPackages
          ? await pkg.getAllObjects()
          : await pkg.getObjects()) as unknown as PackageObject[];
      }

      // JSON output (includes objects when --objects is passed)
      if (options.json) {
        const output = objects
          ? { ...(pkgResponse as Record<string, unknown>), objects }
          : pkgResponse;
        console.log(JSON.stringify(output, null, 2));
        return;
      }

      // Render package page
      const route = router.get('DEVC');
      const pkgData =
        (pkgResponse as { package?: Record<string, unknown> })?.package ??
        pkgResponse ??
        {};
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

      // Render objects section (extension, not replacement)
      if (objects) {
        renderObjectsSection(
          objects,
          name.toUpperCase(),
          options.subPackages ?? true,
        );
      }
    } catch (error) {
      console.error(
        `❌ Failed to get package:`,
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });
