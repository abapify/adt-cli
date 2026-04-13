/**
 * Source Command
 *
 * Read and write ABAP source code via ADT.
 *
 * Usage:
 *   adt source get <objectName> [--type CLAS]   # Print source to stdout
 *   adt source put <objectName> <file>  [--type CLAS] [--transport DEVK900001]
 */

import { Command } from 'commander';
import { readFile } from 'node:fs/promises';
import { getAdtClientV2 } from '../utils/adt-client-v2';
import { normalizeSearchResults } from '../utils/lock-helpers';
import { createLockService } from '@abapify/adt-locks';
import { getObjectUri } from '@abapify/adk';

/**
 * Resolve an object to its ADT URI.
 * Uses type-based registry lookup first, then falls back to quickSearch.
 */
async function resolveUri(
  client: Awaited<ReturnType<typeof getAdtClientV2>>,
  objectName: string,
  objectType?: string,
): Promise<string> {
  if (objectType) {
    const uri = getObjectUri(objectType, objectName);
    if (uri) return uri;
  }

  const searchResult =
    await client.adt.repository.informationsystem.search.quickSearch({
      query: objectName,
      maxResults: 10,
    });

  const objects = normalizeSearchResults(
    searchResult as Record<string, unknown>,
  );

  const match = objects.find(
    (o) => o.name?.toUpperCase() === objectName.toUpperCase(),
  );

  if (!match?.uri) throw new Error(`Object '${objectName}' not found`);
  return match.uri;
}

// ── sub-commands ─────────────────────────────────────────────────────────────

const getSourceCommand = new Command('get')
  .description('Print ABAP source code for an object to stdout')
  .argument('<objectName>', 'ABAP object name')
  .option('--type <type>', 'Object type hint (e.g. CLAS, PROG, INTF)')
  .action(async (objectName: string, options: { type?: string }) => {
    try {
      const client = await getAdtClientV2();
      const uri = await resolveUri(client, objectName, options.type);

      const source = await client.fetch(`${uri}/source/main`, {
        method: 'GET',
        headers: { Accept: 'text/plain' },
      });

      process.stdout.write(String(source));
    } catch (error) {
      console.error(
        '❌ Get source failed:',
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });

const putSourceCommand = new Command('put')
  .description('Write ABAP source code from a file to an existing object')
  .argument('<objectName>', 'ABAP object name')
  .argument('<file>', 'Path to the source file to upload')
  .option('--type <type>', 'Object type hint (e.g. CLAS, PROG, INTF)')
  .option(
    '--transport <transport>',
    'Transport request number for transportable objects',
  )
  .action(
    async (
      objectName: string,
      file: string,
      options: { type?: string; transport?: string },
    ) => {
      try {
        const client = await getAdtClientV2();
        const uri = await resolveUri(client, objectName, options.type);
        const sourceCode = await readFile(file, 'utf8');

        const lockService = createLockService(client);

        console.log(`🔒 Locking ${objectName}...`);
        const lock = await lockService.lock(uri, {
          transport: options.transport,
          objectName,
        });

        try {
          const params = new URLSearchParams({ lockHandle: lock.handle });
          if (options.transport) params.set('corrNr', options.transport);

          console.log(`✏️  Writing source to ${uri}...`);
          await client.fetch(`${uri}/source/main?${params.toString()}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'text/plain' },
            body: sourceCode,
          });

          await lockService.unlock(uri, { lockHandle: lock.handle });
          console.log(`✅ Source written and lock released for ${objectName}`);
        } catch (err) {
          // Best-effort unlock
          try {
            await lockService.unlock(uri, { lockHandle: lock.handle });
          } catch {
            // ignore
          }
          throw err;
        }
      } catch (error) {
        console.error(
          '❌ Put source failed:',
          error instanceof Error ? error.message : String(error),
        );
        process.exit(1);
      }
    },
  );

// ── parent command ────────────────────────────────────────────────────────────

export const sourceCommand = new Command('source')
  .description('Read and write ABAP source code')
  .addCommand(getSourceCommand)
  .addCommand(putSourceCommand);
