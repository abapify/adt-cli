/**
 * gCTS / AFF handler factory.
 *
 * Mirrors the abapGit `createHandler` factory but produces **JSON** metadata
 * (AFF / gCTS convention) instead of abapGit's `.xml` files. Handlers are
 * kept intentionally small — business logic lives in `@abapify/adk` and the
 * only job of a gCTS handler is to project ADK data to the on-disk shape.
 *
 * Self-registration: `createHandler` stores the handler in the module-local
 * registry so `getHandler(type)` can resolve it. The `FormatPlugin` wrapper
 * (`format/gcts-format.ts`) exposes the registry through the public
 * `@abapify/adt-plugin` contract.
 */

import type { AdkObject, AdkKind } from '@abapify/adk';
import { getTypeForKind, getMainType } from '@abapify/adk';
import type { FormatHandler, SerializedFile } from '@abapify/adt-plugin';
import { gctsFilename, splitSourceKey } from '../format/filename';
import { payloadOf } from '../aff/generic';
import type { GctsMetadata } from '../format/types';

export type AbapObjectType = string;

export type AdkObjectClass<T extends AdkObject = AdkObject> = {
  new (...args: any[]): T;
  readonly kind: AdkKind;
};

/**
 * Lazy source entry.
 *
 * `content` may be a string, a promise, or a thunk returning either — the
 * factory awaits whichever form the handler returns.
 */
export interface GctsSourceEntry {
  suffix?: string;
  /**
   * File extension override — defaults to the object type's source
   * extension. Required for companions whose extension differs
   * (`.properties` texts, `.json` LIMU sub-object metadata, `.xdp`).
   */
  ext?: string;
  content: string | Promise<string> | (() => string | Promise<string>);
}

/**
 * Extra file emitted alongside the standard metadata + source files.
 * Used by compound handlers (e.g. FUGR emitting per-function-module files).
 * `path` is relative to the object directory.
 */
export interface GctsExtraFile {
  path: string;
  content: string | Promise<string> | (() => string | Promise<string>);
}

/**
 * Handler definition for a single ABAP object type.
 *
 * The shape intentionally mirrors the abapGit `HandlerDefinition` so that
 * anyone familiar with the sister plugin can move between them with minimal
 * friction. The `toMetadata` function is the only required hook: it maps an
 * ADK object to the JSON metadata shape for the target type.
 */
export interface GctsHandlerDefinition<
  T extends AdkObject,
  M extends GctsMetadata = GctsMetadata,
> {
  /** Map ADK object → JSON metadata payload (including the required `header`). */
  toMetadata(object: T): M;

  /** Optional: single primary source file. */
  getSource?(object: T): string | Promise<string>;

  /** Optional: multiple source files (e.g. CLAS includes). */
  getSources?(object: T): GctsSourceEntry[];

  /** Optional: extra files with full paths (e.g. FUGR per-FM .func.json). */
  getExtraFiles?(object: T): GctsExtraFile[] | Promise<GctsExtraFile[]>;

  /** Optional: custom metadata filename (e.g. `package.devc.json` for DEVC). */
  metadataFileName?: string | ((object: T) => string);

  /**
   * Optional: inverse mapping used during deserialization.
   *
   * `fromMetadata` receives the parsed JSON payload and returns a partial
   * ADK-data projection. `setSources` mirrors abapGit's behaviour: it stages
   * source content on the ADK object for later deploy.
   */
  fromMetadata?(metadata: M): { name: string } & Record<string, unknown>;
  suffixToSourceKey?: Record<string, string>;
  setSources?(object: T, sources: Record<string, string>): void;
}

/** Runtime shape of a gCTS handler after `createHandler` processing. */
export interface GctsHandler<
  T extends AdkObject = AdkObject,
> extends FormatHandler {
  readonly type: AbapObjectType;
  readonly fileExtension: string;
  readonly schema: {
    parse(raw: string): unknown;
    build(data: unknown): string;
  };
  serialize(object: T): Promise<SerializedFile[]>;
  fromAbapGit?(values: unknown): { name: string } & Record<string, unknown>;
  setSources?(object: T, sources: Record<string, string>): void;
}

const handlerRegistry = new Map<AbapObjectType, GctsHandler>();

