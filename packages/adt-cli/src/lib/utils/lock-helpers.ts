/**
 * Shared helpers for lock / unlock commands.
 *
 * Both commands need the same object-URI resolution, lock-service
 * instantiation, and error-formatting logic.  Keeping it here
 * eliminates the code duplication SonarQube flags between the two.
 */

import { getAdtClientV2 } from './adt-client-v2';
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

export type SearchObject = {
  name?: string;
  type?: string;
  uri?: string;
  description?: string;
  packageName?: string;
};

/**
 * Normalize a quickSearch result into a flat SearchObject[].
 *
 * The ADT quickSearch endpoint may return results under
 * `objectReference`, `objectReferences.objectReference`, or
 * `mainObject.objectReference` — this helper handles all variants.
 */
export function normalizeSearchResults(
  searchResult: Record<string, unknown>,
): SearchObject[] {
  let raw: SearchObject | SearchObject[] | undefined;

  if ('objectReference' in searchResult) {
    raw = searchResult.objectReference as SearchObject | SearchObject[];
  } else if (
    'objectReferences' in searchResult &&
    searchResult.objectReferences
  ) {
    const refs = searchResult.objectReferences as {
      objectReference?: SearchObject | SearchObject[];
    };
    raw = refs.objectReference;
  } else if ('mainObject' in searchResult && searchResult.mainObject) {
    const main = searchResult.mainObject as {
      objectReference?: SearchObject | SearchObject[];
    };
    raw = main.objectReference;
  }

  return raw ? (Array.isArray(raw) ? raw : [raw]) : [];
}

/** Shared lock store instance */
export const lockStore = new FileLockStore();

/**
 * Resolve an ADT object name/type/uri into a canonical URI + display label.
 *
 * Resolution order:
 * 1. Explicit URI override
 * 2. Type hint → construct from ADK registry
 * 3. Quick-search fallback
 */
export async function resolveObjectUri(
  client: Awaited<ReturnType<typeof getAdtClientV2>>,
  objectName: string,
  commandVerb: string,
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

  const objects = normalizeSearchResults(
    searchResult as Record<string, unknown>,
  );

  const exactMatch = objects.find((obj) => {
    const objName = String(obj.name || '').toUpperCase();
    return candidates.some((c) => c.toUpperCase() === objName);
  });

  if (!exactMatch?.uri) {
    const typeList = getRegisteredTypes().join(', ');
    throw new Error(
      `Object '${objectName}' not found via search.\n` +
        `💡 Try specifying the type: adt ${commandVerb} ${objectName} --type TTYP\n` +
        `   Registered types: ${typeList}\n` +
        `   Or provide a direct URI: adt ${commandVerb} ${objectName} --uri /sap/bc/adt/...`,
    );
  }

  return {
    uri: exactMatch.uri,
    display: `${exactMatch.name} (${exactMatch.type}) - ${exactMatch.description ?? ''}`,
  };
}

/**
 * Get or create the lock service.
 * Prefers the global ADK context's service (shares the same store),
 * falls back to creating a fresh one with the shared FileLockStore.
 */
export function getLockService(
  client: Awaited<ReturnType<typeof getAdtClientV2>>,
): LockService {
  const globalCtx = tryGetGlobalContext();
  if (globalCtx?.lockService) return globalCtx.lockService;
  return createLockService(client, { store: lockStore });
}
