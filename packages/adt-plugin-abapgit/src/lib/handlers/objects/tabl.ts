/**
 * Table/Structure (TABL) object handlers for abapGit format
 *
 * Serializes SAP tables (TABL/DT) and structures (TABL/DS) to
 * abapGit-compatible XML format by fetching the CDS-style source code
 * from SAP, parsing it with @abapify/acds, and mapping the AST into
 * DD02V/DD03P structures.
 *
 * Tables and structures share the same serialization logic but use
 * different ADT endpoints (ddic/tables vs ddic/structures).
 *
 * Data sources:
 * - blueSource GET: name, type, description, language
 * - source/main GET: CDS source with annotations and field definitions
 *   → parsed via @abapify/acds into AST
 *   → mapped into DD02V annotations and DD03P field entries
 * - Per named type: /sap/bc/adt/ddic/dataelements/{name} or /structures/{name}
 *   → resolves COMPTYPE (E vs S), SHLPORIGIN, description (DDTEXT)
 */

import {
  parse,
  type TableDefinition,
  type StructureDefinition,
} from '@abapify/acds';
import { tablesettings, type InferTypedSchema } from '@abapify/adt-schemas';
import { AdkTable, AdkStructure } from '../adk';
import { tabl } from '../../../schemas/generated';
import { createHandler } from '../base';
import { isoToSapLang, sapLangToIso } from '../lang';
import { buildDD02V, buildDD03P } from '../cds-to-abapgit';
import type { TypeResolver, ResolvedType } from '../cds-to-abapgit';
import { formatAbapGitXml } from '../xml-format';

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

/**
 * Create a TypeResolver that resolves named types via ADT endpoints.
 * Tries data element first, then structure. Caches results.
 */
function createAdtTypeResolver(obj: AdkTable | AdkStructure): TypeResolver {
  const cache = new Map<string, ResolvedType>();

  return {
    async resolve(name: string): Promise<ResolvedType> {
      const key = name.toLowerCase();
      if (cache.has(key)) return cache.get(key)!;

      // Try data element first
      const dtelXml = await obj.fetchText(
        `/sap/bc/adt/ddic/dataelements/${encodeURIComponent(key)}`,
      );
      if (dtelXml) {
        const result: ResolvedType = { comptype: 'E' };

        // Extract searchHelp → SHLPORIGIN=D
        const searchHelpMatch = dtelXml.match(
          /<dtel:searchHelp>[^<]+<\/dtel:searchHelp>/,
        );
        if (searchHelpMatch) {
          result.shlporigin = 'D';
        }

        // Extract description for potential reuse
        const descMatch = dtelXml.match(/adtcore:description="([^"]+)"/);
        if (descMatch) result.description = descMatch[1];

        cache.set(key, result);
        return result;
      }

      // Try structure
      const structXml = await obj.fetchText(
        `/sap/bc/adt/ddic/structures/${encodeURIComponent(key)}`,
      );
      if (structXml) {
        const result: ResolvedType = { comptype: 'S' };

        // Extract description for include DDTEXT
        const descMatch = structXml.match(/adtcore:description="([^"]+)"/);
        if (descMatch) result.description = descMatch[1];

        cache.set(key, result);
        return result;
      }

      // Fallback: assume data element
      const fallback: ResolvedType = { comptype: 'E' };
      cache.set(key, fallback);
      return fallback;
    },
  };
}

type TableSettings = Extract<
  InferTypedSchema<typeof tablesettings>,
  { tableSettings: unknown }
>['tableSettings'];

/**
 * Parse ADT table settings XML into DD09L data for abapGit serialization.
 *
 * Uses the typed `tablesettings` schema from @abapify/adt-schemas to parse
 * the ADT endpoint response (/sap/bc/adt/ddic/db/settings/{name}).
 *
 * Mapping:
 *   tableSettings.sizeCategory       → DD09L.TABKAT
 *   tableSettings.dataClassCategory  → DD09L.TABART
 *   tableSettings.buffering.allowed  → DD09L.BUFALLOW
 *   tableSettings.buffering.type     → DD09L.PUFFERUNG
 *   tableSettings.buffering.areaKeyFields → DD09L.SCHFELDANZ
 *   tableSettings.loggingEnabled     → DD09L.PROTOKOLL
 */
function parseSettingsToDD09L(
  settingsXml: string,
  tableName: string,
): Record<string, string> | undefined {
  let settings: TableSettings;
  try {
    const parsed = tablesettings.parse(settingsXml);
    if (!('tableSettings' in parsed)) return undefined;
    settings = parsed.tableSettings;
  } catch {
    return undefined;
  }

  // Build DD09L in abapGit field order (matches dd09l.xsd sequence)
  const dd09l: Record<string, string> = {};
  dd09l.TABNAME = tableName;
  dd09l.AS4LOCAL = 'A'; // Active version
  if (settings.sizeCategory) dd09l.TABKAT = settings.sizeCategory;
  if (settings.dataClassCategory) dd09l.TABART = settings.dataClassCategory;
  if (settings.buffering?.allowed) dd09l.BUFALLOW = settings.buffering.allowed;

  const bufType = settings.buffering?.type as string | undefined;
  if (bufType) dd09l.PUFFERUNG = bufType;

  const areaKeyFields = settings.buffering?.areaKeyFields;
  if (areaKeyFields && areaKeyFields !== '0') dd09l.SCHFELDANZ = areaKeyFields;

  if (settings.loggingEnabled) dd09l.PROTOKOLL = 'X';

  return dd09l;
}

