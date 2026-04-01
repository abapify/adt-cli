/**
 * Unlock Command
 *
 * Unlock SAP objects that are stuck in locked state.
 *
 * Lock handle resolution order:
 * 1. Explicit --lock-handle flag
 * 2. Persisted lock store (~/.adt/locks.json)
 * 3. (with --force) Re-lock to recover handle, then unlock
 * 4. Fail with helpful message
 *
 * --force mode: acquires a lock (which returns the existing handle
 * for same-user locks) then immediately unlocks with that handle.
 * Only works for objects locked by the current user.
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

/** Shared lock store instance — used for both handle lookup and lock service */
const lockStore = new FileLockStore();

/**
 * Find a persisted lock handle for the given URI.
 * Also tries partial match (URI is a prefix of a stored entry, or vice versa)
 * to handle sub-resource URIs like /source/main.
 */
function findPersistedHandle(uri: string): string | undefined {
  const entries = lockStore.list();
  // Exact match first
  const exact = entries.find((e) => e.objectUri === uri);
  if (exact) return exact.lockHandle;
  // URI is a sub-resource of a stored object (e.g., stored: /groups/foo, asked: /groups/foo/source/main)
  const parent = entries.find((e) => uri.startsWith(e.objectUri + '/'));
  if (parent) return parent.lockHandle;
  // Stored entry is a sub-resource of the asked URI (unlikely, but cover it)
  const child = entries.find((e) => e.objectUri.startsWith(uri + '/'));
  if (child) return child.lockHandle;
  return undefined;
}

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

  // Type hint → construct URI from ADK registry (normalizeName applied inside getObjectUri)
  if (typeHint) {
    const uri = getObjectUri(typeHint, objectName);
    if (uri) {
      return { uri, display: `${objectName} (${typeHint.toUpperCase()})` };
    }
    console.warn(
      `⚠️  Type '${typeHint}' has no registered endpoint. Falling back to search...`,
    );
  }

  // Collect all normalized name candidates (e.g., strip SAPL prefix for FUGR)
  const candidates = normalizeObjectName(objectName, typeHint);

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

  // Try exact match against all normalized candidates
  const exactMatch = objects.find((obj) => {
    const objName = String(obj.name || '').toUpperCase();
    return candidates.some((c) => c.toUpperCase() === objName);
  });

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

/**
 * Resolve the lock handle: explicit flag → persisted store → undefined.
 */
function resolveLockHandle(
  uri: string,
  explicitHandle?: string,
): string | undefined {
  if (explicitHandle) return explicitHandle;
  const persisted = findPersistedHandle(uri);
  if (persisted) {
    console.log(`   🔑 Found persisted lock handle`);
  }
  return persisted;
}

/**
 * Get or create the lock service.
 * Prefers the global ADK context's service (shares the same store),
 * falls back to creating a fresh one with the shared FileLockStore.
 */
function getLockService(
  client: Awaited<ReturnType<typeof getAdtClientV2>>,
): LockService {
  const globalCtx = tryGetGlobalContext();
  if (globalCtx?.lockService) return globalCtx.lockService;
  return createLockService(client, { store: lockStore });
}

/**
 * Attempt to unlock a single object URI.
 *
 * @returns true if unlocked, false if object was not locked
 * @throws on unexpected errors
 */
async function unlockUri(
  locks: LockService,
  uri: string,
  label: string,
  options: { lockHandle?: string; force?: boolean },
): Promise<boolean> {
  const handle = options.lockHandle;

  // Case 1: We have a handle — use it directly
  if (handle) {
    try {
      await locks.unlock(uri, { lockHandle: handle });
      console.log(`✅ ${label} unlocked`);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('not locked') || msg.includes('not enqueued')) {
        console.log(`ℹ️  ${label} is not locked`);
        return false;
      }
      throw err;
    }
  }

  // Case 2: No handle + --force — lock to recover handle, then unlock
  if (options.force) {
    try {
      console.log(`   🔄 Force-unlock: acquiring lock to recover handle...`);
      await locks.forceUnlock(uri);
      console.log(`✅ ${label} force-unlocked`);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('not locked') || msg.includes('not enqueued')) {
        console.log(`ℹ️  ${label} is not locked`);
        return false;
      }
      throw err;
    }
  }

  // Case 3: No handle, no --force — fail with guidance
  throw new Error(
    `No lock handle available for ${label}.\n` +
      `   💡 Options:\n` +
      `      --force              Re-lock to recover handle, then unlock\n` +
      `      --lock-handle <h>    Provide handle explicitly\n` +
      `      adt locks            Show persisted lock handles`,
  );
}

export const unlockCommand = new Command('unlock')
  .description('Unlock SAP objects (release stale locks)')
  .argument(
    '[objectNames...]',
    'Object name(s) to unlock (e.g., ZAGE_TTYP_STRTAB ZAGE_TTYP_STRUCT)',
  )
  .option('--lock-handle <handle>', 'Specific lock handle (if known)')
  .option(
    '--type <type>',
    'Object type (CLAS, INTF, TTYP, TABL, DOMA, DTEL, PROG, FUGR, DEVC)',
  )
  .option('--uri <uri>', 'Direct object URI (skips search)')
  .option(
    '--force',
    'Re-lock to recover handle, then unlock (same-user locks only)',
  )
  .action(
    async (
      objectNames: string[],
      options: {
        lockHandle?: string;
        type?: string;
        uri?: string;
        force?: boolean;
      },
    ) => {
      try {
        // --uri without object names: unlock the URI directly
        if (options.uri && objectNames.length === 0) {
          const label = options.uri.split('/').pop() || options.uri;
          console.log(`\n🔓 Unlocking: ${label} (via --uri)`);

          const handle = resolveLockHandle(options.uri, options.lockHandle);
          const client = await getAdtClientV2();
          const locks = getLockService(client);

          await unlockUri(locks, options.uri, label, {
            lockHandle: handle,
            force: options.force,
          });
          return;
        }

        if (objectNames.length === 0) {
          console.error(
            '❌ Provide object name(s) or use --uri to unlock by URI directly.',
          );
          process.exit(1);
        }

        const client = await getAdtClientV2();
        const locks = getLockService(client);
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

            const handle = resolveLockHandle(uri, options.lockHandle);

            await unlockUri(locks, uri, objectName, {
              lockHandle: handle,
              force: options.force,
            });
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
