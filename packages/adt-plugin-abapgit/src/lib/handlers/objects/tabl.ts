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

import { AdkTable, AdkStructure } from '../adk';
import { tabl } from '../../../schemas/generated';
import { createHandler } from '../base';
import { isoToSapLang } from '../lang';
import { serializeTabl, fromAbapGitTabl } from './tabl-serialize';

export const tableHandler = createHandler(AdkTable, {
  schema: tabl,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_TABL',
  serializer_version: 'v1.0.0',

  toAbapGit: (obj) => ({
    DD02V: {
      TABNAME: obj.name ?? '',
      DDLANGUAGE: isoToSapLang((obj as any).language || undefined),
      TABCLASS: 'TRANSP',
      DDTEXT: (obj as any).description ?? '',
    },
  }),

  serialize: (obj, ctx, options) => serializeTabl(obj as any, ctx, options),
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
      DDLANGUAGE: isoToSapLang((obj as any).language || undefined),
      TABCLASS: 'INTTAB',
      DDTEXT: (obj as any).description ?? '',
    },
  }),

  serialize: (obj, ctx, options) => serializeTabl(obj as any, ctx, options),
  fromAbapGit: fromAbapGitTabl,
});