/**
 * Shared serialize logic for tables and structures.
 * Both use CDS source → DD02V/DD03P mapping.
 */
async function serializeTabl<T extends AdkTable | AdkStructure>(
  obj: T,
  ctx: {
    getObjectName: (obj: T) => string;
    toAbapGitXml: (obj: T) => string;
    createFile: (
      path: string,
      content: string,
    ) => { path: string; content: string };
  },
): Promise<{ path: string; content: string }[]> {
  const objectName = ctx.getObjectName(obj);
  const lang = isoToSapLang(obj.language || undefined);

  // Fetch CDS source from SAP
  let cdsSource: string;
  try {
    cdsSource = await obj.getSource();
  } catch {
    // Fallback: if source fetch fails, produce minimal DD02V only
    const xmlContent = ctx.toAbapGitXml(obj);
    return [ctx.createFile(`${objectName}.tabl.xml`, xmlContent)];
  }

  // Parse CDS source with @abapify/acds
  const { ast, errors } = parse(cdsSource);
  if (errors.length > 0 || ast.definitions.length === 0) {
    // If parsing fails, fall back to minimal DD02V
    const xmlContent = ctx.toAbapGitXml(obj);
    return [ctx.createFile(`${objectName}.tabl.xml`, xmlContent)];
  }

  // Extract table/structure definition from AST
  const def = ast.definitions[0] as TableDefinition | StructureDefinition;

  // Build DD02V from AST annotations
  const dd02v = buildDD02V(def, lang, obj.description ?? '');

  // Create type resolver for named type resolution via ADT
  const resolver = createAdtTypeResolver(obj);

  // Build DD03P from AST field definitions (async for type resolution)
  const dd03pEntries = await buildDD03P(
    def.members,
    def.name.toUpperCase(),
    resolver,
  );

  // Construct the full abapGit values
  const values: Record<string, unknown> = {
    DD02V: stripEmpty(dd02v),
  };

  // Fetch DD09L (technical settings) for tables only
  // Structures don't have technical settings
  if ('getSettings' in obj && typeof obj.getSettings === 'function') {
    try {
      const settingsXml = await (obj as AdkTable).getSettings();
      if (settingsXml) {
        const dd09l = parseSettingsToDD09L(settingsXml, def.name.toUpperCase());
        if (dd09l) {
          values.DD09L = stripEmpty(dd09l);
        }
      }
    } catch {
      // Settings not available (e.g., new table, no ADT endpoint), skip DD09L
    }
  }

  if (dd03pEntries.length > 0) {
    values.DD03P_TABLE = {
      DD03P: dd03pEntries.map((entry) => stripEmpty(entry)),
    };
  }

  // Build the full abapGit XML payload
  const fullPayload = {
    abap: {
      version: '1.0',
      values,
    },
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_TABL',
    serializer_version: 'v1.0.0',
  };

  // Build XML using the schema
  const xml = formatAbapGitXml(
    tabl.build(fullPayload as any, { pretty: true }),
  );

  return [ctx.createFile(`${objectName}.tabl.xml`, xml)];
}

/** Shared fromAbapGit logic for both tables and structures */
function fromAbapGitTabl({ DD02V }: any = {}) {
  return {
    name: (DD02V?.TABNAME ?? '').toUpperCase(),
    type: DD02V?.TABCLASS === 'INTTAB' ? 'TABL/DS' : 'TABL/DT',
    description: DD02V?.DDTEXT,
    language: sapLangToIso(DD02V?.DDLANGUAGE),
    masterLanguage: sapLangToIso(DD02V?.DDLANGUAGE),
  } as { name: string } & Record<string, unknown>;
}

export const tableHandler = createHandler(AdkTable, {
  schema: tabl,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_TABL',
  serializer_version: 'v1.0.0',

  toAbapGit: (obj) => ({
    DD02V: {
      TABNAME: obj.name ?? '',
      DDLANGUAGE: isoToSapLang(obj.language || undefined),
      TABCLASS: 'TRANSP',
      DDTEXT: obj.description ?? '',
    },
  }),

  serialize: (obj, ctx) => serializeTabl(obj, ctx),
  fromAbapGit: fromAbapGitTabl,
});

export const structureHandler = createHandler(AdkStructure, {
  schema: tabl,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_TABL',
  serializer_version: 'v1.0.0',

  toAbapGit: (obj) => ({
    DD02V: {
      TABNAME: obj.name ?? '',
      DDLANGUAGE: isoToSapLang(obj.language || undefined),
      TABCLASS: 'INTTAB',
      DDTEXT: obj.description ?? '',
    },
  }),

  serialize: (obj, ctx) => serializeTabl(obj, ctx),
  fromAbapGit: fromAbapGitTabl,
});
