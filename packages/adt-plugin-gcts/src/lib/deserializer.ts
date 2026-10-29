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
import { createAdk, type AdkObject, type AdtClient } from '@abapify/adk';
import {
  getHandler,
  getSupportedTypes,
  type GctsHandler,
} from './handlers/base';
import {
  parseGctsFilename,
  PACKAGE_FILENAME,
  sourceKey,
} from './format/filename';

/** Source-file extensions emitted by gCTS handlers. `.properties`
 * translation files are deliberately excluded — they are companions
 * routed into `data.properties`, never ABAP source staging. */
const SOURCE_EXTENSIONS = new Set([
  'abap',
  'asddls',
  'asdcls',
  'acds',
  'abdl',
  'csn',
  'xdp',
  'ddic',
  'xml',
]);

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
  sourceFiles: Array<{ path: string; suffix?: string; ext?: string }>;
  /** `{name}.{type}.{docu}.json` companion — not the metadata anchor. */
  docuFile?: string;
  /** `.properties` translations keyed by suffix (`en`, `texts.en`, `''`). */
  propertyFiles: Array<{ path: string; suffix?: string }>;
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
        propertyFiles: [],
      });
    }
    // `{name}.{type}.docu.json` is a DOCU companion, not a second
    // metadata anchor — without this it can overwrite metadataFile
    // depending on glob order. Other suffixed `.json` companions (LIMU
    // sub-object metadata, `{sub}.{stype}`) flow through the source
    // pipeline with an explicit `json` ext marker.
    if (parsed.suffix === 'docu') {
      objectMap.get(key)!.docuFile = jsonPath;
    } else if (parsed.suffix) {
      objectMap.get(key)!.sourceFiles.push({
        path: jsonPath,
        suffix: parsed.suffix,
        ext: 'json',
      });
      continue;
    } else {
      objectMap.get(key)!.metadataFile = jsonPath;
    }
  }

  // `.properties` translation companions — routed into `data.properties`
  // so they round-trip through metadata, not source staging.
  for (const path of await fileTree.glob('**/*.properties')) {
    const filename = path.split('/').pop()!;
    const parsed = parseGctsFilename(filename);
    if (!parsed) continue;
    const key = `${parsed.name.toUpperCase()}:${parsed.type.toUpperCase()}`;
    objectMap.get(key)?.propertyFiles.push({ path, suffix: parsed.suffix });
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

      obj.sourceFiles.push({
        path,
        suffix: parsed.suffix,
        ext: parsed.extension,
      });
    }
  }

  // Per-object pipeline: each worker claims the next object and reads
  // its metadata + companions through a shared throttle, so at most
  // MAX_CONCURRENT_READS file descriptors are open at once (no EMFILE).
  // Completed objects land in `pending` and are yielded in input order
  // as soon as they are ready, so memory stays bounded to the in-flight
  // objects plus the small not-yet-drained backlog — a large repository
  // no longer retains every companion at once. A failure inside one
  // object rejects only that object's task; other workers keep going,
  // mirroring the abapGit log-and-continue rule.
  const readThrottled = throttledReader(fileTree);
  const entries = [...objectMap.values()];
  const pending = new Map<number, AdkObject | undefined>();
  let wake: (() => void) | undefined;
  const notify = () => {
    const w = wake;
    wake = undefined;
    w?.();
  };
  let cursor = 0;
  const worker = async (): Promise<void> => {
    const index = cursor++;
    const objFiles = entries[index];
    if (!objFiles) return;
    pending.set(
      index,
      await buildObject(objFiles, readThrottled, adk, options),
    );
    notify();
    return worker();
  };
  const workersDone = Promise.all(
    Array.from(
      { length: Math.min(MAX_CONCURRENT_READS, entries.length) },
      worker,
    ),
  );
  let finished = false;
  void workersDone.then(() => {
    finished = true;
    notify();
  });

  // Ordered async iterator: `for await` yields each object as soon as
  // its index slot completes — objects drain in input order and the
  // buffer stays bounded to not-yet-yielded work.
  let drain = 0;
  const stream: AsyncIterable<AdkObject> = {
    [Symbol.asyncIterator]() {
      return {
        async next(): Promise<IteratorResult<AdkObject>> {
          if (pending.has(drain)) {
            const obj = pending.get(drain);
            pending.delete(drain++);
            return obj ? { value: obj, done: false } : this.next();
          }
          if (finished) return { value: undefined, done: true };
          await new Promise<void>((resolve) => {
            wake = resolve;
          });
          return this.next();
        },
      };
    },
  };
  for await (const obj of stream) yield obj;
  await workersDone;
}

const MAX_CONCURRENT_READS = 32;

/**
 * Throttled `fileTree.read` — caps concurrently open reads globally.
 * A finishing read hands its slot directly to the oldest waiter instead
 * of releasing it first, so a fresh caller can never sneak in and push
 * `inflight` past `limit`.
 */
function throttledReader(
  fileTree: FileTree,
  limit = MAX_CONCURRENT_READS,
): (path: string) => Promise<string> {
  let inflight = 0;
  const queue: (() => void)[] = [];
  return async (path: string) => {
    if (inflight >= limit) {
      // Wait for a slot to be handed over — inflight already counts it.
      await new Promise<void>((resolve) => queue.push(resolve));
    } else {
      inflight++;
    }
    try {
      return await fileTree.read(path);
    } finally {
      const next = queue.shift();
      if (next) next();
      else inflight--;
    }
  };
}

