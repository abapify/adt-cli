import { Command } from 'commander';
import { getAdtClientV2 } from '../utils/adt-client-v2';

type SearchObject = {
  name?: string;
  type?: string;
  uri?: string;
  description?: string;
  packageName?: string;
};

/**
 * Normalize quickSearch results into a flat object list.
 * Results can come in different shapes depending on response.
 */
function extractSearchObjects(results: unknown): SearchObject[] {
  const resultsAny = results as Record<string, unknown>;
  let rawObjects: SearchObject | SearchObject[] | undefined;
  if ('objectReferences' in resultsAny && resultsAny.objectReferences) {
    const refs = resultsAny.objectReferences as {
      objectReference?: SearchObject | SearchObject[];
    };
    rawObjects = refs.objectReference;
  } else if ('mainObject' in resultsAny && resultsAny.mainObject) {
    const main = resultsAny.mainObject as {
      objectReference?: SearchObject | SearchObject[];
    };
    rawObjects = main.objectReference;
  }
  if (!rawObjects) return [];
  return Array.isArray(rawObjects) ? rawObjects : [rawObjects];
}

/** Print search results as JSON or as a human-readable table. */
function printSearchResults(objects: SearchObject[], json: boolean): void {
  if (json) {
    console.log(JSON.stringify(objects, null, 2));
    return;
  }

  console.log(`Found ${objects.length} object(s):\n`);
  objects.forEach((obj, index) => {
    console.log(`${index + 1}. ${obj.name} (${obj.type})`);
    if (obj.description) {
      console.log(`   ${obj.description}`);
    }
    if (obj.packageName) {
      console.log(`   Package: ${obj.packageName}`);
    }
    console.log(`   URI: ${obj.uri}`);
    console.log();
  });
}

export const searchCommand = new Command('search')
  .description('Search for ABAP objects in the repository')
  .argument('<query>', 'Search query (supports wildcards like *)')
  .option('-m, --max <number>', 'Maximum number of results', '50')
  .option('--json', 'Output results as JSON')
  .action(async (query: string, options) => {
    try {
      const adtClient = await getAdtClientV2();
      const maxResults = Number.parseInt(options.max, 10);

      console.log(
        `🔍 Searching for: "${query}" (max: ${maxResults} results)...\n`,
      );

      // Perform search
      const results =
        await adtClient.adt.repository.informationsystem.search.quickSearch({
          query,
          maxResults,
        });

      const objects = extractSearchObjects(results);

      if (objects.length === 0) {
        console.log('No objects found matching your query.');
        return;
      }

      printSearchResults(objects, options.json);

      console.log('✅ Search complete!');
    } catch (error) {
      console.error(
        '❌ Search failed:',
        error instanceof Error ? error.message : String(error),
      );
      if (error instanceof Error && error.stack) {
        console.error('\nStack trace:', error.stack);
      }
      process.exit(1);
    }
  });
