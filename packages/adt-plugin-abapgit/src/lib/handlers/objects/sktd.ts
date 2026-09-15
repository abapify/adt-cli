/**
 * SKTD (Knowledge Transfer Document) handler for abapGit format
 *
 * KTD objects are XML-only. The abapGit format stores metadata and
 * reference object info under a single SKTD node.
 */

import { sktd } from '../../../schemas/generated';
import { createHandler, unwrapData } from '../base';
import {
  abapLangVerFromAdt,
  abapLangVerToAdt,
  isoToSapLang,
  sapLangToIso,
} from '../lang';

type KtdDocumentLike = {
  name: string;
  description?: string;
  masterLanguage?: string;
  responsible?: string;
  abapLanguageVersion?: string;
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

    toAbapGit: (raw) => {
      const obj = unwrapData<KtdDocumentLike>(raw);
      return {
        SKTD: {
          METADATA: {
            MASTER_LANGUAGE: isoToSapLang(obj.masterLanguage),
            RESPONSIBLE: obj.responsible,
            ABAP_LANGUAGE_VERSION: abapLangVerFromAdt(obj.abapLanguageVersion),
          },
          REF_OBJECT: {
            URI: obj.refObjectUri,
            DESCRIPTION: obj.refObjectDescription ?? obj.description,
          },
        },
      };
    },

    fromAbapGit: ({ SKTD }) => ({
      name: '',
      description: SKTD?.REF_OBJECT?.DESCRIPTION,
      masterLanguage: sapLangToIso(SKTD?.METADATA?.MASTER_LANGUAGE),
      responsible: SKTD?.METADATA?.RESPONSIBLE,
      abapLanguageVersion: abapLangVerToAdt(
        SKTD?.METADATA?.ABAP_LANGUAGE_VERSION,
      ),
      refObjectUri: SKTD?.REF_OBJECT?.URI,
      refObjectDescription: SKTD?.REF_OBJECT?.DESCRIPTION,
    }),
  },
);
