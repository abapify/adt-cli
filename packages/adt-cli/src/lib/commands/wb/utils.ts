/**
 * Shared helpers for `adt wb …` commands.
 *
 * These mirror the logic in the corresponding MCP tools
 * (`find-definition`, `find-references`, `call-hierarchy`,
 * `get-object-structure`) so that the CLI and MCP surfaces share the
 * same ADT endpoints and return shapes. Keep the two in sync.
 */

import type { AdtClient } from '@abapify/adt-client';

export interface SearchObject {
  name?: string;
  type?: string;
  uri?: string;
  description?: string;
  packageName?: string;
}

/**
 * Extract object references from ADT quickSearch response variants.
 * Kept intentionally compatible with `packages/adt-mcp/.../utils.ts#extractObjectReferences`.
 */
export function extractObjectReferences(results: unknown): SearchObject[] {
  const resultsAny = results as Record<string, unknown>;
  let rawObjects: SearchObject | SearchObject[] | undefined;

  if ('objectReferences' in resultsAny && resultsAny.objectReferences) {
    const refs = resultsAny.objectReferences as {
      objectReference?: SearchObject | SearchObject[];
    };
    rawObjects = refs.objectReference;
  } else if ('objectReference' in resultsAny) {
    rawObjects = resultsAny.objectReference as SearchObject | SearchObject[];
  } else if ('mainObject' in resultsAny && resultsAny.mainObject) {
    const main = resultsAny.mainObject as {
      objectReference?: SearchObject | SearchObject[];
    };
    rawObjects = main.objectReference;
  }

  if (!rawObjects) return [];
  return Array.isArray(rawObjects) ? rawObjects : [rawObjects];
}

/**
 * Map a (coarse) ABAP object type code to its ADT REST URI prefix.
 *
 * Kept in lockstep with `packages/adt-mcp/.../utils.ts#resolveObjectUriFromType`.
 */
export function resolveObjectUriFromType(
  objectType: string,
  objectName: string,
): string | undefined {
  const type = objectType.toUpperCase().split('/')[0];
  const n = encodeURIComponent(objectName.toLowerCase());
  switch (type) {
    case 'PROG':
      return `/sap/bc/adt/programs/programs/${n}`;
    case 'INCL':
      return `/sap/bc/adt/programs/includes/${n}`;
    case 'CLAS':
      return `/sap/bc/adt/oo/classes/${n}`;
    case 'INTF':
      return `/sap/bc/adt/oo/interfaces/${n}`;
    case 'FUGR':
      return `/sap/bc/adt/functions/groups/${n}`;
    case 'DOMA':
      return `/sap/bc/adt/ddic/domains/${n}`;
    case 'DTEL':
      return `/sap/bc/adt/ddic/dataelements/${n}`;
    case 'TABL':
      return `/sap/bc/adt/ddic/tables/${n}`;
    case 'TTYP':
      return `/sap/bc/adt/ddic/tabletypes/${n}`;
    case 'DEVC':
      return `/sap/bc/adt/packages/${encodeURIComponent(objectName)}`;
    case 'BDEF':
      return `/sap/bc/adt/bo/behaviordefinitions/${n}`;
    case 'SRVD':
      return `/sap/bc/adt/ddic/srvd/sources/${n}`;
    case 'SRVB':
      return `/sap/bc/adt/businessservices/bindings/${n}`;
    default:
      return undefined;
  }
}

/**
 * Resolve the ADT URI for an ABAP object by name and optional type.
 * Tries type-based resolution first (no network), falls back to quickSearch.
 */
export async function resolveObjectUri(
  client: AdtClient,
  objectName: string,
  objectType?: string,
): Promise<string | undefined> {
  if (objectType) {
    const uri = resolveObjectUriFromType(objectType, objectName);
    if (uri) return uri;
  }

  const searchResult =
    await client.adt.repository.informationsystem.search.quickSearch({
      query: objectName,
      maxResults: 10,
      ...(objectType ? { objectType } : {}),
    });

  const objects = extractObjectReferences(searchResult);
  const match = objects.find(
    (o) => String(o.name ?? '').toUpperCase() === objectName.toUpperCase(),
  );
  return match?.uri;
}
