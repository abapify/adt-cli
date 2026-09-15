/**
 * abapGit Deserializer - Export (File → ADK)
 *
 * Reads abapGit format files and yields AdkObject instances.
 * Uses a true generator pattern for memory efficiency.
 *
 * Delegates type-specific deserialization to handlers via fromAbapGit().
 */

import type { FileTree, ExportOptions } from '@abapify/adt-plugin';
import type { AdkObject } from '@abapify/adk';
import { createAdk, type AdtClient } from '@abapify/adk';
import { getHandler, getSupportedTypes } from './handlers';
import {
  parseAbapGitMetadata,
  resolvePackageFromDir,
  stripSlashes,
} from './folder-logic';
import { abapLangVerToAdt } from './handlers/lang';
import { extractFunctionDescriptors } from './handlers/objects/fugr';

/**
 * abapGit file naming convention:
 * - XML metadata: {name}.{type}.xml (e.g., zcl_myclass.clas.xml)
 * - AFF JSON metadata: {name}.{type}.json (e.g., zfoo.bdef.json)
 * - Source code: {name}.{type}.abap (e.g., zcl_myclass.clas.abap)
 * - Source includes: {name}.{type}.{suffix}.abap (e.g., zcl_myclass.clas.testclasses.abap)
 * - AFF source files: {name}.{type}.abdl, {name}.{type}.acds, {name}.{type}.asrvd
 */

import { parseAbapGitFilename } from './filename-parser';

// Re-export for backward compatibility — format-plugin and other modules
// import parseAbapGitFilename from deserializer.
export { parseAbapGitFilename };

/**
 * Group related files by object (name + type)
 */
interface ObjectFiles {
  name: string;
  type: string;
  /** Legacy XML metadata file path (if present) */
  xmlFile?: string;
  /** AFF JSON metadata file path (if present) */
  jsonFile?: string;
  sourceFiles: Array<{ path: string; suffix?: string }>;
}

/**
 * Resolve folder logic and start dir from .abapgit.xml
 */
async function resolveFolderConfig(fileTree: FileTree): Promise<{
  folderLogic: import('./folder-logic').FolderLogic;
  startDir: string;
  hasAbapGitXml: boolean;
}> {
  let folderLogic: import('./folder-logic').FolderLogic = 'prefix';
  let startDir = '';
  const hasAbapGitXml = await fileTree.exists('.abapgit.xml');
  if (hasAbapGitXml) {
    try {
      const xml = await fileTree.read('.abapgit.xml');
      const meta = parseAbapGitMetadata(xml);
      folderLogic = meta.folderLogic;
      startDir = stripSlashes(meta.startingFolder);
    } catch {
      // Fall through to defaults if XML parsing fails
    }
  }
  return { folderLogic, startDir, hasAbapGitXml };
}

/**
 * Parse a metadata file path into an object key and register it in the map.
 */
function registerMetadataFile(
  path: string,
  supportedTypes: Set<string>,
  objectMap: Map<string, ObjectFiles>,
  field: 'xmlFile' | 'jsonFile',
): void {
  const filename = path.slice(path.lastIndexOf('/') + 1);
  const parsed = parseAbapGitFilename(filename);
  if (!parsed) return;
  if (!supportedTypes.has(parsed.type.toLowerCase())) return;
  if (parsed.suffix) return;

  const key = `${parsed.name}:${parsed.type}`;
  if (!objectMap.has(key)) {
    objectMap.set(key, {
      name: parsed.name,
      type: parsed.type,
      sourceFiles: [],
    });
  }
  objectMap.get(key)![field] = path;
}

/**
 * Collect all source files and attach them to their objects in the map.
 */
async function collectSourceFiles(
  fileTree: FileTree,
  objectMap: Map<string, ObjectFiles>,
): Promise<void> {
  const [abapFiles, abdlFiles, acdsFiles, asrvdFiles] = await Promise.all([
    fileTree.glob('**/*.abap'),
    fileTree.glob('**/*.abdl'),
    fileTree.glob('**/*.acds'),
    fileTree.glob('**/*.asrvd'),
  ]);
  for (const sourcePath of [
    ...abapFiles,
    ...abdlFiles,
    ...acdsFiles,
    ...asrvdFiles,
  ]) {
    const filename = sourcePath.slice(sourcePath.lastIndexOf('/') + 1);
    const parsed = parseAbapGitFilename(filename);
    if (!parsed) continue;
    const obj = objectMap.get(`${parsed.name}:${parsed.type}`);
    if (obj) obj.sourceFiles.push({ path: sourcePath, suffix: parsed.suffix });
  }
}

