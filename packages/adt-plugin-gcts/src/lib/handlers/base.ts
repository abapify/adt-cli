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
import { gctsFilename } from '../format/filename';
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
            path: gctsFilename(objectName, type, 'source', entry.suffix),
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
