/**
 * IEXT (IDoc Extension) handler for abapGit format
 */

import { iext } from '../../../schemas/generated';
import { createHandler, normalizeItems, mapItems } from '../base';

type IdocExtensionLike = {
  name: string;
  idocType?: string;
  cimType?: string;
  description?: string;
  syntax?: Array<{ segment?: string }>;
};

export const idocExtensionHandler = createHandler<
  IdocExtensionLike,
  typeof iext
>('IEXT', {
  schema: iext,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_IEXT',
  serializer_version: 'v1.0.0',

  toAbapGit: (obj) => ({
    IEXT: {
      ATTRIBUTES: {
        EXTTYPE: String(obj.name ?? '').toUpperCase(),
        IDOCTYP: obj.idocType,
        CIMTYP: obj.cimType,
        DESCRP: obj.description,
      },
      T_SYNTAX: obj.syntax?.length
        ? {
            item: obj.syntax.map((s) => ({
              EXTTYPE: String(obj.name ?? '').toUpperCase(),
              SEGMENT: s.segment,
            })),
          }
        : undefined,
    },
  }),

  fromAbapGit: ({ IEXT }) => {
    const syntax = normalizeItems(IEXT?.T_SYNTAX?.item);
    return {
      name: (IEXT?.ATTRIBUTES?.EXTTYPE ?? '').toUpperCase(),
      idocType: IEXT?.ATTRIBUTES?.IDOCTYP,
      cimType: IEXT?.ATTRIBUTES?.CIMTYP,
      description: IEXT?.ATTRIBUTES?.DESCRP,
      syntax: mapItems(syntax, (s) => ({ segment: s.SEGMENT })),
    };
  },
});