/**
 * Parse metadata (XML or JSON) and return values + isAffJson flag.
 */
async function parseMetadata(
  fileTree: FileTree,
  objFiles: ObjectFiles,
  handler: ReturnType<typeof getHandler>,
): Promise<{ values: Record<string, unknown>; isAffJson: boolean } | null> {
  if (objFiles.jsonFile) {
    const jsonContent = await fileTree.read(objFiles.jsonFile);
    let jsonData: Record<string, unknown>;
    try {
      jsonData = JSON.parse(jsonContent) as Record<string, unknown>;
    } catch (parseError) {
      console.error(
        `Failed to parse AFF JSON ${objFiles.jsonFile}:`,
        parseError,
      );
      return null;
    }
    const values = handler?.fromAffJson
      ? (handler.fromAffJson(jsonData) as Record<string, unknown>)
      : jsonData;
    return { values, isAffJson: true };
  }
  if (objFiles.xmlFile) {
    const xmlContent = await fileTree.read(objFiles.xmlFile);
    const parsed = handler!.schema.parse(xmlContent);
    return {
      values: (parsed as any)?.abapGit?.abap?.values ?? {},
      isAffJson: false,
    };
  }
  return null;
}

/**
 * Build the payload from handler or filename fallback.
 */
function buildPayload(
  handler: ReturnType<typeof getHandler>,
  values: Record<string, unknown>,
  isAffJson: boolean,
  objFiles: ObjectFiles,
): { name: string; description?: string; [key: string]: unknown } {
  if (isAffJson && handler?.fromAffJson) {
    return values as { name: string; description?: string };
  }
  if (isAffJson) {
    return { name: objFiles.name };
  }
  if (handler?.fromAbapGit) {
    return handler.fromAbapGit(values);
  }
  return { name: objFiles.name };
}

/**
 * Set sources on an ADK object using handler or fallback.
 */
function setObjectSources(
  handler: ReturnType<typeof getHandler>,
  adkObject: AdkObject,
  sources: Record<string, string>,
): void {
  if (Object.keys(sources).length === 0) return;
  if (handler?.setSources) {
    handler.setSources(adkObject, sources);
    return;
  }
  if (sources['main']) (adkObject as any)._pendingSource = sources['main'];
  if (Object.keys(sources).length > 1) {
    (adkObject as any)._pendingSources = sources;
  }
}

/**
 * Resolve packageRef on an ADK object from folder logic or rootPackage.
 */
function resolvePackageRef(
  adkObject: AdkObject,
  options: ExportOptions | undefined,
  hasAbapGitXml: boolean,
  folderLogic: import('./folder-logic').FolderLogic,
): void {
  if (!options?.rootPackage) return;
  const data = (adkObject as any)._data;
  if (!data || data.packageRef) return;
  if (hasAbapGitXml) {
    const relDir = (adkObject as any)._relDir ?? '';
    const pkgName = resolvePackageFromDir(
      relDir,
      folderLogic,
      options.rootPackage,
    );
    data.packageRef = { name: pkgName };
  } else {
    data.packageRef = { name: options.rootPackage };
  }
}

/**
 * Set abapLanguageVersion on an ADK object if provided in options.
 */
function setAbapLanguageVersion(
  adkObject: AdkObject,
  options: ExportOptions | undefined,
): void {
  if (!options?.abapLanguageVersion) return;
  const data = (adkObject as any)._data;
  if (data && !data.abapLanguageVersion) {
    data.abapLanguageVersion =
      abapLangVerToAdt(options.abapLanguageVersion) ??
      options.abapLanguageVersion;
  }
}

/**
 * Deserialize abapGit files to ADK objects
 *
 * True generator - yields objects one at a time as they're discovered.
 * Resolves packageRef using abapGit folder logic when rootPackage is provided.
 *
 * @param fileTree - Virtual file system to read from
 * @param client - ADT client for creating ADK objects
 * @param options - Export options (root package, language version, etc.)
 */
