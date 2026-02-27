import { basename } from 'path';

export interface ObjectTypeMapping {
  endpoint: string;
  description: string;
  sections?: Record<string, string>; // Optional section mappings
}

export interface ParsedAbapFile {
  name: string;
  type: string;
  section?: string;
}

export interface ObjectTypeInfo {
  type: string;
  name: string;
  endpoint: string;
  description: string;
  section?: string;
}

// Map ABAP object types to SAP ADT endpoints
// Based on ABAP file format naming convention: <name>.<type>.[<section>].abap
const ABAP_OBJECT_MAPPINGS: Record<string, ObjectTypeMapping> = {
  // Object-Oriented Programming
  clas: {
    endpoint: 'oo/classes',
    description: 'Class',
    sections: {
      // Main class file (no section)
      '': 'source/main',
      // Class sections
      definitions: 'source/definitions',
      implementations: 'source/implementations',
      macros: 'source/macros',
      testclasses: 'source/testclasses',
    },
  },
  intf: {
    endpoint: 'oo/interfaces',
    description: 'Interface',
    // Interfaces typically don't have sections
  },

  // Programs and Includes
  prog: {
    endpoint: 'programs/programs',
    description: 'Program',
  },
  incl: {
    endpoint: 'programs/includes',
    description: 'Include',
  },

  // Function Groups
  fugr: {
    endpoint: 'functions/groups',
    description: 'Function Group',
  },

  // Data Dictionary
  dtel: {
    endpoint: 'ddic/dataelements',
    description: 'Data Element',
  },
  doma: {
    endpoint: 'ddic/domains',
    description: 'Domain',
  },
  tabl: {
    endpoint: 'ddic/tables',
    description: 'Table',
  },
  ttyp: {
    endpoint: 'ddic/tabletypes',
    description: 'Table Type',
  },

  // Transformations and Web Services
  xslt: {
    endpoint: 'transformations',
    description: 'XSLT Transformation',
  },

  // Additional object types can be easily added here
};

/**
 * Parse ABAP filename according to the naming convention: <name>.<type>.[<section>].abap
 * Examples:
 * - zcl_example.clas.abap → { name: 'zcl_example', type: 'clas' }
 * - zcl_example.clas.definitions.abap → { name: 'zcl_example', type: 'clas', section: 'definitions' }
 * - zif_petstore.intf.abap → { name: 'zif_petstore', type: 'intf' }
 */
export function parseAbapFilename(filename: string): ParsedAbapFile | null {
  const baseName = basename(filename).toLowerCase();

  // Regex pattern: <name>.<type>.[<section>].abap
  // Named groups: name, type, section (optional), extension
  const abapPattern =
    /^(?<name>[^.]+)\.(?<type>[^.]+)(?:\.(?<section>.+?))?\.(?<extension>abap)$/;

  const match = baseName.match(abapPattern);
  if (!match?.groups) {
    return null;
  }

  const { name, type, section } = match.groups;

  return {
    name,
    type,
    section: section || undefined,
  };
}

/**
 * Generic function to detect ABAP object type information from filename
 * Uses the parsed filename structure and object mappings
 */
export function detectObjectTypeFromFilename(
  filename: string,
): ObjectTypeInfo | null {
  const parsed = parseAbapFilename(filename);
  if (!parsed) {
    return null;
  }

  const mapping = ABAP_OBJECT_MAPPINGS[parsed.type];
  if (!mapping) {
    return null;
  }

  return {
    type: parsed.type.toUpperCase(),
    name: parsed.name.toUpperCase(),
    endpoint: mapping.endpoint,
    description: mapping.description,
    section: parsed.section,
  };
}

/**
 * Convert object type information to SAP ADT object URI
 * Returns the base URI for object operations (without source path)
 */
export function objectInfoToUri(objectInfo: ObjectTypeInfo): string {
  return `/sap/bc/adt/${objectInfo.endpoint}/${objectInfo.name.toLowerCase()}`;
}

/**
 * Convert filename directly to SAP ADT object URI
 * Combines detection and URI generation in one step
 */
export function filenameToObjectUri(filename: string): string | null {
  const objectInfo = detectObjectTypeFromFilename(filename);
  return objectInfo ? objectInfoToUri(objectInfo) : null;
}

/**
 * Get source path for ABAP object deployment based on type and section
 * Handles different object sections like class definitions, implementations, etc.
 */
export function getSourcePath(
  objectInfo: ObjectTypeInfo,
  version?: 'active' | 'inactive',
): string {
  const mapping = ABAP_OBJECT_MAPPINGS[objectInfo.type.toLowerCase()];

  // Check if object type has section mappings and if section is provided
  if (mapping?.sections && objectInfo.section) {
    const sectionPath = mapping.sections[objectInfo.section];
    if (sectionPath) {
      return version ? `${sectionPath}?version=${version}` : sectionPath;
    }
  }

  // Default to main source path
  return version ? `source/main?version=${version}` : 'source/main';
}

/**
 * Complete utility to get full source URI from filename
 * Returns: objectUri + sourcePath for direct use with setSource
 */
export function filenameToSourceUri(
  filename: string,
  version?: 'active' | 'inactive',
): {
  objectUri: string;
  sourcePath: string;
} | null {
  const objectInfo = detectObjectTypeFromFilename(filename);
  if (!objectInfo) {
    return null;
  }

  return {
    objectUri: objectInfoToUri(objectInfo),
    sourcePath: getSourcePath(objectInfo, version),
  };
}
