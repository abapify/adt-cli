/**
 * Table/Structure serialization helpers for abapGit format.
 *
 * This file contains the source-to-XML conversion used by the TABL handler.
 * It is intentionally separate from the handler definition file, which keeps
 * the handler surface focused on schema mapping (`toAbapGit`/`fromAbapGit`).
 */

import {
  parse,
  type TableDefinition,
  type StructureDefinition,
} from '@abapify/acds';
import { tablesettings, type InferTypedSchema } from '@abapify/adt-schemas';
import type { FormatSerializeOptions } from '@abapify/adt-plugin';
import { AdkTable, AdkStructure } from '../adk';
import { tabl } from '../../../schemas/generated';
import { SerializedFile } from '../base';
import { isoToSapLang, sapLangToIso } from '../lang';
import { buildDD02V, buildDD03P } from '../cds-to-abapgit';
import type { TypeResolver, ResolvedType } from '../cds-to-abapgit';
import { formatAbapGitXml } from '../xml-format';

const XML_NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

function decodeNumericCode(decimal?: string, hex?: string): string {
  const base = decimal !== undefined ? 10 : 16;
  const value = decimal !== undefined ? decimal : (hex ?? '');
  return String.fromCharCode(parseInt(value, base));
}

function decodeXmlEntities(text: string): string {
  return text.replace(
    /&(?:#(\d+)|#x([0-9a-fA-F]+)|([a-zA-Z][a-zA-Z0-9]*));/g,
    (match, decimal, hex, name) =>
      decimal !== undefined || hex !== undefined
        ? decodeNumericCode(decimal, hex)
        : (XML_NAMED_ENTITIES[name] ?? match),
  );
}

/**
 * Strip undefined/empty-string values from an object
 * to avoid emitting empty XML elements
 */
function stripEmpty<T extends object>(obj: T): Partial<T> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== '') {
      result[key] = value;
    }
  }
  return result as Partial<T>;
}

type TableSettings = Extract<
  InferTypedSchema<typeof tablesettings>,
  { tableSettings: unknown }
>['tableSettings'];

/**
 * Parse ADT table settings XML into DD09L data for abapGit serialization.
 */
function parseSettingsToDD09L(
  settingsXml: string,
  def: TableDefinition | StructureDefinition,
): Record<string, string> | undefined {
  let settings: TableSettings;
  try {
    const parsed = tablesettings.parse(settingsXml);
    if (!('tableSettings' in parsed)) return undefined;
    settings = parsed.tableSettings;
  } catch {
    return undefined;
  }

  const dd09l: Record<string, string | undefined> = {
    TABNAME: def.name.toUpperCase(),
    AS4LOCAL: 'A',
    TABKAT: settings.sizeCategory,
    TABART: settings.dataClassCategory,
    BUFALLOW: settings.buffering?.allowed,
    PUFFERUNG: settings.buffering?.type as string | undefined,
    SCHFELDANZ:
      settings.buffering?.areaKeyFields &&
      settings.buffering.areaKeyFields !== '0'
        ? settings.buffering.areaKeyFields
        : undefined,
    PROTOKOLL: settings.loggingEnabled ? 'X' : undefined,
  };

  return stripEmpty(dd09l) as Record<string, string>;
}

/**
 * Create a TypeResolver that resolves named types via ADT endpoints.
 */
function resolveReferencedType(xml: string, comptype: 'E' | 'S'): ResolvedType {
  const result: ResolvedType = { comptype };
  if (
    comptype === 'E' &&
    /<dtel:searchHelp>[^<]+<\/dtel:searchHelp>/.test(xml)
  ) {
    result.shlporigin = 'D';
  }
  const descMatch = /adtcore:description="([^"]+)"/.exec(xml);
  if (descMatch) result.description = decodeXmlEntities(descMatch[1]);
  return result;
}

function createAdtTypeResolver(obj: AdkTable | AdkStructure): TypeResolver {
  const cache = new Map<string, ResolvedType>();

  return {
    async resolve(name: string): Promise<ResolvedType> {
      const key = name.toLowerCase();
      const cached = cache.get(key);
      if (cached) return cached;

      const dtelXml = await obj.fetchText(
        `/sap/bc/adt/ddic/dataelements/${encodeURIComponent(key)}`,
      );
      if (dtelXml) {
        const result = resolveReferencedType(dtelXml, 'E');
        cache.set(key, result);
        return result;
      }

      const structXml = await obj.fetchText(
        `/sap/bc/adt/ddic/structures/${encodeURIComponent(key)}`,
      );
      const result = structXml
        ? resolveReferencedType(structXml, 'S')
        : { comptype: 'E' as const };
      cache.set(key, result);
      return result;
    },
  };
}

