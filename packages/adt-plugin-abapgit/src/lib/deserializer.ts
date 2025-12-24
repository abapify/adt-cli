/**
 * abapGit Deserializer - Export (File → ADK)
 *
 * Reads abapGit format files and yields AdkObject instances.
 * Uses a true generator pattern for memory efficiency.
 *
 * Delegates type-specific deserialization to handlers via fromAbapGit().
 */

import type { FileTree } from '@abapify/adt-plugin';
import type { AdkObject } from '@abapify/adk';
import { createAdk, type AdtClient } from '@abapify/adk';
import { getHandler, getSupportedTypes } from './handlers';

/**
 * abapGit file naming convention:
 * - XML metadata: {name}.{type}.xml (e.g., zcl_myclass.clas.xml)
 * - Source code: {name}.{type}.abap (e.g., zcl_myclass.clas.abap)
 * - Source includes: {name}.{type}.{suffix}.abap (e.g., zcl_myclass.clas.testclasses.abap)
 */

/**
 * Parse abapGit filename to extract object info
 */
function parseAbapGitFilename(filename: string): {
  name: string;
  type: string;
  suffix?: string;
  extension: string;
} | null {
  // Match patterns like: name.type.xml or name.type.suffix.abap
  const match = filename.match(/^([^.]+)\.([^.]+)(?:\.([^.]+))?\.(\w+)$/);
  if (!match) return null;

  const [, name, type, suffixOrExt, extension] = match;

  // If 4 parts, middle is suffix; if 3 parts, no suffix
  if (extension === 'xml' || extension === 'abap') {
    return {
      name: name.toUpperCase(),
      type: type.toUpperCase(),
      suffix:
        suffixOrExt && suffixOrExt !== extension ? suffixOrExt : undefined,
      extension,
    };
  }

  return null;
}

/**
 * Group related files by object (name + type)
 */
interface ObjectFiles {
  name: string;
  type: string;
  xmlFile?: string;
  sourceFiles: Array<{ path: string; suffix?: string }>;
}

/**
 * Deserialize abapGit files to ADK objects
 *
 * True generator - yields objects one at a time as they're discovered.
 *
 * @param fileTree - Virtual file system to read from
 * @param client - ADT client for creating ADK objects
 */
export async function* deserialize(
  fileTree: FileTree,
  client: AdtClient,
): AsyncGenerator<AdkObject> {
  // Get ADK factory for creating objects
  const adk = createAdk(client);

  // Find all XML files (these define the objects)
  const xmlFiles = await fileTree.glob('**/*.xml');

  // Filter to supported types and group by object
  const objectMap = new Map<string, ObjectFiles>();
  const supportedTypes = new Set(
    getSupportedTypes().map((t) => t.toLowerCase()),
  );

  for (const xmlPath of xmlFiles) {
    // Skip .abapgit.xml metadata file
    if (xmlPath.endsWith('.abapgit.xml')) continue;

    // Skip package.devc.xml - packages are not deployed, they must exist in target
    if (xmlPath.endsWith('package.devc.xml')) continue;

    const filename = xmlPath.split('/').pop()!;
    const parsed = parseAbapGitFilename(filename);

    if (!parsed) continue;
    if (!supportedTypes.has(parsed.type.toLowerCase())) continue;

    const key = `${parsed.name}:${parsed.type}`;

    if (!objectMap.has(key)) {
      objectMap.set(key, {
        name: parsed.name,
        type: parsed.type,
        sourceFiles: [],
      });
    }

    const obj = objectMap.get(key)!;
    obj.xmlFile = xmlPath;
  }

  // Find source files for each object
  const abapFiles = await fileTree.glob('**/*.abap');

  for (const abapPath of abapFiles) {
    const filename = abapPath.split('/').pop()!;
    const parsed = parseAbapGitFilename(filename);

    if (!parsed) continue;

    const key = `${parsed.name}:${parsed.type}`;
    const obj = objectMap.get(key);

    if (obj) {
      obj.sourceFiles.push({ path: abapPath, suffix: parsed.suffix });
    }
  }

  // Process each object and yield
  for (const [, objFiles] of objectMap) {
    if (!objFiles.xmlFile) continue;

    const handler = getHandler(objFiles.type);
    if (!handler) continue;

    try {
      // Read and parse XML using handler's schema
      const xmlContent = await fileTree.read(objFiles.xmlFile);
      const parsed = handler.schema.parse(xmlContent);
      // Schema parses to { abapGit: { abap: { values: ... } } }
      const values = (parsed as any)?.abapGit?.abap?.values;

      // Read source files, mapping suffixes using handler's suffixToSourceKey
      const sources: Record<string, string> = {};
      for (const { path, suffix } of objFiles.sourceFiles) {
        const content = await fileTree.read(path);
        // Map suffix to source key using handler's mapping, or use suffix as-is
        const sourceKey = suffix
          ? (handler.suffixToSourceKey?.[suffix] ?? suffix)
          : 'main';
        sources[sourceKey] = content;
      }

      // Get payload from handler (pure data mapping) or build default
      const payload: {
        name: string;
        description?: string;
        [key: string]: unknown;
      } = handler.fromAbapGit
        ? handler.fromAbapGit(values)
        : { name: objFiles.name };

      // Use filename as fallback if name not in XML (e.g., DEVC)
      const objectName = payload.name || objFiles.name;

      // Build full data object with name
      const fullData = { ...payload, name: objectName };

      // Create ADK object with data (pre-loaded, no need to call load())
      const adkObject = adk.getWithData(fullData, objFiles.type) as AdkObject;

      // Set sources on object using handler's setSources method
      if (Object.keys(sources).length > 0) {
        if (handler.setSources) {
          handler.setSources(adkObject, sources);
        } else {
          // Fallback: store sources directly if handler doesn't provide setSources
          if (sources['main']) {
            (adkObject as any)._pendingSource = sources['main'];
          }
          if (Object.keys(sources).length > 1) {
            (adkObject as any)._pendingSources = sources;
          }
        }
      }

      // Store additional payload properties
      if (payload.description) {
        (adkObject as any)._pendingDescription = payload.description;
      }

      yield adkObject;
    } catch (error) {
      // Log error but continue with other objects
      console.error(
        `Failed to deserialize ${objFiles.type} ${objFiles.name}:`,
        error,
      );
    }
  }
}
