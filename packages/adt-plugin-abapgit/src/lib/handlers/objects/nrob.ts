/**
 * NROB (Number Range Object) handler for abapGit format
 *
 * Number range objects are XML-only (no source code). The abapGit format
 * stores attributes (object, domain, buffering) and text only.
 * Intervals are NOT serialized by abapGit (managed via SAP function modules).
 */

import { nrob } from '../../../schemas/generated';
import { createHandler } from '../base';
import { isoToSapLang, sapLangToIso } from '../lang';

type NumberRangeObjectLike = {
  name: string;
  description?: string;
  shortText?: string;
  language?: string;
  masterLanguage?: string;
  domainLength?: string;
  percentage?: string;
  buffer?: boolean;
  noivbuffer?: string;
};

export const numberRangeObjectHandler = createHandler<
  NumberRangeObjectLike,
  typeof nrob
>('NROB', {
  schema: nrob,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_NROB',
  serializer_version: 'v1.0.0',

  toAbapGit: (obj) => {
    const name = String(obj.name ?? '').toUpperCase();
    return {
      ATTRIBUTES: {
        OBJECT: name,
        DOMLEN: obj.domainLength,
        PERCENTAGE: obj.percentage,
        BUFFER: obj.buffer ? 'X' : undefined,
        NOIVBUFFER: obj.noivbuffer,
      },
      TEXT: {
        LANGU: isoToSapLang(obj.masterLanguage || obj.language),
        OBJECT: name,
        TXT: obj.description ?? '',
        TXTSHORT: obj.shortText ?? '',
      },
    };
  },

  fromAbapGit: ({ ATTRIBUTES, TEXT }) => ({
    name: (ATTRIBUTES?.OBJECT ?? '').toUpperCase(),
    description: TEXT?.TXT,
    shortText: TEXT?.TXTSHORT,
    language: sapLangToIso(TEXT?.LANGU),
    masterLanguage: sapLangToIso(TEXT?.LANGU),
    domainLength: ATTRIBUTES?.DOMLEN,
    percentage: ATTRIBUTES?.PERCENTAGE,
    buffer: ATTRIBUTES?.BUFFER === 'X',
    noivbuffer: ATTRIBUTES?.NOIVBUFFER,
  }),
});
