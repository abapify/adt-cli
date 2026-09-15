/**
 * Generic OBJSL-driven object handlers for abapGit format
 *
 * Upstream `zcl_abapgit_objects_generic` serializes every table listed
 * in the OBJSL runtime metadata for the object type as an element named
 * after the table, containing <item> rows with the table's DDIC fields.
 * The table list is SAP runtime metadata, so these handlers use a
 * wildcard schema and map a `tables` record (table name → rows)
 * directly onto the XML payload.
 */

import type { AbapGitSchema } from '../base';
import { createHandler, unwrapData } from '../base';
import {
  aifc,
  aqbg,
  aqqu,
  aqsg,
  asfc,
  g4ba,
  g4bs,
  iwmo,
  iwom,
  iwpr,
  iwsg,
  iwsv,
  iwvb,
  sldd,
  sobj,
  sppf,
  ueno,
  wapa,
  wdyn,
} from '../../../schemas/generated';

type GenericObjslObject = {
  name: string;
  /** Table name → table rows ({ item: [...] } or row list) */
  tables?: Record<string, unknown>;
};

function createGenericObjslHandler<
  TSchema extends AbapGitSchema<unknown, unknown>,
>(type: string, schema: TSchema) {
  return createHandler<GenericObjslObject, TSchema>(type, {
    schema,
    version: 'v1.0.0',
    serializer: `LCL_OBJECT_${type}`,
    serializer_version: 'v1.0.0',

    toAbapGit: (raw) => {
      const obj = unwrapData<GenericObjslObject>(raw);
      return { ...(obj.tables ?? {}) };
    },

    fromAbapGit: (values) => ({
      name: '',
      tables: { ...(values as Record<string, unknown>) },
    }),
  });
}

export const aifcHandler = createGenericObjslHandler('AIFC', aifc);
export const aqbgHandler = createGenericObjslHandler('AQBG', aqbg);
export const aqquHandler = createGenericObjslHandler('AQQU', aqqu);
export const aqsgHandler = createGenericObjslHandler('AQSG', aqsg);
export const asfcHandler = createGenericObjslHandler('ASFC', asfc);
export const g4baHandler = createGenericObjslHandler('G4BA', g4ba);
export const g4bsHandler = createGenericObjslHandler('G4BS', g4bs);
export const iwmoHandler = createGenericObjslHandler('IWMO', iwmo);
export const iwomHandler = createGenericObjslHandler('IWOM', iwom);
export const iwprHandler = createGenericObjslHandler('IWPR', iwpr);
export const iwsgHandler = createGenericObjslHandler('IWSG', iwsg);
export const iwsvHandler = createGenericObjslHandler('IWSV', iwsv);
export const iwvbHandler = createGenericObjslHandler('IWVB', iwvb);
export const slddHandler = createGenericObjslHandler('SLDD', sldd);
export const sobjHandler = createGenericObjslHandler('SOBJ', sobj);
export const sppfHandler = createGenericObjslHandler('SPPF', sppf);
export const uenoHandler = createGenericObjslHandler('UENO', ueno);

// WAPA (BSP application) and WDYN (Web Dynpro component) serialize
// arbitrary SAP structures (O2*/WDY_* DDIC types not available at
// compile time), so they use the same wildcard payload.
export const wapaHandler = createGenericObjslHandler('WAPA', wapa);
export const wdynHandler = createGenericObjslHandler('WDYN', wdyn);
