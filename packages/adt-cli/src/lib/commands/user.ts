import { Command } from 'commander';
import { getAdtClientV2 } from '../utils/adt-client-v2';
import {
  createUserService,
  type UserInfo,
  type CurrentUserInfo,
} from '@abapify/adt-client';

function displayCurrentUser(info: CurrentUserInfo, json: boolean): void {
  if (json) {
    console.log(JSON.stringify(info, null, 2));
  } else {
    console.log(`👤 Current User: ${info.userName}`);
    if (info.userFullName) {
      console.log(`   Full Name: ${info.userFullName}`);
    }
    console.log(`   System: ${info.systemID} (client ${info.client})`);
  }
}

function displayUsers(users: UserInfo[], json: boolean): void {
  if (json) {
    console.log(
      JSON.stringify(
        users.map((u) => ({ username: u.username, fullName: u.fullName })),
        null,
        2,
      ),
    );
  } else {
    console.log(`Found ${users.length} user(s):\n`);
    for (const user of users) {
      console.log(
        `  ${(user.username ?? '').padEnd(12)} ${user.fullName || ''}`,
      );
      if (user.uri) console.log(`  ${''.padEnd(12)} URI: ${user.uri}`);
    }
  }
}

export const userCommand = new Command('user')
  .description('Look up SAP system users')
  .argument('[query]', 'Username or search query (supports wildcards like *)')
  .option('-m, --max <number>', 'Maximum number of results', '50')
  .option('--json', 'Output results as JSON')
  .action(async (query: string | undefined, options) => {
    try {
      const adtClient = await getAdtClientV2();
      const userService = createUserService(adtClient.adt);

      if (!query) {
        if (!options.json) console.log('🔄 Fetching current user...\n');
        const info = await userService.getCurrentUser();
        displayCurrentUser(info, options.json);
      } else if (!query.includes('*') && !query.includes('?')) {
        if (!options.json)
          console.log(`🔍 Looking up user: ${query.toUpperCase()}...\n`);
        const users = await userService.getUserByName(query);
        if (options.json) {
          displayUsers(users, true);
        } else if (users.length === 0) {
          console.log('No user found.');
        } else {
          displayUsers(users, false);
        }
      } else {
        const maxcount = Number.parseInt(options.max, 10);
        if (!Number.isInteger(maxcount) || maxcount <= 0) {
          throw new Error('--max must be a positive integer');
        }
        if (!options.json)
          console.log(`🔍 Searching users: "${query}" (max: ${maxcount})...\n`);
        const users = await userService.searchUsers(query, maxcount);
        if (options.json) {
          displayUsers(users, true);
        } else if (users.length === 0) {
          console.log('No users found matching your query.');
        } else {
          displayUsers(users, false);
        }
      }

      if (!options.json) console.log('\n✅ Done!');
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
