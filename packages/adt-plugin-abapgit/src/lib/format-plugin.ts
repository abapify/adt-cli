/**
 * abapGit as a FormatPlugin.
 *
 * This is the thin adapter that plugs the abapGit handler registry into the
 * generic `FormatPlugin` contract defined by `@abapify/adt-plugin`. External
 * consumers (adt-export, adt-diff, adt-cli) interact with this plugin
 * **through the registry only** — they look it up with
 * `getFormatPlugin('abapgit')` and never import this package directly.
 *
 * Registration happens as a side-effect of importing `@abapify/adt-plugin-abapgit`;
 * the CLI bootstraps the registration once in `adt-cli/src/lib/cli.ts`.
 */

import {
  FormatMaterializationError,
  type FormatPlugin,
  type FormatHandler,
  type MaterializedFormatFile,
} from '@abapify/adt-plugin';
import { posix } from 'node:path';
import {
  getHandler as getAbapGitHandler,
  getSupportedTypes,
} from './handlers/registry';
import { parseAbapGitFilename } from './deserializer';
import { calculatePackageDir, parseFolderLogic } from './folder-logic';

type ParsedFilename = NonNullable<ReturnType<typeof parseAbapGitFilename>>;

function classifyFile(
  parsed: ParsedFilename,
  handler: FormatHandler,
): { role: 'metadata' } | { role: 'source'; sourceComponent: string } {
  if (parsed.extension === 'xml' || parsed.extension === 'json') {
    return { role: 'metadata' };
  }

  if (!parsed.suffix) {
    return { role: 'source', sourceComponent: 'main' };
  }

  if (
    parsed.type.toLowerCase() === 'fugr' &&
    parsed.suffix.toLowerCase() === `l${parsed.name.toLowerCase()}top`
  ) {
    return { role: 'source', sourceComponent: 'main' };
  }

  const sourceComponent =
    handler.suffixToSourceKey?.[parsed.suffix] ?? parsed.suffix;
  return { role: 'source', sourceComponent };
}

function assertSupportsExplicitSources(
  handler: FormatHandler,
  objectType: string,
  sources?: Readonly<Record<string, string>>,
): void {
  if (!sources) return;
  if (Object.keys(sources).length === 0) return;
  if (handler.supportsExplicitSources) return;
  throw new FormatMaterializationError(
    'FORMAT_SOURCE_COMPONENT_UNSUPPORTED',
    `abapGit handler for "${objectType}" does not support explicit source selection.`,
  );
}

async function buildMaterializedFiles(
  handler: FormatHandler,
  object: unknown,
  packageDir: string,
  sources?: Readonly<Record<string, string>>,
  format?: 'aff' | 'legacy',
): Promise<MaterializedFormatFile[]> {
  const serialized = await handler.serialize(object, {
    ...(sources !== undefined ? { sources } : {}),
    ...(format !== undefined ? { format } : {}),
  });
  return serialized
    .map((file): MaterializedFormatFile => {
      const parsed = parseAbapGitFilename(file.path);
      const classification = parsed
        ? classifyFile(parsed, handler)
        : { role: 'source' as const, sourceComponent: 'main' };
      const path = posix.join('src', packageDir, file.path);
      return {
        ...file,
        path,
        ...classification,
      };
    })
    .sort((left, right) =>
      left.path < right.path ? -1 : left.path > right.path ? 1 : 0,
    );
}

export const abapgitFormatPlugin: FormatPlugin = {
  id: 'abapgit',
  description: 'abapGit serialization format',

  // `supportedTypes` is backed by the live handler registry so registering
  // additional handlers at import time is reflected here without extra work.
  get supportedTypes(): ReadonlyArray<string> {
    return getSupportedTypes();
  },

  getHandler(type: string): FormatHandler | undefined {
    // The concrete abapGit `ObjectHandler` is a structural superset of the
    // generic `FormatHandler`, so this is just a widening cast.
    const handler = getAbapGitHandler(type) as unknown as
      FormatHandler | undefined;
    return handler
      ? {
          ...handler,
          supportsExplicitSources: handler.supportsExplicitSources ?? false,
        }
      : undefined;
  },

  async materialize(input) {
    const handler = this.getHandler(input.objectType);
    if (!handler) {
      throw new FormatMaterializationError(
        'FORMAT_OBJECT_TYPE_UNSUPPORTED',
        `abapGit does not support object type "${input.objectType}".`,
      );
    }

    assertSupportsExplicitSources(handler, input.objectType, input.sources);

    const folderLogic =
      parseFolderLogic(input.formatOptions?.folderLogic) ?? 'prefix';
    const packageDir = calculatePackageDir([...input.packagePath], folderLogic);
    const files = await buildMaterializedFiles(
      handler,
      input.object,
      packageDir,
      input.sources,
      input.formatOptions?.format as 'aff' | 'legacy' | undefined,
    );
    return { files };
  },

  parseFilename(filename: string) {
    const parsed = parseAbapGitFilename(filename);
    return parsed ?? undefined;
  },
};

export default abapgitFormatPlugin;
