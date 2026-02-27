import { Command } from 'commander';
import { writeFileSync } from 'fs';
import { getAdtClientV2 } from '../utils/adt-client-v2';

export const fetchCommand = new Command('fetch')
  .description('Fetch a URL with authentication (like curl but authenticated)')
  .argument('<url>', 'URL path to fetch (e.g., /sap/bc/adt/core/http/sessions)')
  .option('-X, --method <method>', 'HTTP method', 'GET')
  .option(
    '-H, --header <header>',
    'Add header (can be used multiple times)',
    collect,
    [],
  )
  .option('-d, --data <data>', 'Request body (for POST/PUT)')
  .option('-o, --output <file>', 'Save response to file')
  .option(
    '--accept <type>',
    'Set Accept header (shorthand for -H "Accept: <type>")',
  )
  .action(async (url: string, options, command) => {
    try {
      // Create v2 client (uses global CLI context automatically)
      const adtClient = await getAdtClientV2({
        writeMetadata: true, // Always write metadata for debugging
      });

      // Parse custom headers
      const customHeaders: Record<string, string> = {};
      for (const header of options.header) {
        const [key, ...valueParts] = header.split(':');
        if (key && valueParts.length > 0) {
          customHeaders[key.trim()] = valueParts.join(':').trim();
        }
      }

      // Add Accept header if specified
      if (options.accept) {
        customHeaders['Accept'] = options.accept;
      }

      const method = options.method.toUpperCase() as
        | 'GET'
        | 'POST'
        | 'PUT'
        | 'PATCH'
        | 'DELETE';

      console.log(`🔄 ${method} ${url}...\n`);

      // Use the client's fetch utility method
      const response = await adtClient.fetch(url, {
        method,
        headers: customHeaders,
        body: options.data,
      });

      // Display response
      if (options.output) {
        const content =
          typeof response === 'string'
            ? response
            : JSON.stringify(response, null, 2);
        writeFileSync(options.output, content);
        console.log(`💾 Response saved to: ${options.output}`);
      } else {
        // Display response (string or formatted JSON)
        if (typeof response === 'string') {
          console.log(response);
        } else {
          console.log(JSON.stringify(response, null, 2));
        }
      }

      console.log('\n✅ Done!');
    } catch (error) {
      console.error(
        '❌ Request failed:',
        error instanceof Error ? error.message : String(error),
      );
      if (error instanceof Error && error.stack) {
        console.error('\nStack trace:', error.stack);
      }
      process.exit(1);
    }
  });

// Helper to collect repeated options
function collect(value: string, previous: string[]) {
  return previous.concat([value]);
}
