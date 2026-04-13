/**
 * Shared utilities for MCP tool implementations.
 */

/** Supported object types for source code operations */
export type SourceObjectType = 'CLAS' | 'INTF' | 'PROG' | 'FUGR';

/**
 * Build the ADT source URL for an object's main source code.
 *
 * URL patterns:
 *  CLAS → /sap/bc/adt/oo/classes/{name}/source/main
 *  INTF → /sap/bc/adt/oo/interfaces/{name}/source/main
 *  PROG → /sap/bc/adt/programs/programs/{name}/source/main
 *  FUGR → /sap/bc/adt/functions/groups/{name}/source/main
 */
export function resolveObjectSourceUrl(
  name: string,
  type: SourceObjectType,
): string {
  const n = name.toLowerCase();
  switch (type) {
    case 'CLAS':
      return `/sap/bc/adt/oo/classes/${n}/source/main`;
    case 'INTF':
      return `/sap/bc/adt/oo/interfaces/${n}/source/main`;
    case 'PROG':
      return `/sap/bc/adt/programs/programs/${n}/source/main`;
    case 'FUGR':
      return `/sap/bc/adt/functions/groups/${n}/source/main`;
  }
}

/**
 * Build the ADT object URI (without /source/main) for lock/activate operations.
 */
export function resolveObjectUri(name: string, type: SourceObjectType): string {
  const n = name.toLowerCase();
  switch (type) {
    case 'CLAS':
      return `/sap/bc/adt/oo/classes/${n}`;
    case 'INTF':
      return `/sap/bc/adt/oo/interfaces/${n}`;
    case 'PROG':
      return `/sap/bc/adt/programs/programs/${n}`;
    case 'FUGR':
      return `/sap/bc/adt/functions/groups/${n}`;
  }
}

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
