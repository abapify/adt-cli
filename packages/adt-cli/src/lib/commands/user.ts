import { Command } from 'commander';
import { getAdtClientV2 } from '../utils/adt-client-v2';
import {
  createUserService,
  type UserInfo,
  type CurrentUserInfo,
} from '@abapify/adt-client';

function displayCurrentUserJson(info: CurrentUserInfo): void {
  console.log(JSON.stringify(info, null, 2));
}

function displayCurrentUser(info: CurrentUserInfo): void {
  console.log(`👤 Current User: ${info.userName}`);
  if (info.userFullName) {
    console.log(`   Full Name: ${info.userFullName}`);
  }
  console.log(`   System: ${info.systemID} (client ${info.client})`);
}

function displayUsersJson(users: UserInfo[]): void {
  console.log(
    JSON.stringify(
      users.map((u) => ({ username: u.username, fullName: u.fullName })),
      null,
      2,
    ),
  );
}

function displayUsers(users: UserInfo[]): void {
  console.log(`Found ${users.length} user(s):\n`);
  for (const user of users) {
    console.log(`  ${(user.username ?? '').padEnd(12)} ${user.fullName || ''}`);
    if (user.uri) console.log(`  ${''.padEnd(12)} URI: ${user.uri}`);
  }
}

type UserService = ReturnType<typeof createUserService>;

/** No query: fetch and display the current user. */
async function runCurrentUser(
  userService: UserService,
  options: { json?: boolean },
): Promise<void> {
  if (!options.json) console.log('🔄 Fetching current user...\n');
  const info = await userService.getCurrentUser();
  if (options.json) {
    displayCurrentUserJson(info);
  } else {
    displayCurrentUser(info);
  }
}

/** Exact name (no wildcards): look up a single user. */
async function runUserLookup(
  userService: UserService,
  query: string,
  options: { json?: boolean; max?: string },
): Promise<void> {
  if (!options.json)
    console.log(`🔍 Looking up user: ${query.toUpperCase()}...\n`);
  const users = await userService.getUserByName(query);
  if (options.json) {
    displayUsersJson(users);
  } else if (users.length === 0) {
    console.log('No user found.');
  } else {
    displayUsers(users);
  }
}

/** Wildcard query: search users with a result limit. */
async function runUserSearch(
  userService: UserService,
  query: string,
  options: { json?: boolean; max?: string },
): Promise<void> {
  const maxcount = Number.parseInt(options.max ?? '', 10);
  if (!Number.isInteger(maxcount) || maxcount <= 0) {
    throw new Error('--max must be a positive integer');
  }
  if (!options.json)
    console.log(`🔍 Searching users: "${query}" (max: ${maxcount})...\n`);
  const users = await userService.searchUsers(query, maxcount);
  if (options.json) {
    displayUsersJson(users);
  } else if (users.length === 0) {
    console.log('No users found matching your query.');
  } else {
    displayUsers(users);
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
        await runCurrentUser(userService, options);
      } else if (!query.includes('*') && !query.includes('?')) {
        await runUserLookup(userService, query, options);
      } else {
        await runUserSearch(userService, query, options);
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
