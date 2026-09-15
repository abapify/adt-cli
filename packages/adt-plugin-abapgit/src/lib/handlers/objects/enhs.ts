/**
 * ENHS (Enhancement Spot) object handler for abapGit format
 *
 * Enhancement spots are XML-based with two tool sub-types:
 *   - BADI_DEF: BAdI definition spot (defines BAdI interfaces)
 *   - HOOK_DEF: Hook definition spot (defines hook points)
 *
 * File layout:
 *   src/zfoo.enhs.xml — metadata (TOOL, SHORTTEXT, PARENT_COMP, BADI_DATA)
 *
 * BADI_DATA structure differs by tool type:
 *   - BADI_DEF: table of BAdI definitions (BADI_NAME, INTERFACE, etc.)
 *   - HOOK_DEF: single structure (PGMID, OBJ_NAME, DEF_HOOKS, etc.)
 */

import { enhs } from '../../../schemas/generated';
import { createHandler, normalizeItems } from '../base';

type BadiDefinition = {
  BADI_NAME?: string;
  BADI_SHORTTEXT?: string;
  INTERFACE?: string;
  INSTANTIATION?: string;
  MULTIPLE_USE?: string;
  FILTERS?: unknown;
};

type HookDefinition = {
  PGMID?: string;
  OBJ_NAME?: string;
  OBJ_TYPE?: string;
  MAIN_TYPE?: string;
  MAIN_NAME?: string;
  PROGRAM?: string;
  DEF_HOOKS?: unknown;
};

type EnhancementSpotLike = {
  name: string;
  description?: string;
  tool?: string;
  parentComposite?: string;
  abapLanguageVersion?: string;
  badiDefinitions?: BadiDefinition[];
  hookDefinition?: HookDefinition;
};

export const enhancementSpotHandler = createHandler<
  EnhancementSpotLike,
  typeof enhs
>('ENHS', {
  schema: enhs,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_ENHS',
  serializer_version: 'v1.0.0',

  toAbapGit: (obj) => {
    const tool = obj.tool || 'BADI_DEF';
    const result: Record<string, unknown> = {
      TOOL: tool,
      SHORTTEXT: obj.description ?? '',
    };

    if (obj.parentComposite) {
      result.PARENT_COMP = obj.parentComposite;
    }
    if (obj.abapLanguageVersion) {
      result.ABAP_LANGUAGE_VERSION = obj.abapLanguageVersion;
    }

    if (tool === 'BADI_DEF' && obj.badiDefinitions?.length) {
      result.BADI_DATA = {
        item: obj.badiDefinitions.map((b) => ({
          BADI_NAME: b.BADI_NAME,
          BADI_SHORTTEXT: b.BADI_SHORTTEXT,
          INTERFACE: b.INTERFACE,
          INSTANTIATION: b.INSTANTIATION,
          MULTIPLE_USE: b.MULTIPLE_USE,
          FILTERS: b.FILTERS,
        })),
      };
    } else if (tool === 'HOOK_DEF' && obj.hookDefinition) {
      result.BADI_DATA = {
        PGMID: obj.hookDefinition.PGMID,
        OBJ_NAME: obj.hookDefinition.OBJ_NAME,
        OBJ_TYPE: obj.hookDefinition.OBJ_TYPE,
        MAIN_TYPE: obj.hookDefinition.MAIN_TYPE,
        MAIN_NAME: obj.hookDefinition.MAIN_NAME,
        PROGRAM: obj.hookDefinition.PROGRAM,
        DEF_HOOKS: obj.hookDefinition.DEF_HOOKS,
      };
    }

    return result;
  },

  fromAbapGit: ({
    TOOL,
    SHORTTEXT,
    PARENT_COMP,
    BADI_DATA,
    ABAP_LANGUAGE_VERSION,
  }) => {
    const tool = TOOL || 'BADI_DEF';
    const result: { name: string } & Record<string, unknown> = {
      name: '', // ENHS name comes from filename, not XML content
      description: SHORTTEXT,
      tool,
      parentComposite: PARENT_COMP,
      abapLanguageVersion: ABAP_LANGUAGE_VERSION,
    };

    const badiData = BADI_DATA as
      | ({ item?: BadiDefinition | BadiDefinition[] } & HookDefinition)
      | undefined;
    if (tool === 'BADI_DEF' && badiData) {
      result.badiDefinitions = normalizeItems(badiData.item);
    } else if (tool === 'HOOK_DEF' && badiData) {
      result.hookDefinition = {
        PGMID: badiData.PGMID,
        OBJ_NAME: badiData.OBJ_NAME,
        OBJ_TYPE: badiData.OBJ_TYPE,
        MAIN_TYPE: badiData.MAIN_TYPE,
        MAIN_NAME: badiData.MAIN_NAME,
        PROGRAM: badiData.PROGRAM,
        DEF_HOOKS: badiData.DEF_HOOKS,
      };
    }

    return result;
  },
});