async function resolveCdsSource<T extends AdkTable | AdkStructure>(
  obj: T,
  sources: Readonly<Record<string, string>> | undefined,
): Promise<{ source: string } | { fallback: true }> {
  if (sources !== undefined) {
    // An explicit source map is authoritative. If it does not contain the
    // `main` component, we emit metadata only rather than falling back to the
    // current mutable SAP source.
    if (sources.main === undefined) {
      return { fallback: true };
    }
    return { source: sources.main };
  }
  try {
    return { source: await obj.getSource() };
  } catch {
    return { fallback: true };
  }
}

function createFallbackFile<T extends AdkTable | AdkStructure>(
  obj: T,
  ctx: {
    getObjectName: (obj: T) => string;
    toAbapGitXml: (obj: T) => string;
    createFile: (path: string, content: string) => SerializedFile;
  },
): SerializedFile[] {
  const objectName = ctx.getObjectName(obj);
  return [ctx.createFile(`${objectName}.tabl.xml`, ctx.toAbapGitXml(obj))];
}

async function buildTablValues<T extends AdkTable | AdkStructure>(
  obj: T,
  def: TableDefinition | StructureDefinition,
): Promise<Record<string, unknown>> {
  const lang = isoToSapLang(obj.language || undefined);
  const dd02v = buildDD02V(def, lang, obj.description ?? '');
  const resolver = createAdtTypeResolver(obj);
  const dd03pEntries = await buildDD03P(
    def.members,
    def.name.toUpperCase(),
    resolver,
  );

  const values: Record<string, unknown> = { DD02V: stripEmpty(dd02v) };

  if ('getSettings' in obj && typeof obj.getSettings === 'function') {
    try {
      const settingsXml = await (obj as AdkTable).getSettings();
      if (settingsXml) {
        const dd09l = parseSettingsToDD09L(settingsXml, def);
        if (dd09l) values.DD09L = stripEmpty(dd09l);
      }
    } catch {
      // Settings not available, skip DD09L
    }
  }

  if (dd03pEntries.length > 0) {
    values.DD03P_TABLE = {
      DD03P: dd03pEntries.map((entry) => stripEmpty(entry)),
    };
  }

  return values;
}

function buildTablXml<T extends AdkTable | AdkStructure>(
  obj: T,
  ctx: {
    getObjectName: (obj: T) => string;
  },
  values: Record<string, unknown>,
): string {
  const fullPayload = {
    abap: { version: '1.0', values },
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_TABL',
    serializer_version: 'v1.0.0',
  };

  return formatAbapGitXml(tabl.build(fullPayload as any, { pretty: true }));
}

export async function serializeTabl<T extends AdkTable | AdkStructure>(
  obj: T,
  ctx: {
    getObjectName: (obj: T) => string;
    toAbapGitXml: (obj: T) => string;
    createFile: (path: string, content: string) => SerializedFile;
  },
  options?: FormatSerializeOptions,
): Promise<SerializedFile[]> {
  const objectName = ctx.getObjectName(obj);

  const resolved = await resolveCdsSource(
    obj,
    options?.sources as Readonly<Record<string, string>> | undefined,
  );
  if ('fallback' in resolved) return createFallbackFile(obj, ctx);

  const { ast, errors } = parse(resolved.source);
  if (errors.length > 0 || ast.definitions.length === 0) {
    return createFallbackFile(obj, ctx);
  }

  const def = ast.definitions[0] as TableDefinition | StructureDefinition;
  const values = await buildTablValues(obj, def);
  const xml = buildTablXml(obj, ctx, values);
  return [ctx.createFile(`${objectName}.tabl.xml`, xml)];
}

export function fromAbapGitTabl({ DD02V }: any = {}) {
  return {
    name: (DD02V?.TABNAME ?? '').toUpperCase(),
    type: DD02V?.TABCLASS === 'INTTAB' ? 'TABL/DS' : 'TABL/DT',
    description: DD02V?.DDTEXT,
    language: sapLangToIso(DD02V?.DDLANGUAGE),
    masterLanguage: sapLangToIso(DD02V?.DDLANGUAGE),
  } as { name: string } & Record<string, unknown>;
}
