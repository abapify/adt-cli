/**
 * ENHC (Enhancement Composite) handler for abapGit format
 */

import { enhc } from '../../../schemas/generated';
import { createHandler, normalizeItems, mapItems, unwrapData } from '../base';

type EnhancementCompositeLike = {
  name: string;
  shortText?: string;
  compositeChilds?: string[];
  enhChilds?: string[];
  longtextId?: string;
};

export const enhancementCompositeHandler = createHandler<
  EnhancementCompositeLike,
  typeof enhc
>('ENHC', {
  schema: enhc,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_ENHC',
  serializer_version: 'v1.0.0',

  toAbapGit: (raw) => {
    const obj = unwrapData<EnhancementCompositeLike>(raw);
    return {
      SHORTTEXT: obj.shortText,
      COMPOSITE_CHILDS: obj.compositeChilds?.length
        ? { item: obj.compositeChilds.map((c) => ({ ENHCOMPOSITENAME: c })) }
        : undefined,
      ENH_CHILDS: obj.enhChilds?.length
        ? { item: obj.enhChilds.map((c) => ({ ENHNAME: c })) }
        : undefined,
      LONGTEXT_ID: obj.longtextId,
    };
  },

  fromAbapGit: ({ SHORTTEXT, COMPOSITE_CHILDS, ENH_CHILDS, LONGTEXT_ID }) => {
    const compositeChilds = normalizeItems(COMPOSITE_CHILDS?.item);
    const enhChilds = normalizeItems(ENH_CHILDS?.item);
    return {
      name: '',
      shortText: SHORTTEXT,
      compositeChilds: mapItems(
        compositeChilds,
        (c) => c.ENHCOMPOSITENAME ?? '',
      ),
      enhChilds: mapItems(enhChilds, (c) => c.ENHNAME ?? ''),
      longtextId: LONGTEXT_ID,
    };
  },
});
