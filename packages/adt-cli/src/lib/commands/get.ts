/**
 * Get Command
 *
 * Generic command to fetch and display ABAP object details.
 * Uses router-based architecture for type-agnostic handling.
 */

import { Command } from 'commander';
import { getAdtClientV2 } from '../utils/adt-client-v2';
import { render, router, createGenericPage } from '../ui';
import type { AdtClient, Route } from '../ui';
import { normalizeObjectName } from '@abapify/adk';

/** A search result object as consumed by the get command. */
type SearchObject = {
  name?: string;
  type?: string;
  uri?: string;
  description?: string;
  packageName?: string;
};

/**
 * Extract base object type from ADT type string
 * ADT types can include subtypes (e.g., "DOMA/DD", "CLAS/OC")
 */
function getBaseObjectType(adtType: string): string {
  const slashIndex = adtType.indexOf('/');
  return slashIndex >= 0 ? adtType.substring(0, slashIndex) : adtType;
}

/** Show "not found" output with up to five similar object suggestions. */
function printNotFound(objectName: string, objects: SearchObject[]): void {
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
}

/**
 * Fetch and render the object via a registered route.
 * Returns true when output was produced, false to fall through to the generic
 * page. Fetch errors other than 404/Not Found propagate to the caller.
 */
async function renderViaRoute(
  client: AdtClient,
  route: Route,
  match: SearchObject,
  objectName: string,
  options: { json: boolean },
): Promise<boolean> {
  const params = { name: String(match.name || objectName) };
  try {
    // Fetch full object data using route's fetch function
    const data = await route.fetch(client, params);

    // JSON output
    if (options.json) {
      console.log(JSON.stringify(data, null, 2));
      return true;
    }

    // Render page
    render(route.page(data, params));
    return true;
  } catch (fetchError) {
    // If fetch fails (e.g., 404 for non-package), fall through to generic
    const is404 =
      fetchError instanceof Error &&
      (fetchError.message.includes('404') ||
        fetchError.message.includes('Not Found'));
    if (!is404) {
      throw fetchError;
    }
    return false;
  }
}

/** Render the generic page (or raw JSON) for a search result. */
function renderGeneric(match: SearchObject, options: { json: boolean }): void {
  // JSON output
  if (options.json) {
    console.log(JSON.stringify(match, null, 2));
    return;
  }

  const genericPage = createGenericPage({
    name: String(match.name || ''),
    type: String(match.type || ''),
    uri: String(match.uri || ''),
    description: String(match.description || ''),
    packageName: String(match.packageName || ''),
  });
  render(genericPage);
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

      // Find exact match (also try normalized names, e.g., strip SAPL for FUGR)
      const candidates = normalizeObjectName(objectName);
      const exactMatch = objects.find((obj: SearchObject) => {
        const objName = String(obj.name || '').toUpperCase();
        return candidates.some((c) => c.toUpperCase() === objName);
      });

      if (!exactMatch) {
        printNotFound(objectName, objects);
        return;
      }

      const objectType = getBaseObjectType(String(exactMatch.type || ''));

      // Step 2: Try to fetch full object data via router
      const route = router.get(objectType);
      const rendered = route
        ? await renderViaRoute(client, route, exactMatch, objectName, options)
        : false;
      if (rendered) return;

      // Step 3: Fallback to generic page from search result
      renderGeneric(exactMatch, options);
    } catch (error) {
      console.error(
        `❌ Get failed:`,
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });
