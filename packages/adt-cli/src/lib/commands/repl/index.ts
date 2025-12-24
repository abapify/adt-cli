/**
 * ADT REPL - Interactive Hypermedia Navigator
 *
 * Thin wrapper around @abapify/adt-tui.
 */

import { Command } from 'commander';
import { run } from '@abapify/adt-tui';
import { getAdtClientV2 } from '../../utils/adt-client-v2';

/**
 * Create fetch function for adt-tui from ADT client
 */
async function createFetchFn() {
  const adtClient = await getAdtClientV2();

  return async (
    url: string,
    options?: { method?: string; headers?: Record<string, string> },
  ): Promise<string> => {
    const method = (options?.method || 'GET') as
      | 'GET'
      | 'POST'
      | 'PUT'
      | 'PATCH'
      | 'DELETE';
    const response = await adtClient.fetch(url, {
      method,
      headers: options?.headers || { Accept: '*/*' },
    });
    return typeof response === 'string' ? response : String(response);
  };
}

/**
 * Get system ID for ADT links
 */
async function getSystemId(): Promise<string | undefined> {
  try {
    const adtClient = await getAdtClientV2();
    const info =
      await adtClient.adt.core.http.systeminformation.getSystemInfo();
    // Response is parsed data with systemID property
    const infoData = info as { systemID?: string };
    return infoData.systemID;
  } catch {
    return undefined;
  }
}

/**
 * Create the REPL command
 */
export function createReplCommand(): Command {
  return new Command('repl')
    .description('Interactive hypermedia navigator for ADT APIs')
    .argument('[url]', 'Optional starting URL path')
    .action(async (url?: string) => {
      try {
        const [fetch, systemName] = await Promise.all([
          createFetchFn(),
          getSystemId(),
        ]);
        await run({ startUrl: url, fetch, systemName });
      } catch (error) {
        console.error(
          '❌ Failed to start REPL:',
          error instanceof Error ? error.message : String(error),
        );
        process.exit(1);
      }
    });
}
