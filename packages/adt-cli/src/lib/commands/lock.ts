/**
 * Lock Command
 *
 * Acquire a lock on a SAP ADT object and persist the handle
 * to ~/.adt/locks.json so that a later `adt unlock` can release it.
 *
 * Usage:
 *   adt lock ZAGE_FUGR_SAMPLE --type FUGR
 *   adt lock --uri /sap/bc/adt/functions/groups/zage_fugr_sample
 */

import { Command } from 'commander';
import { getAdtClientV2 } from '../utils/adt-client-v2';
import {
  getObjectUri,
  getRegisteredTypes,
  normalizeObjectName,
  tryGetGlobalContext,
} from '@abapify/adk';
import {
  createLockService,
  FileLockStore,
  type LockService,
} from '@abapify/adt-locks';

type SearchObject = {
  name?: string;
  type?: string;
  uri?: string;
  description?: string;
  packageName?: string;
};

/** Shared lock store instance */
const lockStore = new FileLockStore();

async function resolveObjectUri(
  client: Awaited<ReturnType<typeof getAdtClientV2>>,
  objectName: string,
  typeHint?: string,
  uriOverride?: string,
): Promise<{ uri: string; display: string }> {
  if (uriOverride) {
    return { uri: uriOverride, display: `${objectName} (via --uri)` };
  }

  if (typeHint) {
    const uri = getObjectUri(typeHint, objectName);
    if (uri) {
      return { uri, display: `${objectName} (${typeHint.toUpperCase()})` };
    }
    console.warn(
      `⚠️  Type '${typeHint}' has no registered endpoint. Falling back to search...`,
    );
  }

  const candidates = normalizeObjectName(objectName, typeHint);

  const searchResult =
    await client.adt.repository.informationsystem.search.quickSearch({
      query: objectName,
      maxResults: 10,
    });

  const rawObjects =
    'objectReference' in searchResult ? searchResult.objectReference : [];
  const objects: SearchObject[] = Array.isArray(rawObjects)
    ? rawObjects
    : rawObjects
      ? [rawObjects]
      : [];

  const exactMatch = objects.find((obj) => {
    const objName = String(obj.name || '').toUpperCase();
    return candidates.some((c) => c.toUpperCase() === objName);
  });

  if (!exactMatch?.uri) {
    const typeList = getRegisteredTypes().join(', ');
    throw new Error(
      `Object '${objectName}' not found via search.\n` +
        `💡 Try specifying the type: adt lock ${objectName} --type TTYP\n` +
        `   Registered types: ${typeList}\n` +
        `   Or provide a direct URI: adt lock ${objectName} --uri /sap/bc/adt/...`,
    );
  }

  return {
    uri: exactMatch.uri,
    display: `${exactMatch.name} (${exactMatch.type}) - ${exactMatch.description ?? ''}`,
  };
}

function getLockService(
  client: Awaited<ReturnType<typeof getAdtClientV2>>,
): LockService {
  const globalCtx = tryGetGlobalContext();
  if (globalCtx?.lockService) return globalCtx.lockService;
  return createLockService(client, { store: lockStore });
}

export const lockCommand = new Command('lock')
  .description('Lock a SAP object (persists handle for later unlock)')
  .argument(
    '[objectNames...]',
    'Object name(s) to lock (e.g., ZAGE_FUGR_SAMPLE ZCL_MY_CLASS)',
  )
  .option(
    '--type <type>',
    'Object type (CLAS, INTF, TTYP, TABL, DOMA, DTEL, PROG, FUGR, DEVC)',
  )
  .option('--uri <uri>', 'Direct object URI (skips search)')
  .option('--transport <transport>', 'Transport request number')
  .action(
    async (
      objectNames: string[],
      options: { type?: string; uri?: string; transport?: string },
    ) => {
      try {
        // --uri without object names: lock the URI directly
        if (options.uri && objectNames.length === 0) {
          const label = options.uri.split('/').pop() || options.uri;
          console.log(`\n🔒 Locking: ${label} (via --uri)`);

          const client = await getAdtClientV2();
          const locks = getLockService(client);

          const handle = await locks.lock(options.uri, {
            objectName: label,
            transport: options.transport,
          });

          console.log(`✅ Locked`);
          console.log(`   🔑 Handle: ${handle.handle}`);
          if (handle.correlationNumber) {
            console.log(`   📦 Transport: ${handle.correlationNumber}`);
          }
          return;
        }

        if (objectNames.length === 0) {
          console.error(
            '❌ Provide object name(s) or use --uri to lock by URI directly.',
          );
          process.exit(1);
        }

        const client = await getAdtClientV2();
        const locks = getLockService(client);
        let failed = 0;

        for (const objectName of objectNames) {
          console.log(`\n🔒 Locking: ${objectName}`);

          try {
            const { uri, display } = await resolveObjectUri(
              client,
              objectName,
              options.type,
              objectNames.length === 1 ? options.uri : undefined,
            );
            console.log(`   📍 ${display}`);

            const handle = await locks.lock(uri, {
              objectName,
              objectType: options.type,
              transport: options.transport,
            });

            console.log(`✅ ${objectName} locked`);
            console.log(`   🔑 Handle: ${handle.handle}`);
            if (handle.correlationNumber) {
              console.log(`   📦 Transport: ${handle.correlationNumber}`);
            }
          } catch (err) {
            console.error(
              `   ❌ ${err instanceof Error ? err.message : String(err)}`,
            );
            failed++;
          }
        }

        if (failed > 0) {
          console.log(`\n⚠️  ${failed}/${objectNames.length} lock(s) failed`);
          process.exit(1);
        }
      } catch (error) {
        console.error(
          '❌ Failed:',
          error instanceof Error ? error.message : String(error),
        );
        process.exit(1);
      }
    },
  );
