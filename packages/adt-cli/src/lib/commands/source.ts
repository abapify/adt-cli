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

type AdtClient = Awaited<ReturnType<typeof getAdtClientV2>>;

interface SourceOp {
  get: (name: string) => Promise<string>;
  put: (
    name: string,
    opts: { lockHandle: string; corrNr?: string },
    body: string,
  ) => Promise<unknown>;
}

/**
 * Pick the typed source.main contract for well-known object URIs.
 * Returns `undefined` for object types that don't (yet) have a contract,
 * in which case callers should fall back to generic client.fetch().
 */
function pickSourceContract(
  client: AdtClient,
  uri: string,
): { op: SourceOp; objectName: string } | undefined {
  // Patterns: /sap/bc/adt/<area>/<name>
  const match = uri.match(
    /^\/sap\/bc\/adt\/(oo\/classes|oo\/interfaces|programs\/programs|ddic\/ddl\/sources|ddic\/dcl\/sources)\/([^/?#]+)/i,
  );
  if (!match) return undefined;
  const [, area, encodedName] = match;
  const objectName = decodeURIComponent(encodedName);

  switch (area.toLowerCase()) {
    case 'oo/classes':
      return { op: client.adt.oo.classes.source.main, objectName };
    case 'oo/interfaces':
      return { op: client.adt.oo.interfaces.source.main, objectName };
    case 'programs/programs':
      return { op: client.adt.programs.programs.source.main, objectName };
    case 'ddic/ddl/sources':
      return { op: client.adt.ddic.ddl.sources.source.main, objectName };
    case 'ddic/dcl/sources':
      return { op: client.adt.ddic.dcl.sources.source.main, objectName };
    default:
      return undefined;
  }
}

/**
 * Resolve an object to its ADT URI.
 * Uses type-based registry lookup first, then falls back to quickSearch.
 */
async function resolveUri(
  client: AdtClient,
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
  .option('--json', 'Output result as JSON')
  .action(
    async (objectName: string, options: { type?: string; json?: boolean }) => {
      try {
        const client = await getAdtClientV2();
        const uri = await resolveUri(client, objectName, options.type);

        // Prefer typed source contract for well-known object types (CLAS/INTF/PROG/DDLS/DCLS)
        const contract = pickSourceContract(client, uri);
        let source: string;
        if (contract) {
          source = await contract.op.get(contract.objectName);
        } else {
          // TODO: generic fallback — remove once all object types have
          // typed source contracts (e.g. FUGR/FUNC, DOMA source, etc.).
          source = String(
            await client.fetch(`${uri}/source/main`, {
              method: 'GET',
              headers: { Accept: 'text/plain' },
            }),
          );
        }

        if (options.json) {
          console.log(JSON.stringify({ objectName, uri, source }, null, 2));
        } else {
          process.stdout.write(source);
        }
      } catch (error) {
        console.error(
          '❌ Get source failed:',
          error instanceof Error ? error.message : String(error),
        );
        process.exit(1);
      }
    },
  );

const putSourceCommand = new Command('put')
  .description('Write ABAP source code from a file to an existing object')
  .argument('<objectName>', 'ABAP object name')
  .argument('<file>', 'Path to the source file to upload')
  .option('--type <type>', 'Object type hint (e.g. CLAS, PROG, INTF)')
  .option(
    '--transport <transport>',
    'Transport request number for transportable objects',
  )
  .option('--json', 'Output result as JSON')
  .action(
    async (
      objectName: string,
      file: string,
      options: { type?: string; transport?: string; json?: boolean },
    ) => {
      try {
        const client = await getAdtClientV2();
        const uri = await resolveUri(client, objectName, options.type);
        const sourceCode = await readFile(file, 'utf8');

        const lockService = createLockService(client);
        let lockHandle: string | undefined;

        if (!options.json) console.log(`🔄 Locking ${objectName}...`);
        const lock = await lockService.lock(uri, {
          transport: options.transport,
          objectName,
        });
        lockHandle = lock.handle;

        try {
          if (!options.json) console.log(`🔄 Writing source to ${uri}...`);

          const contract = pickSourceContract(client, uri);
          if (contract) {
            await contract.op.put(
              contract.objectName,
              {
                lockHandle,
                ...(options.transport ? { corrNr: options.transport } : {}),
              },
              sourceCode,
            );
          } else {
            // TODO: generic fallback — remove once all object types have
            // typed source contracts.
            const params = new URLSearchParams({ lockHandle });
            if (options.transport) params.set('corrNr', options.transport);
            await client.fetch(`${uri}/source/main?${params.toString()}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'text/plain' },
              body: sourceCode,
            });
          }

          await lockService.unlock(uri, { lockHandle });
          lockHandle = undefined;

          if (options.json) {
            console.log(
              JSON.stringify({ objectName, uri, status: 'written' }, null, 2),
            );
          } else {
            console.log(
              `✅ Source written and lock released for ${objectName}`,
            );
          }
        } catch (err) {
          // Best-effort unlock (only if not already unlocked)
          if (lockHandle) {
            try {
              await lockService.unlock(uri, { lockHandle });
            } catch {
              // ignore
            }
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