export async function* deserialize(
  fileTree: FileTree,
  client: AdtClient,
  options?: ExportOptions,
): AsyncGenerator<AdkObject> {
  const adk = createAdk(client);
  const { folderLogic, startDir, hasAbapGitXml } =
    await resolveFolderConfig(fileTree);

  // Find all metadata files (XML = legacy, JSON = AFF)
  const [xmlFiles, jsonFiles] = await Promise.all([
    fileTree.glob('**/*.xml'),
    fileTree.glob('**/*.json'),
  ]);

  const objectMap = new Map<string, ObjectFiles>();
  const supportedTypes = new Set(
    getSupportedTypes().map((t) => t.toLowerCase()),
  );

  for (const xmlPath of xmlFiles) {
    if (xmlPath.endsWith('.abapgit.xml')) continue;
    if (xmlPath.endsWith('package.devc.xml')) continue;
    registerMetadataFile(xmlPath, supportedTypes, objectMap, 'xmlFile');
  }

  for (const jsonPath of jsonFiles) {
    registerMetadataFile(jsonPath, supportedTypes, objectMap, 'jsonFile');
  }

  await collectSourceFiles(fileTree, objectMap);

  // Process each object and yield
  for (const [, objFiles] of objectMap) {
    if (!objFiles.xmlFile && !objFiles.jsonFile) continue;

    const handler = getHandler(objFiles.type);
    if (!handler) continue;

    try {
      const meta = await parseMetadata(fileTree, objFiles, handler);
      if (!meta) continue;
      const { values, isAffJson } = meta;

      // Read source files
      const sources: Record<string, string> = {};
      for (const { path, suffix } of objFiles.sourceFiles) {
        const content = await fileTree.read(path);
        const sourceKey = suffix
          ? (handler.suffixToSourceKey?.[suffix] ?? suffix)
          : 'main';
        sources[sourceKey] = content;
      }

      const payload = buildPayload(handler, values, isAffJson, objFiles);
      const objectName = payload.name || objFiles.name;
      const adkType =
        typeof payload.type === 'string' ? payload.type : objFiles.type;
      const adkObject = adk.getWithData(
        { ...payload, name: objectName },
        adkType,
      ) as AdkObject;

      setObjectSources(handler, adkObject, sources);

      if (payload.description) {
        (adkObject as any)._pendingDescription = payload.description;
      }

      // Compute relative directory for package resolution
      if (hasAbapGitXml) {
        const metadataFile = objFiles.xmlFile ?? objFiles.jsonFile ?? '';
        const sourceDir = metadataFile.split('/').slice(0, -1).join('/');
        const relDir = sourceDir.startsWith(startDir)
          ? sourceDir.slice(startDir.length).replace(/^\/+/, '')
          : sourceDir;
        (adkObject as any)._relDir = relDir;
        (adkObject as any)._folderLogic = folderLogic;
      }

      resolvePackageRef(adkObject, options, hasAbapGitXml, folderLogic);
      setAbapLanguageVersion(adkObject, options);

      yield adkObject;

      // For compound objects (FUGR), yield child objects (function modules)
      if (objFiles.type === 'FUGR' && payload._functions) {
        yield* yieldFugrChildren(adk, payload, objectName, options, adkObject);
      }
    } catch (error) {
      console.error(
        `Failed to deserialize ${objFiles.type} ${objFiles.name}:`,
        error,
      );
    }
  }
}

/**
 * Yield FUGR child function modules as separate ADK objects.
 */
async function* yieldFugrChildren(
  adk: ReturnType<typeof createAdk>,
  payload: { _functions?: unknown },
  parentName: string,
  options: ExportOptions | undefined,
  parentObject: AdkObject,
): AsyncGenerator<AdkObject> {
  const fmDescriptors = extractFunctionDescriptors(payload._functions);
  const fmSources = (parentObject as any)._pendingFmSources as
    Record<string, string> | undefined;
  for (const fm of fmDescriptors) {
    try {
      const fmObject = adk.getWithData(
        {
          name: fm.funcName,
          type: 'FUGR/FF',
          _groupName: parentName,
          description: fm.shortText ?? '',
          processingType: fm.processingType,
          basXMLEnabled: fm.basXMLEnabled,
        },
        'FUGR/FF',
      ) as AdkObject;
      const fmSource = fmSources?.[fm.funcName.toLowerCase()];
      if (fmSource) (fmObject as any)._pendingSource = fmSource;
      setAbapLanguageVersion(fmObject, options);
      yield fmObject;
    } catch (fmError) {
      console.error(
        `Failed to deserialize FM ${fm.funcName} in FUGR ${parentName}:`,
        fmError,
      );
    }
  }
}
