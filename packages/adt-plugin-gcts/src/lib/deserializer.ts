/**
 * gCTS / AFF Deserializer — disk → ADK (format.export direction).
 *
 * Reads a gCTS-shaped file tree and yields `AdkObject` instances that the
 * `CheckinService` (E08) drives through the regular diff / plan / apply
 * pipeline. This is the counterpart to the serializer implemented in
 * `gcts-plugin.ts` (SAP → disk / format.import).
 *
 * Layout (matches the writer in `gcts-plugin.ts`):
 *
 *   src/<pkg-lowercased>/<obj>.<type>.json          metadata (AFF JSON)
 *   src/<pkg-lowercased>/<obj>.<type>[.<sfx>].abap  ABAP sources (and
 *                                                   .asddls / .asdcls for
 *                                                   CDS).
 *   src/<pkg-lowercased>/package.devc.json          package metadata (skipped
 *                                                   — packages must exist on
 *                                                   target, same convention
 *                                                   as abapGit).
 *
 * Unlike abapGit this plugin has no `.abapgit.xml` equivalent — AFF does not
 * encode folder-logic. We therefore rely on `options.rootPackage` (or
 * leave `packageRef` unset so downstream apply logic can decide) — no
 * guesswork per directory for now. Richer directory → package mapping is
 * tracked in the E06 follow-ups.
 */

import type { FileTree, ExportOptions } from '@abapify/adt-plugin';
import type { AdkObject } from '@abapify/adk';
import { createAdk, type AdtClient } from '@abapify/adk';
import { getHandler, getSupportedTypes } from './handlers/base';
import { parseGctsFilename, PACKAGE_FILENAME } from './format/filename';

/** Source-file extensions emitted by gCTS handlers. */
const SOURCE_EXTENSIONS = new Set(['abap', 'asddls', 'asdcls']);

/**
 * Map numeric abapLanguageVersion codes (`'5'` etc.) to the descriptive
 * string the ADT REST API expects (`'cloudDevelopment'`). Mirrors the
 * helper in `adt-plugin-abapgit` — kept local so this package does not
 * depend on its sibling.
 */
const ABAP_LANG_VER_TO_ADT: Record<string, string> = {
  '2': 'keyUser',
  '5': 'cloudDevelopment',
};

function abapLangVerToAdt(code: string | undefined): string | undefined {
  if (!code) return undefined;
  return ABAP_LANG_VER_TO_ADT[code] ?? code;
}

interface ObjectFiles {
  name: string;
  type: string;
  metadataFile?: string;
  sourceFiles: Array<{ path: string; suffix?: string }>;
}

/**
 * Deserialise a gCTS/AFF file tree into `AdkObject` instances.
 *
 * @param fileTree  Virtual FS abstraction (checkin supplies a real-fs impl).
 * @param client    `AdtClient` — required by `createAdk` to build ADK objects.
 * @param options   Export options. `rootPackage` is assigned as packageRef
 *                  to every discovered object that lacks one, mirroring the
 *                  abapGit behaviour when `.abapgit.xml` is absent.
 */
