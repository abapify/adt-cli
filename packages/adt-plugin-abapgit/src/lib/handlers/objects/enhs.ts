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
import { createHandler } from '../base';

type BadiDefinition = {
  BADI_NAME?: string;
  BADI_SHORTTEXT?: string;
  INTERFACE?: string;
  INSTANTIATION?: string;
  MULTIPLE_USE?: string;
};

type HookDefinition = {
  PGMID?: string;
  OBJ_NAME?: string;
  OBJ_TYPE?: string;
  MAIN_TYPE?: string;
  MAIN_NAME?: string;
  PROGRAM?: string;
};

type EnhancementSpotLike = {
  name: string;
  description?: string;
  tool?: string;
  parentComposite?: string;
  badiDefinitions?: BadiDefinition[];
  hookDefinition?: HookDefinition;
};

function normalizeItems<T>(raw: T | T[] | undefined): T[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function parseEnhancementSpotFromAbapGit({
  TOOL,
  SHORTTEXT,
  PARENT_COMP,
  BADI_DATA,
}: {
  TOOL?: string;
  SHORTTEXT?: string;
  PARENT_COMP?: string;
  BADI_DATA?:
    | { item?: BadiDefinition | BadiDefinition[] }
    | HookDefinition
    | Record<string, unknown>;
}): { name: string } & Record<string, unknown> {
  const tool = TOOL || 'BADI_DEF';
  const result: { name: string } & Record<string, unknown> = {
    name: '', // ENHS name comes from filename, not XML content
    description: SHORTTEXT,
    tool,
    parentComposite: PARENT_COMP,
  };

  if (tool === 'BADI_DEF' && BADI_DATA && typeof BADI_DATA === 'object') {
    // BADI_DATA is a table of BAdI definitions
    const items = (BADI_DATA as { item?: BadiDefinition | BadiDefinition[] })
      .item;
    result.badiDefinitions = normalizeItems(items);
  } else if (tool === 'HOOK_DEF' && BADI_DATA && typeof BADI_DATA === 'object') {
    // BADI_DATA is a single hook definition structure
    const hookData = BADI_DATA as HookDefinition;
    result.hookDefinition = {
      PGMID: hookData.PGMID,
      OBJ_NAME: hookData.OBJ_NAME,
      OBJ_TYPE: hookData.OBJ_TYPE,
      MAIN_TYPE: hookData.MAIN_TYPE,
      MAIN_NAME: hookData.MAIN_NAME,
      PROGRAM: hookData.PROGRAM,
    };
  }

  return result;
}

function buildEnhancementSpotToAbapGit(obj: EnhancementSpotLike) {
  const tool = obj.tool || 'BADI_DEF';
  const result: Record<string, unknown> = {
    TOOL: tool,
    SHORTTEXT: obj.description ?? '',
  };

  if (obj.parentComposite) {
    result.PARENT_COMP = obj.parentComposite;
  }

  if (tool === 'BADI_DEF' && obj.badiDefinitions?.length) {
    result.BADI_DATA = {
      item: obj.badiDefinitions.map((b) => ({
        BADI_NAME: b.BADI_NAME,
        BADI_SHORTTEXT: b.BADI_SHORTTEXT,
        INTERFACE: b.INTERFACE,
        INSTANTIATION: b.INSTANTIATION,
        MULTIPLE_USE: b.MULTIPLE_USE,
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
    };
  }

  return result;
}

export const enhancementSpotHandler = createHandler<
  EnhancementSpotLike,
  typeof enhs
>('ENHS', {
  schema: enhs,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_ENHS',
  serializer_version: 'v1.0.0',

  toAbapGit: buildEnhancementSpotToAbapGit,
  fromAbapGit: parseEnhancementSpotFromAbapGit,
});
