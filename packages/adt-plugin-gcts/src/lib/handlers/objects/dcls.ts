/**
 * DCLS (CDS access control) handler for gCTS / AFF format.
 *
 * Source-driven: emits `<name>.dcls.asdcls` (source) + `<name>.dcls.json`
 * (metadata per dcls-v1.json schema).
 *
 *   {
 *     formatVersion: "1",
 *     header: { description, originalLanguage, abapLanguageVersion? }
 *   }
 */

import { createHandler } from '../base';
import type { DclsAff } from '../../../schemas/generated';

type DclsLike = {
  name: string;
  description?: string;
  originalLanguage?: string;
  abapLanguageVersion?: string;
  getSource?: () => Promise<string> | string;
};

export const dclSourceHandler = createHandler('DCLS', {
  toMetadata(obj: DclsLike): DclsAff {
    const lang = (obj.originalLanguage ?? '').toLowerCase();
    return {
      formatVersion: '1',
      header: {
        description: obj.description ?? obj.name ?? '',
        originalLanguage: lang,
        ...(obj.abapLanguageVersion
          ? { abapLanguageVersion: obj.abapLanguageVersion }
          : {}),
      },
    } as DclsAff;
  },

  getSource: (obj: DclsLike) =>
    typeof obj.getSource === 'function' ? obj.getSource() : '',

  fromMetadata: (meta: DclsAff) => ({
    name: '',
    description: meta.header.description,
    language: meta.header.originalLanguage?.toUpperCase(),
    masterLanguage: meta.header.originalLanguage?.toUpperCase(),
  }),
});
