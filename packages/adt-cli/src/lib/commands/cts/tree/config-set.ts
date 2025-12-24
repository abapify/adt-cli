/**
 * adt cts tree config set - Update search configuration via CLI
 *
 * Fast way to update configuration without interactive editor.
 * Only specified options are changed; others remain unchanged.
 *
 * Usage:
 *   adt cts tree config set --user=PPLENKOV
 *   adt cts tree config set --user=* --workbench=true --customizing=false
 *   adt cts tree config set --released=true --date-filter=3
 */

import { Command } from 'commander';
import { getAdtClientV2 } from '../../../utils/adt-client-v2';

/**
 * Extract config ID from URI path
 */
function extractConfigId(uri: string): string {
  const parts = uri.split('/');
  return parts[parts.length - 1];
}

/**
 * Convert properties from parsed configuration to key-value map
 */
function propertiesToMap(config: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (!config || typeof config !== 'object') return result;

  const configObj = config as Record<string, unknown>;
  const properties = configObj.properties as
    | Record<string, unknown>
    | undefined;

  if (!properties) return result;

  const propArray = properties.property;
  if (!propArray) return result;

  const props = Array.isArray(propArray) ? propArray : [propArray];

  for (const prop of props) {
    if (prop && typeof prop === 'object') {
      const p = prop as Record<string, unknown>;
      const key = p.key as string | undefined;
      const value = p['$text'] as string | undefined;
      if (key && value !== undefined) {
        result[key] = String(value);
      }
    }
  }
  return result;
}

/**
 * Build configuration data for PUT request
 */
function buildConfigurationData(properties: Record<string, string>) {
  const propertyArray = Object.entries(properties).map(([key, value]) => ({
    key,
    isMandatory: undefined,
    $text: value,
  }));

  return {
    properties: {
      property: propertyArray,
    },
  };
}

export const treeConfigSetCommand = new Command('set')
  .description(
    'Update search configuration (only specified options are changed)',
  )
  .option('-u, --user <username>', 'Filter by user (use * for all users)')
  .option('--workbench <bool>', 'Include workbench requests (true/false)')
  .option('--customizing <bool>', 'Include customizing requests (true/false)')
  .option('--copies <bool>', 'Include transport of copies (true/false)')
  .option('--modifiable <bool>', 'Include modifiable requests (true/false)')
  .option('--released <bool>', 'Include released requests (true/false)')
  .option(
    '--date-filter <preset>',
    'Date filter preset (0=Week, 1=2Weeks, 2=4Weeks, 3=3Months, 4=Custom, 5=All)',
  )
  .option('--from-date <date>', 'From date (YYYY-MM-DD or YYYYMMDD)')
  .option('--to-date <date>', 'To date (YYYY-MM-DD or YYYYMMDD)')
  .action(async (options) => {
    try {
      const client = await getAdtClientV2();

      // Check if any option was provided
      const hasOptions =
        options.user !== undefined ||
        options.workbench !== undefined ||
        options.customizing !== undefined ||
        options.copies !== undefined ||
        options.modifiable !== undefined ||
        options.released !== undefined ||
        options.dateFilter !== undefined ||
        options.fromDate !== undefined ||
        options.toDate !== undefined;

      if (!hasOptions) {
        console.log(
          '💡 No options specified. Use --help to see available options.',
        );
        console.log('\nExamples:');
        console.log('  npx adt cts tree config set --user=PPLENKOV');
        console.log('  npx adt cts tree config set --user=* --workbench=true');
        console.log(
          '  npx adt cts tree config set --released=true --date-filter=3',
        );
        return;
      }

      console.log('🔍 Fetching current configuration...');

      // Get configurations list
      const configsResponse =
        await client.adt.cts.transportrequests.searchconfiguration.configurations.get();

      // Response has 'configurations' property (plural) containing config array
      const configsData = configsResponse as { configurations?: unknown };
      const configs = configsData?.configurations as
        | Array<{ link?: { href?: string } }>
        | undefined;
      if (!configs) {
        console.log('\n❌ No search configuration found');
        return;
      }

      const configArray = Array.isArray(configs) ? configs : [configs];
      if (configArray.length === 0) {
        console.log('\n❌ No search configuration found');
        return;
      }

      const firstConfig = configArray[0];
      const configUri = firstConfig?.link?.href;

      if (!configUri) {
        console.log('\n❌ No configuration URI found');
        return;
      }

      // Fetch current config details
      const configId = extractConfigId(configUri);
      const configDetails =
        await client.adt.cts.transportrequests.searchconfiguration.configurations.getById(
          configId,
        );
      const currentProps = propertiesToMap(configDetails);

      // Apply changes - only update what was specified
      const newProps = { ...currentProps };

      if (options.user !== undefined) {
        newProps.User = options.user;
        console.log(`  📝 User: ${options.user}`);
      }
      if (options.workbench !== undefined) {
        newProps.WorkbenchRequests =
          options.workbench === 'true' || options.workbench === true
            ? 'true'
            : 'false';
        console.log(`  📝 WorkbenchRequests: ${newProps.WorkbenchRequests}`);
      }
      if (options.customizing !== undefined) {
        newProps.CustomizingRequests =
          options.customizing === 'true' || options.customizing === true
            ? 'true'
            : 'false';
        console.log(
          `  📝 CustomizingRequests: ${newProps.CustomizingRequests}`,
        );
      }
      if (options.copies !== undefined) {
        newProps.TransportOfCopies =
          options.copies === 'true' || options.copies === true
            ? 'true'
            : 'false';
        console.log(`  📝 TransportOfCopies: ${newProps.TransportOfCopies}`);
      }
      if (options.modifiable !== undefined) {
        newProps.Modifiable =
          options.modifiable === 'true' || options.modifiable === true
            ? 'true'
            : 'false';
        console.log(`  📝 Modifiable: ${newProps.Modifiable}`);
      }
      if (options.released !== undefined) {
        newProps.Released =
          options.released === 'true' || options.released === true
            ? 'true'
            : 'false';
        console.log(`  📝 Released: ${newProps.Released}`);
      }
      if (options.dateFilter !== undefined) {
        newProps.DateFilter = String(options.dateFilter);
        console.log(`  📝 DateFilter: ${newProps.DateFilter}`);
      }
      if (options.fromDate !== undefined) {
        // Normalize date format to YYYYMMDD
        newProps.FromDate = options.fromDate.replace(/-/g, '');
        console.log(`  📝 FromDate: ${newProps.FromDate}`);
      }
      if (options.toDate !== undefined) {
        // Normalize date format to YYYYMMDD
        newProps.ToDate = options.toDate.replace(/-/g, '');
        console.log(`  📝 ToDate: ${newProps.ToDate}`);
      }

      // Save configuration
      console.log('\n🔄 Saving configuration...');
      const configData = buildConfigurationData(newProps);

      // Cast to unknown to bypass schema mismatch - schema alignment pending
      await client.adt.cts.transportrequests.searchconfiguration.configurations.put(
        configId,
        configData as unknown as Parameters<
          typeof client.adt.cts.transportrequests.searchconfiguration.configurations.put
        >[1],
      );

      console.log('✅ Configuration updated successfully');
    } catch (error) {
      console.error(
        '❌ Failed:',
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });
