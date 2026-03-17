/**
 * Unlock Command
 *
 * Force-unlock SAP objects that are stuck in locked state
 * (e.g., from a crashed session or failed deploy).
 *
 * Uses _action=UNLOCK without a lock handle, which SAP allows
 * for locks owned by the current user/session.
 */

import { Command } from 'commander';
import { getAdtClientV2 } from '../utils/adt-client-v2';
import { getObjectUri, getRegisteredTypes } from '@abapify/adk';

type SearchObject = {
  name?: string;
  type?: string;
  uri?: string;
  description?: string;
  packageName?: string;
};

async function resolveObjectUri(
  client: Awaited<ReturnType<typeof getAdtClientV2>>,
  objectName: string,
  typeHint?: string,
  uriOverride?: string,
): Promise<{ uri: string; display: string }> {
  // Direct URI override
  if (uriOverride) {
    return { uri: uriOverride, display: `${objectName} (via --uri)` };
  }

  // Type hint → construct URI from ADK registry
  if (typeHint) {
    const uri = getObjectUri(typeHint, objectName);
    if (uri) {
      return { uri, display: `${objectName} (${typeHint.toUpperCase()})` };
    }
    console.warn(
      `⚠️  Type '${typeHint}' has no registered endpoint. Falling back to search...`,
    );
  }

  // Search-based resolution
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

  const exactMatch = objects.find(
    (obj) => String(obj.name || '').toUpperCase() === objectName.toUpperCase(),
  );

  if (!exactMatch?.uri) {
    const typeList = getRegisteredTypes().join(', ');
    throw new Error(
      `Object '${objectName}' not found via search.\n` +
        `💡 Try specifying the type: adt unlock ${objectName} --type TTYP\n` +
        `   Registered types: ${typeList}\n` +
        `   Or provide a direct URI: adt unlock ${objectName} --uri /sap/bc/adt/...`,
    );
  }

  return {
    uri: exactMatch.uri,
    display: `${exactMatch.name} (${exactMatch.type}) - ${exactMatch.description ?? ''}`,
  };
}

async function performUnlock(
  client: Awaited<ReturnType<typeof getAdtClientV2>>,
  objectUri: string,
  objectName: string,
  lockHandle?: string,
): Promise<void> {
  const query = lockHandle
    ? `?_action=UNLOCK&lockHandle=${lockHandle}`
    : '?_action=UNLOCK';

  try {
    await client.fetch(`${objectUri}${query}`, {
      method: 'POST',
      headers: {
        'X-sap-adt-sessiontype': 'stateful',
      },
    });
    console.log(`✅ ${objectName} unlocked`);
  } catch (unlockError: unknown) {
    const msg =
      unlockError instanceof Error ? unlockError.message : String(unlockError);

    if (msg.includes('not locked') || msg.includes('not enqueued')) {
      console.log(`ℹ️  ${objectName} is not locked`);
    } else {
      throw new Error(`Unlock failed for ${objectName}: ${msg}`);
    }
  }
}

export const unlockCommand = new Command('unlock')
  .description('Unlock SAP objects (force-release stale locks)')
  .argument(
    '<objectNames...>',
    'Object name(s) to unlock (e.g., ZAGE_STRING_TABLE ZAGE_STRUCT_TABLE_TYPE)',
  )
  .option('--lock-handle <handle>', 'Specific lock handle (if known)')
  .option(
    '--type <type>',
    'Object type (CLAS, INTF, TTYP, TABL, DOMA, DTEL, PROG, FUGR, DEVC)',
  )
  .option('--uri <uri>', 'Direct object URI (skips search)')
  .action(
    async (
      objectNames: string[],
      options: { lockHandle?: string; type?: string; uri?: string },
    ) => {
      try {
        const client = await getAdtClientV2();
        let failed = 0;

        for (const objectName of objectNames) {
          console.log(`\n🔓 Unlocking: ${objectName}`);

          try {
            const { uri, display } = await resolveObjectUri(
              client,
              objectName,
              options.type,
              // URI override only makes sense for single object
              objectNames.length === 1 ? options.uri : undefined,
            );
            console.log(`   📍 ${display}`);

            await performUnlock(client, uri, objectName, options.lockHandle);
          } catch (err) {
            console.error(
              `   ❌ ${err instanceof Error ? err.message : String(err)}`,
            );
            failed++;
          }
        }

        if (failed > 0) {
          console.log(`\n⚠️  ${failed}/${objectNames.length} unlock(s) failed`);
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
