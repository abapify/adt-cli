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
 */

import {
  parse,
  type TableDefinition,
  type StructureDefinition,
} from '@abapify/acds';
import { AdkTable, AdkStructure } from '../adk';
import { tabl } from '../../../schemas/generated';
import { createHandler } from '../base';
import { isoToSapLang, sapLangToIso } from '../lang';
import { buildDD02V, buildDD03P } from '../cds-to-abapgit';
import type { AdkObject } from '../adk';

/**
 * Strip undefined/empty-string values from an object
 * to avoid emitting empty XML elements
 */
function stripEmpty<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== '') {
      result[key] = value;
    }
  }
  return result as Partial<T>;
}

/**
 * Shared serialize logic for tables and structures.
 * Both use CDS source → DD02V/DD03P mapping.
 */
async function serializeTabl(
  obj: AdkTable | AdkStructure,
  ctx: {
    getObjectName: (obj: AdkObject) => string;
    toAbapGitXml: (obj: AdkObject) => string;
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

  // Build DD03P from AST field definitions
  const dd03pEntries = buildDD03P(def.members, def.name.toUpperCase());

  // Construct the full abapGit values
  const values: Record<string, unknown> = {
    DD02V: stripEmpty(dd02v),
  };

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
  let xml = tabl.build(fullPayload as any, { pretty: true });

  // Format attributes on separate lines for readability
  xml = xml.replace(
    /<([^\s>]+)((?:\s+[^\s=]+="[^"]*")+)\s*(\/?)>/g,
    (match, tag, attrs, selfClose) => {
      const attrList = attrs
        .trim()
        .split(/\s+(?=[^\s=]+=)/)
        .map((a: string) => `\n  ${a}`)
        .join('');
      return `<${tag}${attrList}\n${selfClose ? '/' : ''}>`;
    },
  );

  // Move xmlns:asx from root to asx:abap element (abapGit format convention)
  xml = xml.replace(
    /(<abapGit[^>]*)\s+xmlns:asx="http:\/\/www\.sap\.com\/abapxml"([^>]*>[\s\S]*?)(<asx:abap)/,
    '$1$2$3\n  xmlns:asx="http://www.sap.com/abapxml"',
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
