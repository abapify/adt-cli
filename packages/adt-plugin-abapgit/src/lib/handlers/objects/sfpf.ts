/**
 * SFPF (Form Object) handler for abapGit format
 *
 * SAP Interactive Forms objects are XML-only. The abapGit format stores
 * the form header and the XDP layout (raw XML content).
 */

import { sfpf } from '../../../schemas/generated';
import { createHandler } from '../base';
import { isoToSapLang, sapLangToIso } from '../lang';

type FormObjectLike = {
  name: string;
  description?: string;
  state?: string;
  language?: string;
  type?: string;
  layout?: string;
};

export const formObjectHandler = createHandler<FormObjectLike, typeof sfpf>(
  'SFPF',
  {
    schema: sfpf,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_SFPF',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      SFPF: {
        HEADER: {
          NAME: String(obj.name ?? '').toUpperCase(),
          STATE: obj.state,
          LANGUAGE: isoToSapLang(obj.language),
          TYPE: obj.type,
          DESCRIPTION: obj.description,
        },
        LAYOUT: obj.layout
          ? {
              NAME: String(obj.name ?? '').toUpperCase(),
              XDP: obj.layout,
            }
          : undefined,
      },
    }),

    fromAbapGit: ({ SFPF }) => ({
      name: (SFPF?.HEADER?.NAME ?? '').toUpperCase(),
      description: SFPF?.HEADER?.DESCRIPTION,
      state: SFPF?.HEADER?.STATE,
      language: sapLangToIso(SFPF?.HEADER?.LANGUAGE),
      type: SFPF?.HEADER?.TYPE,
      layout: SFPF?.LAYOUT?.XDP,
    }),
  },
);
