import { basename } from 'path';
import {
  getEndpointForType,
  getObjectUri as adkGetObjectUri,
} from '@abapify/adk';

export interface ObjectTypeMapping {
  endpoint: string;
  description: string;
  sections?: Record<string, string>;
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

/**
 * Section mappings for object types that have sub-sources.
 * Endpoints come from the ADK registry; this only holds section info.
 */
const SECTION_MAPPINGS: Record<string, Record<string, string>> = {
  clas: {
    '': 'source/main',
    definitions: 'source/definitions',
    implementations: 'source/implementations',
    macros: 'source/macros',
    testclasses: 'source/testclasses',
  },
};

/**
 * Human-readable descriptions for object types.
 * Kept here since ADK registry doesn't carry descriptions.
 */
const TYPE_DESCRIPTIONS: Record<string, string> = {
  clas: 'Class',
  intf: 'Interface',
  prog: 'Program',
  incl: 'Include',
  fugr: 'Function Group',
  dtel: 'Data Element',
  doma: 'Domain',
  tabl: 'Table',
  ttyp: 'Table Type',
  xslt: 'XSLT Transformation',
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
 * Uses the parsed filename structure and ADK registry for endpoint resolution
 */
export function detectObjectTypeFromFilename(
  filename: string,
): ObjectTypeInfo | null {
  const parsed = parseAbapFilename(filename);
  if (!parsed) {
    return null;
  }

  const adtType = parsed.type.toUpperCase();
  const endpoint = getEndpointForType(adtType);
  if (!endpoint) {
    return null;
  }

  return {
    type: adtType,
    name: parsed.name.toUpperCase(),
    endpoint,
    description: TYPE_DESCRIPTIONS[parsed.type] ?? adtType,
    section: parsed.section,
  };
}

/**
 * Convert object type information to SAP ADT object URI
 * Returns the base URI for object operations (without source path)
 */
export function objectInfoToUri(objectInfo: ObjectTypeInfo): string {
  const base =
    adkGetObjectUri(objectInfo.type, objectInfo.name) ??
    `/sap/bc/adt/${objectInfo.endpoint}/${objectInfo.name.toLowerCase()}`;
  // Contract: deployment callers expect a trailing slash so that
  // `${objectUri}${sourcePath}` composes into a valid source URL.
  return base.endsWith('/') ? base : `${base}/`;
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
  version: 'active' | 'inactive' = 'inactive',
): string {
  const sections = SECTION_MAPPINGS[objectInfo.type.toLowerCase()];

  // Check if object type has section mappings and if section is provided
  if (sections && objectInfo.section) {
    const sectionPath = sections[objectInfo.section];
    if (sectionPath) {
      return `${sectionPath}?version=${version}`;
    }
  }

  // Default to main source path
  return `source/main?version=${version}`;
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
    sourcePath: getSourcePath(objectInfo, version ?? 'inactive'),
  };
}