/** Look up a handler (full-type first, then main-type fallback). */
export function getHandler(type: AbapObjectType): GctsHandler | undefined {
  return handlerRegistry.get(type) ?? handlerRegistry.get(getMainType(type));
}

/** `true` iff the given object type has a registered handler. */
export function isSupported(type: AbapObjectType): boolean {
  return handlerRegistry.has(type) || handlerRegistry.has(getMainType(type));
}

/** Snapshot of all registered object types. */
export function getSupportedTypes(): AbapObjectType[] {
  return [...handlerRegistry.keys()];
}

/** Internal — test helper. */
export function __resetRegistry(): void {
  handlerRegistry.clear();
}

/**
 * Build a JSON metadata file for the object. JSON is pretty-printed (2-space
 * indent) so the output is diff-friendly and matches AFF's own tooling.
 */
function buildMetadataFile(meta: GctsMetadata): string {
  return JSON.stringify(meta, null, 2) + '\n';
}

/** Staged source companions → files (extension-aware keys → LIMU names). */
function sourceCompanionFiles(
  object: unknown,
  type: string,
  objectName: string,
  suffixToSourceKey?: Record<string, string>,
): SerializedFile[] {
  const payload = payloadOf(object as Parameters<typeof payloadOf>[0]);
  const pending = object as {
    _pendingSource?: string;
    _pendingSources?: Record<string, string>;
  };
  const map: Record<string, string> = {
    ...(payload?.sources as Record<string, string> | undefined),
    ...pending._pendingSources,
  };
  if (pending._pendingSource && !map.main) map.main = pending._pendingSource;
  // Staged keys are ADK include/source names — the file suffix is the
  // inverse of `suffixToSourceKey` (CLAS `locals_def` → `definitions`).
  const keyToSuffix = Object.fromEntries(
    Object.entries(suffixToSourceKey ?? {}).map(([suffix, key]) => [
      key,
      suffix,
    ]),
  );
  const files: SerializedFile[] = [];
  for (const [key, content] of Object.entries(map)) {
    // Skip absent entries only — an empty companion is still a companion
    // and must round-trip (e.g. an intentionally empty include).
    if (content == null) continue;
    const { suffix, ext } = splitSourceKey(key);
    const fileSuffix = suffix ? (keyToSuffix[suffix] ?? suffix) : suffix;
    files.push({
      path: gctsFilename(objectName, type, 'source', fileSuffix, ext),
      content,
    });
  }
  return files;
}

/** `data.docu` → `{name}.{type}.docu.json` file (or nothing). */
function docuCompanionFile(
  payload: Record<string, unknown> | undefined,
  objectName: string,
  typeLower: string,
): SerializedFile[] {
  const docu = payload?.docu;
  if (docu === undefined || docu === null) return [];
  return [
    {
      path: `${objectName}.${typeLower}.docu.json`,
      content:
        typeof docu === 'string' ? docu : JSON.stringify(docu, null, 2) + '\n',
    },
  ];
}

/** `data.properties` map → `.properties` files ('' key → master file). */
function propertyCompanionFiles(
  payload: Record<string, unknown> | undefined,
  objectName: string,
  typeLower: string,
): SerializedFile[] {
  const props = payload?.properties as Record<string, string> | undefined;
  const files: SerializedFile[] = [];
  for (const [key, content] of Object.entries(props ?? {})) {
    if (content == null) continue;
    files.push({
      path: key
        ? `${objectName}.${typeLower}.${key}.properties`
        : `${objectName}.${typeLower}.properties`,
      content,
    });
  }
  return files;
}

/**
 * Universal companion preservation. Deserialization stages every
 * companion a dedicated hook does not claim into `_pendingSources` /
 * `data.sources` (extension-aware keys), `data.docu`, and
 * `data.properties` — emitted here so handlers without a matching emit
 * hook still round-trip LIMU sub-objects, DOCU texts, and translations
 * instead of silently dropping them. Paths already in `emitted` win.
 */
function companionFiles(
  object: unknown,
  type: string,
  objectName: string,
  emitted: ReadonlySet<string>,
  suffixToSourceKey?: Record<string, string>,
): SerializedFile[] {
  const typeLower = type.split('/')[0].toLowerCase();
  const payload = payloadOf(object as Parameters<typeof payloadOf>[0]);
  const candidates = [
    ...sourceCompanionFiles(object, type, objectName, suffixToSourceKey),
    ...docuCompanionFile(payload, objectName, typeLower),
    ...propertyCompanionFiles(payload, objectName, typeLower),
  ];
  return candidates.filter((f) => !emitted.has(f.path));
}

