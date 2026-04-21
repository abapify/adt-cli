import { Command } from 'commander';
import { writeFileSync } from 'fs';
import { getAdtClientV2 } from '../utils/adt-client-v2';

export const infoCommand = new Command('info')
  .description('Get SAP system and session information')
  .option('--session', 'Get session information')
  .option('--system', 'Get system information')
  .option(
    '-o, --output <file>',
    'Save data to file (JSON or XML based on extension)',
  )
  .action(async (options) => {
    try {
      // If no flags specified, show both
      const showSession =
        options.session || (!options.session && !options.system);
      const showSystem =
        options.system || (!options.session && !options.system);

      // Capture data for output
      const capturedData: any = {};

      // Create v2 client (uses global CLI context automatically)
      const adtClient = await getAdtClientV2();

      // Fetch session info
      if (showSession) {
        console.log('🔄 Fetching session information...\n');
        const sessionData = await adtClient.adt.core.http.sessions.getSession();
        capturedData.session = sessionData;

        if (!options.output) {
          console.log('📋 Session Information:');
          // Session data structure: { session: { properties?: { property?: [...] } } }
          const properties = sessionData.session?.properties?.property;
          if (properties && Array.isArray(properties)) {
            console.log('\n  Properties:');
            properties.forEach((prop: { name: string; _text?: string }) => {
              console.log(`    • ${prop.name}: ${prop._text || 'N/A'}`);
            });
          } else {
            console.log('  No session properties available');
          }
        }
      }

      // Fetch system info
      if (showSystem) {
        console.log(
          showSession
            ? '\n🔄 Fetching system information...\n'
            : '🔄 Fetching system information...\n',
        );
        const systemData =
          (await adtClient.adt.core.http.systeminformation.getSystemInfo()) as unknown as Record<
            string,
            unknown
          >;
        capturedData.system = systemData;

        if (!options.output) {
          console.log('🖥️  System Information:');

          // Display key system properties
          const displayProperty = (key: string, label: string) => {
            const value = systemData[key];
            if (value !== undefined && value !== null && value !== '') {
              const text =
                typeof value === 'object'
                  ? JSON.stringify(value)
                  : String(value);
              console.log(`  • ${label}: ${text}`);
            }
          };

          displayProperty('systemID', 'System ID');
          displayProperty('client', 'Client');
          displayProperty('userName', 'User');
          displayProperty('language', 'Language');
          displayProperty('release', 'Release');
          displayProperty('sapRelease', 'SAP Release');

          // Display any other properties
          const knownKeys = [
            'systemID',
            'client',
            'userName',
            'userFullName',
            'language',
            'release',
            'sapRelease',
          ];
          const otherKeys = Object.keys(systemData).filter(
            (k) => !knownKeys.includes(k),
          );
          if (otherKeys.length > 0) {
            console.log('\n  Additional properties:');
            otherKeys.forEach((key) => {
              console.log(`    • ${key}: ${JSON.stringify(systemData[key])}`);
            });
          }
        }
      }

      // Save to file if requested
      if (options.output) {
        const isXml = options.output.toLowerCase().endsWith('.xml');

        if (isXml) {
          console.error('❌ XML output not supported for combined info');
          console.error('💡 Use JSON format: -o output.json');
          process.exit(1);
        }

        // Save as JSON
        writeFileSync(options.output, JSON.stringify(capturedData, null, 2));
        console.log(`\n💾 Information saved to: ${options.output}`);
      }

      console.log('\n✅ Done!');
    } catch (error) {
      console.error(
        '❌ Failed to fetch information:',
        error instanceof Error ? error.message : String(error),
      );
      if (error instanceof Error && error.stack) {
        console.error('\nStack trace:', error.stack);
      }
      process.exit(1);
    }
  });
