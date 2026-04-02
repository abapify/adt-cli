import { Command } from 'commander';
import { getAdtClientV2 } from '../utils/adt-client-v2';

/** Extract entries from atomFeed parsed response */
function extractEntries(
  data: unknown,
): { id?: string; title?: string; link?: { href: string }[] }[] {
  const feed = data as Record<string, unknown>;
  const feedData = feed.feed as Record<string, unknown> | undefined;
  if (!feedData) return [];

  const rawEntries = feedData.entry;
  if (!rawEntries) return [];
  return Array.isArray(rawEntries) ? rawEntries : [rawEntries];
}

export const userCommand = new Command('user')
  .description('Look up SAP system users')
  .argument('[query]', 'Username or search query (supports wildcards like *)')
  .option('-m, --max <number>', 'Maximum number of results', '50')
  .option('--json', 'Output results as JSON')
  .action(async (query: string | undefined, options) => {
    try {
      const adtClient = await getAdtClientV2();

      if (!query) {
        // No query: show current user via systeminformation
        console.log('🔄 Fetching current user...\n');
        const sysInfo =
          (await adtClient.adt.core.http.systeminformation.getSystemInfo()) as Record<
            string,
            unknown
          >;

        if (options.json) {
          console.log(
            JSON.stringify(
              {
                userName: sysInfo.userName,
                userFullName: sysInfo.userFullName,
                systemID: sysInfo.systemID,
                client: sysInfo.client,
              },
              null,
              2,
            ),
          );
        } else {
          console.log(`👤 Current User: ${sysInfo.userName}`);
          if (sysInfo.userFullName) {
            console.log(`   Full Name: ${sysInfo.userFullName}`);
          }
          console.log(
            `   System: ${sysInfo.systemID} (client ${sysInfo.client})`,
          );
        }

        console.log('\n✅ Done!');
        return;
      }

      // Check if query looks like an exact username (no wildcards)
      const isExactLookup = !query.includes('*') && !query.includes('?');

      if (isExactLookup) {
        // Get specific user
        console.log(`🔍 Looking up user: ${query.toUpperCase()}...\n`);
        const result = await adtClient.adt.system.users.get(
          query.toUpperCase(),
        );

        const entries = extractEntries(result);
        if (entries.length === 0) {
          console.log('No user found.');
          return;
        }

        if (options.json) {
          console.log(
            JSON.stringify(
              entries.map((e) => ({ username: e.id, fullName: e.title })),
              null,
              2,
            ),
          );
        } else {
          for (const entry of entries) {
            console.log(`👤 ${entry.id}`);
            if (entry.title) console.log(`   Full Name: ${entry.title}`);
            if (entry.link?.[0]?.href)
              console.log(`   URI: ${entry.link[0].href}`);
          }
        }
      } else {
        // Search users
        const maxcount = parseInt(options.max, 10);
        console.log(`🔍 Searching users: "${query}" (max: ${maxcount})...\n`);
        const result = await adtClient.adt.system.users.search({
          querystring: query,
          maxcount,
        });

        const entries = extractEntries(result);
        if (entries.length === 0) {
          console.log('No users found matching your query.');
          return;
        }

        if (options.json) {
          console.log(
            JSON.stringify(
              entries.map((e) => ({ username: e.id, fullName: e.title })),
              null,
              2,
            ),
          );
        } else {
          console.log(`Found ${entries.length} user(s):\n`);
          for (const entry of entries) {
            console.log(`  ${entry.id?.padEnd(12)} ${entry.title || ''}`);
          }
        }
      }

      console.log('\n✅ Done!');
    } catch (error) {
      console.error(
        '❌ User lookup failed:',
        error instanceof Error ? error.message : String(error),
      );
      if (error instanceof Error && error.stack) {
        console.error('\nStack trace:', error.stack);
      }
      process.exit(1);
    }
  });
