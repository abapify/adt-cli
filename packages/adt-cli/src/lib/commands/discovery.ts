import { Command } from 'commander';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { getAdtClientV2, getCaptured } from '../utils/adt-client-v2';
import { DiscoveryPage } from '../ui/pages';

export const discoveryCommand = new Command('discovery')
  .description('Discover available ADT services')
  .option(
    '-o, --output <file>',
    'Save discovery data to file (JSON or XML based on extension)',
  )
  .option('-f, --filter <text>', 'Filter workspaces by title')
  .action(async (options, command) => {
    try {
      // Create v2 client with capture enabled
      const adtClient = await getAdtClientV2({ capture: true });

      // Fetch discovery data
      const discovery = await adtClient.adt.discovery.getDiscovery();

      // Get captured data (for XML output)
      const captured = getCaptured();

      if (options.output) {
        // Detect format based on file extension
        const isXml = options.output.toLowerCase().endsWith('.xml');

        if (isXml) {
          if (captured.xml) {
            // Ensure parent directory exists
            mkdirSync(dirname(options.output), { recursive: true });
            // Save raw XML
            writeFileSync(options.output, captured.xml);
            console.log(`💾 Discovery XML saved to: ${options.output}`);
          } else {
            console.error('❌ No XML captured');
            process.exit(1);
          }
        } else {
          // Ensure parent directory exists
          mkdirSync(dirname(options.output), { recursive: true });
          // Save as JSON (default)
          writeFileSync(options.output, JSON.stringify(discovery, null, 2));
          console.log(`💾 Discovery JSON saved to: ${options.output}`);
        }
      } else {
        // Direct page instantiation - simple and clear
        const page = DiscoveryPage(discovery, { filter: options.filter });
        page.print();
      }
    } catch (error) {
      console.error(
        '❌ Discovery failed:',
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });
