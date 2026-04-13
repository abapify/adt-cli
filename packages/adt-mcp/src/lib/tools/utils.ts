/**
 * Shared utilities for MCP tool implementations.
 */

export interface SearchObject {
  name?: string;
  type?: string;
  uri?: string;
  description?: string;
  packageName?: string;
}

/**
 * Minimal structural type for the ADT client subset used by resolveObjectUri.
 *
 * Using a structural (duck-typed) interface rather than importing the full
 * AdtClient type avoids coupling utils.ts to @abapify/adt-client and keeps
 * this utility testable with any object that satisfies the shape.
 */
type QuickSearchClient = {
  adt: {
    repository: {
      informationsystem: {
        search: {
          quickSearch(params: {
            query: string;
            maxResults: number;
          }): Promise<unknown>;
        };
      };
    };
  };
};

/**
 * Extract object references from various ADT search response shapes.
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
 * Resolve ADT object URI from object type and name.
 *
 * Maps common ABAP object types to their ADT REST endpoint paths.
 * Returns undefined for unknown types (caller should fall back to search).
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
      // Package names are case-sensitive in SAP ADT (preserved, not lowercased)
      return `/sap/bc/adt/packages/${encodeURIComponent(objectName)}`;
    default:
      return undefined;
  }
}

/**
 * Resolve the ADT URI for an ABAP object by name and optional type.
 *
 * Tries type-based resolution first (no network round-trip), then falls back
 * to a quickSearch if the type is unknown or not mapped. Returns undefined
 * when the object cannot be found.
 */
export async function resolveObjectUri(
  client: QuickSearchClient,
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