/**
 * Register a handler for an ADK class (preferred — `type` is derived from
 * the static `kind`) or an explicit type string (for types without an ADK
 * class, e.g. DOMA/DTEL).
 */
export function createHandler<
  T extends AdkObject,
  M extends GctsMetadata = GctsMetadata,
>(
  adkClass: AdkObjectClass<T>,
  definition: GctsHandlerDefinition<T, M>,
): GctsHandler<T>;
export function createHandler<
  T extends AdkObject,
  M extends GctsMetadata = GctsMetadata,
>(
  type: AbapObjectType,
  definition: GctsHandlerDefinition<T, M>,
): GctsHandler<T>;
export function createHandler<
  T extends AdkObject,
  M extends GctsMetadata = GctsMetadata,
>(
  adkClassOrType: AdkObjectClass<T> | AbapObjectType,
  definition: GctsHandlerDefinition<T, M>,
): GctsHandler<T> {
  let type: AbapObjectType;
  if (typeof adkClassOrType === 'string') {
    type = adkClassOrType;
  } else {
    const kind = adkClassOrType.kind;
    const derived = getTypeForKind(kind);
    if (!derived) {
      throw new Error(
        `Unknown ADK kind: ${kind}. Ensure the ADK class has a static 'kind' property.`,
      );
    }
    type = derived;
  }

  const fileExtension = getMainType(type).toLowerCase();

  async function resolveSource(entry: GctsSourceEntry): Promise<string> {
    const raw =
      typeof entry.content === 'function' ? entry.content() : entry.content;
    return await raw;
  }

  const handler: GctsHandler<T> = {
    type,
    fileExtension,
    // Minimal JSON "schema" — matches the FormatHandlerSchema contract.
    schema: {
      parse: (raw: string) => JSON.parse(raw) as unknown,
      build: (data: unknown) => JSON.stringify(data, null, 2) + '\n',
    },
    suffixToSourceKey: definition.suffixToSourceKey,
    async serialize(object: T): Promise<SerializedFile[]> {
      const files: SerializedFile[] = [];
      const objectName = (object.name ?? '').toLowerCase();

      // Source files.
      if (definition.getSources) {
        for (const entry of definition.getSources(object)) {
          const content = await resolveSource(entry);
          if (!content) continue;
          files.push({
            path: gctsFilename(
              objectName,
              type,
              'source',
              entry.suffix,
              entry.ext,
            ),
            content,
          });
        }
      } else if (definition.getSource) {
        const content = await definition.getSource(object);
        if (content) {
          files.push({
            path: gctsFilename(objectName, type, 'source'),
            content,
          });
        }
      }

      // Metadata file.
      const metadata = definition.toMetadata(object);
      const metadataFile =
        typeof definition.metadataFileName === 'function'
          ? definition.metadataFileName(object)
          : (definition.metadataFileName ??
            gctsFilename(objectName, type, 'metadata'));
      files.push({
        path: metadataFile,
        content: buildMetadataFile(metadata),
      });

      // Extra files (e.g. FUGR per-function-module .func.json + .func.abap).
      if (definition.getExtraFiles) {
        const extras = await definition.getExtraFiles(object);
        for (const extra of extras) {
          const content = await resolveSource(extra);
          if (!content) continue;
          files.push({ path: extra.path, content });
        }
      }

      files.push(
        ...companionFiles(
          object,
          type,
          objectName,
          new Set(files.map((f) => f.path)),
          definition.suffixToSourceKey,
        ),
      );

      return files;
    },
    fromAbapGit: definition.fromMetadata
      ? (values: unknown) =>
          definition.fromMetadata!(values as M) as { name: string } & Record<
            string,
            unknown
          >
      : undefined,
    setSources: definition.setSources,
  };

  handlerRegistry.set(type, handler as GctsHandler);
  return handler;
}

/** Convenience re-export — matches abapGit's `package.devc.xml` pattern. */
export { PACKAGE_FILENAME } from '../format/filename';