/** Read one object's files and build its ADK object, or undefined. */
async function buildObject(
  objFiles: ObjectFiles,
  read: (path: string) => Promise<string>,
  adk: ReturnType<typeof createAdk>,
  options?: ExportOptions,
): Promise<AdkObject | undefined> {
  if (!objFiles.metadataFile) return undefined;
  const handler = getHandler(objFiles.type);
  if (!handler) return undefined;
  try {
    const companionPaths = [
      ...(objFiles.docuFile ? [objFiles.docuFile] : []),
      ...objFiles.propertyFiles.map((f) => f.path),
      ...objFiles.sourceFiles.map((f) => f.path),
    ];
    const [raw, ...companions] = await Promise.all(
      [objFiles.metadataFile, ...companionPaths].map(read),
    );
    const contents = new Map<string, string>();
    companionPaths.forEach((path, i) => contents.set(path, companions[i]!));
    // Handler schema.parse is plain JSON.parse — the parsed object IS the
    // metadata passed to fromMetadata.
    const metadata = handler.schema.parse(raw);
    return objectFromFiles(objFiles, handler, metadata, contents, adk, options);
  } catch (error) {
    // Mirrors abapGit: log and continue so one bad object does not abort
    // the whole checkin.
    console.error(
      `Failed to deserialize ${objFiles.type} ${objFiles.name}:`,
      error,
    );
    return undefined;
  }
}

/**
 * Read the collected source/companion files into a source-key map.
 * Companions whose extension differs from the type's default encode it
 * into the key (`{suffix}.{ext}`) — LIMU `.json` metadata and
 * `.properties` texts stay distinguishable from `.abap` sources.
 */
function collectSources(
  objFiles: ObjectFiles,
  handler: GctsHandler,
  contents: ReadonlyMap<string, string>,
): Record<string, string> {
  const sources: Record<string, string> = {};
  for (const { path, suffix, ext } of objFiles.sourceFiles) {
    const content = contents.get(path);
    if (content === undefined) continue;
    let key: string;
    if (suffix) {
      key = sourceKey(
        objFiles.type,
        handler.suffixToSourceKey?.[suffix] ?? suffix,
        ext ?? '',
      );
    } else if (ext && ext !== 'json') {
      key = sourceKey(objFiles.type, 'main', ext);
    } else {
      key = 'main';
    }
    sources[key] = content;
  }
  return sources;
}

/**
 * Stage companion keys on an ADK object without a dedicated
 * `setSources` hook — everything lands on `_pendingSources` /
 * `_pendingSource` so the shared emit path in `base.ts` re-emits
 * LIMU/sub-object files instead of silently dropping them.
 */
function stagePendingSources(
  adkObject: AdkObject,
  sources: Record<string, string>,
): void {
  const staged = adkObject as unknown as {
    _pendingSource?: string;
    _pendingSources?: Record<string, string>;
  };
  const { main, ...rest } = sources;
  if (main !== undefined) staged._pendingSource = main;
  if (Object.keys(rest).length > 0) {
    staged._pendingSources = { ...staged._pendingSources, ...rest };
  }
}

/** Build the payload record: handler projection + docu + properties. */
function buildPayload(
  objFiles: ObjectFiles,
  handler: GctsHandler,
  metadata: unknown,
  contents: ReadonlyMap<string, string>,
): { name: string; description?: string; [key: string]: unknown } {
  const payload = (
    handler.fromAbapGit
      ? handler.fromAbapGit(metadata)
      : { name: objFiles.name }
  ) as { name: string; description?: string; [key: string]: unknown };

  // DOCU companion → `data.docu` (the shared emit path re-emits it).
  const docuRaw = objFiles.docuFile
    ? contents.get(objFiles.docuFile)
    : undefined;
  if (docuRaw !== undefined) {
    try {
      payload.docu = JSON.parse(docuRaw) as unknown;
    } catch {
      payload.docu = docuRaw;
    }
  }

  // `.properties` translations → `data.properties` keyed by suffix
  // ('' = master file, 'en', 'texts.en', …).
  if (objFiles.propertyFiles.length > 0) {
    const props: Record<string, string> = {};
    for (const { path, suffix } of objFiles.propertyFiles) {
      const content = contents.get(path);
      if (content !== undefined) props[suffix ?? ''] = content;
    }
    payload.properties = props;
  }
  return payload;
}

/** Merge `data.packageRef`/`abapLanguageVersion` fallbacks onto the object. */
function applyOptionsFallbacks(
  adkObject: AdkObject,
  options?: ExportOptions,
): void {
  const data = (adkObject as unknown as { _data?: Record<string, unknown> })
    ._data;
  if (!data) return;
  // Assign rootPackage to every object without a packageRef — no folder
  // logic available, so we cannot derive per-package assignments (see
  // E06 follow-ups). Matches abapGit's "no .abapgit.xml" fallback.
  if (options?.rootPackage && !data.packageRef) {
    data.packageRef = { name: options.rootPackage };
  }
  if (options?.abapLanguageVersion && !data.abapLanguageVersion) {
    data.abapLanguageVersion =
      abapLangVerToAdt(options.abapLanguageVersion) ??
      options.abapLanguageVersion;
  }
}

/** Metadata + collected files → a staged ADK object. */
function objectFromFiles(
  objFiles: ObjectFiles,
  handler: GctsHandler,
  metadata: unknown,
  contents: ReadonlyMap<string, string>,
  adk: ReturnType<typeof createAdk>,
  options?: ExportOptions,
): AdkObject {
  const sources = collectSources(objFiles, handler, contents);
  const payload = buildPayload(objFiles, handler, metadata, contents);

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
    } else {
      stagePendingSources(adkObject, sources);
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
  const sourceDir = objFiles.metadataFile!.split('/').slice(0, -1).join('/');
  (adkObject as unknown as { _relDir: string })._relDir = sourceDir;

  applyOptionsFallbacks(adkObject, options);
  return adkObject;
}
