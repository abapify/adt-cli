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
