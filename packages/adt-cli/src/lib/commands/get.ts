/**
 * Get Command
 *
 * Generic command to fetch and display ABAP object details.
 * Uses router-based architecture for type-agnostic handling.
 */

import { Command } from 'commander';
import { getAdtClientV2 } from '../utils/adt-client-v2';
import { render, router, createGenericPage } from '../ui';

/**
 * Extract base object type from ADT type string
 * ADT types can include subtypes (e.g., "DOMA/DD", "CLAS/OC")
 */
function getBaseObjectType(adtType: string): string {
  const slashIndex = adtType.indexOf('/');
  return slashIndex >= 0 ? adtType.substring(0, slashIndex) : adtType;
}

export const getCommand = new Command('get')
  .argument('<objectName>', 'ABAP object name to inspect')
  .description('Get details about a specific ABAP object')
  .option('--json', 'Output as JSON', false)
  .action(async (objectName, options) => {
    try {
      const client = await getAdtClientV2();

      // Step 1: Search for the object
      const searchResult =
        await client.adt.repository.informationsystem.search.quickSearch({
          query: objectName,
          maxResults: 10,
        });

      // Handle union type - objectReference may be array or single object
      const rawObjects =
        'objectReference' in searchResult ? searchResult.objectReference : [];
      const objects = Array.isArray(rawObjects)
        ? rawObjects
        : rawObjects
          ? [rawObjects]
          : [];

      // Define object type for type safety
      type SearchObject = {
        name?: string;
        type?: string;
        uri?: string;
        description?: string;
        packageName?: string;
      };

      // Find exact match
      const exactMatch = objects.find(
        (obj: SearchObject) =>
          String(obj.name || '').toUpperCase() === objectName.toUpperCase(),
      );

      if (!exactMatch) {
        console.log(`❌ Object '${objectName}' not found`);

        // Show similar objects if any
        const similar = objects.filter((obj: SearchObject) =>
          String(obj.name || '')
            .toUpperCase()
            .includes(objectName.toUpperCase()),
        );

        if (similar.length > 0) {
          console.log(`\n💡 Similar objects found:`);
          similar.slice(0, 5).forEach((obj) => {
            console.log(`   • ${obj.name} (${obj.type}) - ${obj.packageName}`);
          });
        }
        return;
      }

      const objectType = getBaseObjectType(String(exactMatch.type || ''));

      // Step 2: Try to fetch full object data via router
      const route = router.get(objectType);

      if (route) {
        try {
          // Fetch full object data using route's fetch function
          const data = await route.fetch(client, {
            name: String(exactMatch.name || objectName),
          });

          // JSON output
          if (options.json) {
            console.log(JSON.stringify(data, null, 2));
            return;
          }

          // Render page
          const params = { name: String(exactMatch.name || objectName) };
          const page = route.page(data, params);
          render(page);
          return;
        } catch (fetchError) {
          // If fetch fails (e.g., 404 for non-package), fall through to generic
          const is404 =
            fetchError instanceof Error &&
            (fetchError.message.includes('404') ||
              fetchError.message.includes('Not Found'));
          if (!is404) {
            throw fetchError;
          }
        }
      }

      // Step 3: Fallback to generic page from search result
      if (options.json) {
        console.log(JSON.stringify(exactMatch, null, 2));
        return;
      }

      const genericPage = createGenericPage({
        name: String(exactMatch.name || ''),
        type: String(exactMatch.type || ''),
        uri: String(exactMatch.uri || ''),
        description: String(exactMatch.description || ''),
        packageName: String(exactMatch.packageName || ''),
      });
      render(genericPage);
    } catch (error) {
      console.error(
        `❌ Get failed:`,
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });
