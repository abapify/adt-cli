/**
 * PDTS (Process/Task Definition Standard) handler for abapGit format
 *
 * Note: upstream also embeds a raw CONTAINER XML element (workflow container).
 * The typed schema covers the PDTS header payload.
 */

import { pdts } from '../../../schemas/generated';
import { createHandler, unwrapData } from '../base';

type PdtsLike = {
  name: string;
  otype?: string;
  short?: string;
  stext?: string;
};

export const pdtsHandler = createHandler<PdtsLike, typeof pdts>('PDTS', {
  schema: pdts,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_PDTS',
  serializer_version: 'v1.0.0',

  toAbapGit: (raw) => {
    const obj = unwrapData<PdtsLike>(raw);
    return {
      PDTS: {
        HEADER: {
          OTYPE: obj.otype ?? 'TS',
          OBJID: String(obj.name ?? '').toUpperCase(),
          SHORT: obj.short,
          STEXT: obj.stext,
        },
      },
    };
  },

  fromAbapGit: ({ PDTS }) => ({
    name: (PDTS?.HEADER?.OBJID ?? '').toUpperCase(),
    otype: PDTS?.HEADER?.OTYPE,
    short: PDTS?.HEADER?.SHORT,
    stext: PDTS?.HEADER?.STEXT,
  }),
});