export async function* deserialize(
  fileTree: FileTree,
  client: AdtClient,
  options?: ExportOptions,
): AsyncGenerator<AdkObject> {
  const adk = createAdk(client);

  // Scan every JSON file — these are the anchors for each object.
  const jsonFiles = await fileTree.glob('**/*.json');

  const supportedTypes = new Set(
    getSupportedTypes().map((t) => t.toLowerCase()),
  );

  const objectMap = new Map<string, ObjectFiles>();

  for (const jsonPath of jsonFiles) {
    const filename = jsonPath.split('/').pop()!;

    // Packages are NOT deployed (same convention as abapGit's
    // package.devc.xml) — they must exist on target.
    if (filename === PACKAGE_FILENAME) continue;

    const parsed = parseGctsFilename(filename);
    if (!parsed) continue;
    if (parsed.extension !== 'json') continue;
    if (!supportedTypes.has(parsed.type.toLowerCase())) continue;

    const key = `${parsed.name.toUpperCase()}:${parsed.type.toUpperCase()}`;
    if (!objectMap.has(key)) {
      objectMap.set(key, {
        name: parsed.name.toUpperCase(),
        type: parsed.type.toUpperCase(),
        sourceFiles: [],
      });
    }
    objectMap.get(key)!.metadataFile = jsonPath;
  }

  // Collect every source file (.abap/.asddls/.asdcls) and group by name:type.
  for (const ext of SOURCE_EXTENSIONS) {
    const paths = await fileTree.glob(`**/*.${ext}`);
    for (const path of paths) {
      const filename = path.split('/').pop()!;
      const parsed = parseGctsFilename(filename);
      if (!parsed) continue;

      const key = `${parsed.name.toUpperCase()}:${parsed.type.toUpperCase()}`;
      const obj = objectMap.get(key);
      if (!obj) continue;

      obj.sourceFiles.push({ path, suffix: parsed.suffix });
    }
  }

  for (const [, objFiles] of objectMap) {
    if (!objFiles.metadataFile) continue;

    const handler = getHandler(objFiles.type);
    if (!handler) continue;

    try {
      const raw = await fileTree.read(objFiles.metadataFile);
      // Handler schema.parse is plain JSON.parse — the parsed object IS the
      // metadata passed to fromMetadata.
      const metadata = handler.schema.parse(raw);

      // Read sources, mapping suffix → source key via handler map.
      const sources: Record<string, string> = {};
      for (const { path, suffix } of objFiles.sourceFiles) {
        const content = await fileTree.read(path);
        const sourceKey = suffix
          ? (handler.suffixToSourceKey?.[suffix] ?? suffix)
          : 'main';
        sources[sourceKey] = content;
      }

      const payload: {
        name: string;
        description?: string;
        [key: string]: unknown;
      } = handler.fromAbapGit
        ? handler.fromAbapGit(metadata)
        : { name: objFiles.name };

      // AFF metadata frequently omits the object name (it's encoded in the
      // filename). Fall back to the filename-derived name.
      const objectName = payload.name || objFiles.name;
      const fullData = { ...payload, name: objectName };

      const adkType =
        typeof payload.type === 'string' ? payload.type : objFiles.type;
      const adkObject = adk.getWithData(fullData, adkType) as AdkObject;

      if (Object.keys(sources).length > 0) {
        if (handler.setSources) {
          handler.setSources(adkObject, sources);
        } else if (sources.main) {
          (adkObject as unknown as { _pendingSource: string })._pendingSource =
            sources.main;
        }
      }

      if (payload.description) {
        (
          adkObject as unknown as { _pendingDescription: string }
        )._pendingDescription = payload.description;
      }

      // Record relative directory (useful for future directory-based package
      // resolution). Plain metadata dir, no starting-folder normalisation —
      // gCTS does not define one.
      const sourceDir = objFiles
        .metadataFile!.split('/')
        .slice(0, -1)
        .join('/');
      (adkObject as unknown as { _relDir: string })._relDir = sourceDir;

      // Assign rootPackage to every object without a packageRef — no folder
      // logic available, so we cannot derive per-package assignments (see
      // E06 follow-ups). Matches abapGit's "no .abapgit.xml" fallback.
      if (options?.rootPackage) {
        const data = (
          adkObject as unknown as { _data?: Record<string, unknown> }
        )._data;
        if (data && !data.packageRef) {
          data.packageRef = { name: options.rootPackage };
        }
      }

      if (options?.abapLanguageVersion) {
        const data = (
          adkObject as unknown as { _data?: Record<string, unknown> }
        )._data;
        if (data && !data.abapLanguageVersion) {
          data.abapLanguageVersion =
            abapLangVerToAdt(options.abapLanguageVersion) ??
            options.abapLanguageVersion;
        }
      }

      yield adkObject;
    } catch (error) {
      // Mirrors abapGit: log and continue so one bad object does not abort
      // the whole checkin.
      console.error(
        `Failed to deserialize ${objFiles.type} ${objFiles.name}:`,
        error,
      );
    }
  }
}
