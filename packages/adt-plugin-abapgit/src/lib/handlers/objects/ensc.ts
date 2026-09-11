/**
 * ENSC (Enhancement Spot Composite) handler for abapGit format
 */

import { ensc } from '../../../schemas/generated';
import { createHandler } from '../base';

type EnhancementSpotCompositeLike = {
  name: string;
  shortText?: string;
  enhSpots?: string[];
  compEnhSpots?: string[];
};

function normalizeItems<T>(raw: T | T[] | undefined): T[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export const enhancementSpotCompositeHandler = createHandler<EnhancementSpotCompositeLike, typeof ensc>(
  'ENSC',
  {
    schema: ensc,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_ENSC',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      SHORTTEXT: obj.shortText,
      ENH_SPOTS: obj.enhSpots?.length
        ? { item: obj.enhSpots.map((s) => ({ ENHSPOTNAME: s })) }
        : undefined,
      COMP_ENH_SPOTS: obj.compEnhSpots?.length
        ? { item: obj.compEnhSpots.map((s) => ({ ENHSPOTNAME: s })) }
        : undefined,
    }),

    fromAbapGit: ({ SHORTTEXT, ENH_SPOTS, COMP_ENH_SPOTS }) => {
      const enhSpots = normalizeItems(ENH_SPOTS?.item);
      const compEnhSpots = normalizeItems(COMP_ENH_SPOTS?.item);
      return {
        name: '',
        shortText: SHORTTEXT,
        enhSpots: enhSpots.map((s) => s.ENHSPOTNAME ?? ''),
        compEnhSpots: compEnhSpots.map((s) => s.ENHSPOTNAME ?? ''),
      };
    },
  },
);
