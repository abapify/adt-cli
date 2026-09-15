/**
 * ENHO (Enhancement Implementation) object handler for abapGit format
 *
 * Enhancement implementations are XML-based with multiple tool sub-types:
 *   - BADI_IMPL: BAdI implementation (most common, ADK-supported via AdkBadi)
 *   - HOOK_IMPL: Hook implementation (source-driven)
 *   - CLASS: Class enhancement (source-driven)
 *   - INTF: Interface enhancement
 *   - WDYC: Web Dynpro component enhancement
 *   - FUGR: Function group enhancement
 *   - WDYN: Web Dynpro application enhancement
 *
 * File layout:
 *   src/zfoo.enho.xml  — metadata (TOOL, SHORTTEXT, IMPL/ENHANCEMENTS, etc.)
 *   src/zfoo.enho.abap — source (for HOOK_IMPL, CLASS sub-types)
 */

import { enho } from '../../../schemas/generated';
import { createHandler, normalizeItems } from '../base';

type BadiImplData = {
  SPOT_NAME?: string;
  BADI_NAME?: string;
  IMPL_NAME?: string;
  IMPL_CLASS?: string;
  ACTIVE?: string;
  IMPL_SHORTTEXT?: string;
  IMPL_SHORTTEXT_ID?: string;
  LOCKED_IN_CUSTOMIZING?: string;
  FILTER_ROOT?: unknown;
  FILTER_VALUES?: unknown;
  FILTERS?: unknown;
};

type BadiImplLike = {
  spotName?: string;
  badiName?: string;
  implName?: string;
  implClass?: string;
  active?: boolean;
  implShorttext?: string;
  implShorttextId?: string;
  lockedInCustomizing?: boolean;
  filterRoot?: unknown;
  filterValues?: unknown;
  filters?: unknown;
};

type EnhancementImplementationLike = {
  name: string;
  description?: string;
  tool?: string;
  spotName?: string;
  badiName?: string;
  implName?: string;
  implClass?: string;
  active?: boolean;
  implShorttext?: string;
  implShorttextId?: string;
  lockedInCustomizing?: boolean;
  filterRoot?: unknown;
  filterValues?: unknown;
  filters?: unknown;
  impls?: BadiImplLike[];
  originalObject?: {
    pgmid?: string;
    objType?: string;
    objName?: string;
    mainType?: string;
    mainName?: string;
    programName?: string;
  };
  enhancements?: unknown;
  files?: unknown;
  sotr?: unknown;
  sotrUse?: unknown;
  getSource?: () => Promise<string> | string;
};

export const enhancementImplementationHandler = createHandler<
  EnhancementImplementationLike,
  typeof enho
>('ENHO', {
  schema: enho,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_ENHO',
  serializer_version: 'v1.0.0',

  toAbapGit: (obj) => {
    const tool = obj.tool || 'BADI_IMPL';
    const result: Record<string, unknown> = {
      TOOL: tool,
      SHORTTEXT: obj.description ?? '',
    };

    if (tool === 'BADI_IMPL') {
      const toImplXml = (i: BadiImplLike): BadiImplData => ({
        SPOT_NAME: i.spotName,
        BADI_NAME: i.badiName,
        IMPL_NAME: i.implName,
        IMPL_CLASS: i.implClass,
        ACTIVE: i.active ? 'X' : undefined,
        IMPL_SHORTTEXT: i.implShorttext,
        IMPL_SHORTTEXT_ID: i.implShorttextId,
        LOCKED_IN_CUSTOMIZING: i.lockedInCustomizing ? 'X' : undefined,
        FILTER_ROOT: i.filterRoot,
        FILTER_VALUES: i.filterValues,
        FILTERS: i.filters,
      });
      const impls = obj.impls?.length ? obj.impls : [obj];
      result.SPOT_NAME = obj.spotName;
      result.IMPL = { ENH_BADI_IMPL_DATA: impls.map(toImplXml) };
    } else if (obj.originalObject) {
      result.ORIGINAL_OBJECT = {
        PGMID: obj.originalObject.pgmid ?? 'R3TR',
        ORG_OBJ_TYPE: obj.originalObject.objType,
        ORG_OBJ_NAME: obj.originalObject.objName,
        ORG_MAIN_TYPE: obj.originalObject.mainType,
        ORG_MAIN_NAME: obj.originalObject.mainName,
        PROGRAMNAME: obj.originalObject.programName,
      };
    }

    // Pass through enhancement metadata shared by all tool sub-types
    result.ENHANCEMENTS = obj.enhancements;
    result.FILES = obj.files;
    result.SOTR = obj.sotr;
    result.SOTR_USE = obj.sotrUse;

    return result;
  },

  fromAbapGit: ({
    TOOL,
    SHORTTEXT,
    SPOT_NAME,
    IMPL,
    ORIGINAL_OBJECT,
    ENHANCEMENTS,
    FILES,
    SOTR,
    SOTR_USE,
  }) => {
    const implRows = normalizeItems(
      (
        IMPL as
          { ENH_BADI_IMPL_DATA?: BadiImplData | BadiImplData[] } | undefined
      )?.ENH_BADI_IMPL_DATA,
    );
    const implData = implRows[0];
    return {
      name: '', // ENHO name comes from filename, not XML content
      description: SHORTTEXT,
      tool: TOOL,
      spotName: SPOT_NAME || implData?.SPOT_NAME,
      badiName: implData?.BADI_NAME,
      implName: implData?.IMPL_NAME,
      implClass: implData?.IMPL_CLASS,
      active: implData?.ACTIVE === 'X',
      implShorttext: implData?.IMPL_SHORTTEXT,
      implShorttextId: implData?.IMPL_SHORTTEXT_ID,
      lockedInCustomizing: implData?.LOCKED_IN_CUSTOMIZING === 'X',
      filterRoot: implData?.FILTER_ROOT,
      filterValues: implData?.FILTER_VALUES,
      filters: implData?.FILTERS,
      impls: implRows.map((i) => ({
        spotName: i.SPOT_NAME,
        badiName: i.BADI_NAME,
        implName: i.IMPL_NAME,
        implClass: i.IMPL_CLASS,
        active: i.ACTIVE === 'X',
        implShorttext: i.IMPL_SHORTTEXT,
        implShorttextId: i.IMPL_SHORTTEXT_ID,
        lockedInCustomizing: i.LOCKED_IN_CUSTOMIZING === 'X',
        filterRoot: i.FILTER_ROOT,
        filterValues: i.FILTER_VALUES,
        filters: i.FILTERS,
      })),
      originalObject: ORIGINAL_OBJECT
        ? {
            pgmid: ORIGINAL_OBJECT.PGMID,
            objType: ORIGINAL_OBJECT.ORG_OBJ_TYPE,
            objName: ORIGINAL_OBJECT.ORG_OBJ_NAME,
            mainType: ORIGINAL_OBJECT.ORG_MAIN_TYPE,
            mainName: ORIGINAL_OBJECT.ORG_MAIN_NAME,
            programName: ORIGINAL_OBJECT.PROGRAMNAME,
          }
        : undefined,
      enhancements: ENHANCEMENTS,
      files: FILES,
      sotr: SOTR,
      sotrUse: SOTR_USE,
    };
  },

  // HOOK_IMPL / CLASS enhancements carry .enho.abap source
  getSource: (obj) => Promise.resolve(obj.getSource?.() ?? ''),
});
