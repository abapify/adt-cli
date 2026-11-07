import { Command } from 'commander';
import { writeFileSync } from 'node:fs';
import { getAdtClientV2 } from '../utils/adt-client-v2';
import { asText } from '../utils/text';

type AdtClientV2 = Awaited<ReturnType<typeof getAdtClientV2>>;

// Display key system properties.
// - Preserve the original truthy semantics (`!value` was the
//   pre-PR condition): hide null / undefined / '' / 0 / false,
//   since SAP system-info fields are string-shaped in practice
//   and surfacing numeric 0 / false would be a regression.
// - Guard JSON.stringify against circular refs / BigInt so a
//   malformed value can never crash the `info` command.
function printSystemProperties(systemData: Record<string, unknown>): void {
  const safeStringify = (v: unknown): string => {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  };
  const displayProperty = (key: string, label: string) => {
    const value = systemData[key];
    if (!value) return;
    const text =
      typeof value === 'object' ? safeStringify(value) : asText(value);
    console.log(`  • ${label}: ${text}`);
  };

  displayProperty('systemID', 'System ID');
  displayProperty('client', 'Client');
  displayProperty('userName', 'User');
  displayProperty('language', 'Language');
  displayProperty('release', 'Release');
  displayProperty('sapRelease', 'SAP Release');

  // Display any other properties
  const knownKeys = new Set([
    'systemID',
    'client',
    'userName',
    'userFullName',
    'language',
    'release',
    'sapRelease',
  ]);
  const otherKeys = Object.keys(systemData).filter((k) => !knownKeys.has(k));
  if (otherKeys.length > 0) {
    console.log('\n  Additional properties:');
    otherKeys.forEach((key) => {
      console.log(`    • ${key}: ${safeStringify(systemData[key])}`);
    });
  }
}

// Fetch session info and (unless saving to file) print it.
async function fetchAndPrintSession(
  adtClient: AdtClientV2,
  capturedData: Record<string, unknown>,
  options: { output?: string },
): Promise<void> {
  console.log('🔄 Fetching session information...\n');
  const sessionData = await adtClient.adt.core.http.sessions.getSession();
  capturedData.session = sessionData;

  if (options.output) return;

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

// Fetch system info and (unless saving to file) print it.
async function fetchAndPrintSystem(
  adtClient: AdtClientV2,
  capturedData: Record<string, unknown>,
  showSession: boolean,
  options: { output?: string },
): Promise<void> {
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

  if (options.output) return;

  console.log('🖥️  System Information:');
  printSystemProperties(systemData);
}

// Save captured data to file if requested (JSON only).
function saveInfoOutput(
  options: { output?: string },
  capturedData: Record<string, unknown>,
): void {
  if (!options.output) return;

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
      const capturedData: Record<string, unknown> = {};

      // Create v2 client (uses global CLI context automatically)
      const adtClient = await getAdtClientV2();

      if (showSession) {
        await fetchAndPrintSession(adtClient, capturedData, options);
      }

      if (showSystem) {
        await fetchAndPrintSystem(
          adtClient,
          capturedData,
          showSession,
          options,
        );
      }

      // Save to file if requested
      saveInfoOutput(options, capturedData);

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
