/**
 * SKTD (Knowledge Transfer Document) handler for abapGit format
 *
 * KTD objects are XML-only. The abapGit format stores metadata and
 * reference object info under a single SKTD node.
 */

import { sktd } from '../../../schemas/generated';
import { createHandler } from '../base';
import { sapLangToIso, isoToSapLang } from '../lang';

type KtdDocumentLike = {
  name: string;
  description?: string;
  masterLanguage?: string;
  responsible?: string;
  refObjectUri?: string;
  refObjectDescription?: string;
};

export const ktdDocumentHandler = createHandler<KtdDocumentLike, typeof sktd>(
  'SKTD',
  {
    schema: sktd,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_SKTD',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      SKTD: {
        METADATA: {
          MASTER_LANGUAGE: isoToSapLang(obj.masterLanguage),
          RESPONSIBLE: obj.responsible,
        },
        REF_OBJECT: {
          URI: obj.refObjectUri,
          DESCRIPTION: obj.refObjectDescription,
        },
      },
    }),

    fromAbapGit: ({ SKTD }) => ({
      name: '',
      description: SKTD?.REF_OBJECT?.DESCRIPTION,
      masterLanguage: sapLangToIso(SKTD?.METADATA?.MASTER_LANGUAGE),
      responsible: SKTD?.METADATA?.RESPONSIBLE,
      refObjectUri: SKTD?.REF_OBJECT?.URI,
      refObjectDescription: SKTD?.REF_OBJECT?.DESCRIPTION,
    }),
  },
);
