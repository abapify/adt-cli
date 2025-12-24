import { Command } from 'commander';
import { getAdtClientV2 } from '../utils/adt-client-v2';

export const searchCommand = new Command('search')
  .description('Search for ABAP objects in the repository')
  .argument('<query>', 'Search query (supports wildcards like *)')
  .option('-m, --max <number>', 'Maximum number of results', '50')
  .option('--json', 'Output results as JSON')
  .action(async (query: string, options) => {
    try {
      const adtClient = await getAdtClientV2();
      const maxResults = parseInt(options.max, 10);

      console.log(
        `🔍 Searching for: "${query}" (max: ${maxResults} results)...\n`,
      );

      // Perform search
      const results =
        await adtClient.adt.repository.informationsystem.search.quickSearch({
          query,
          maxResults,
        });

      // Handle results - define type for search objects
      type SearchObject = {
        name?: string;
        type?: string;
        uri?: string;
        description?: string;
        packageName?: string;
      };
      // Results can come in different shapes depending on response - handle both
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
      const objects: SearchObject[] = rawObjects
        ? Array.isArray(rawObjects)
          ? rawObjects
          : [rawObjects]
        : [];

      if (objects.length === 0) {
        console.log('No objects found matching your query.');
        return;
      }

      if (options.json) {
        // Output as JSON
        console.log(JSON.stringify(objects, null, 2));
      } else {
        // Format as table
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
