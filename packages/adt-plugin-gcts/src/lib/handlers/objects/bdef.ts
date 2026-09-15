/**
 * BDEF (RAP behavior definition) handler for gCTS / AFF format.
 *
 * Source-driven: emits `<name>.bdef.abdl` (source) + `<name>.bdef.json`
 * (metadata per bdef-v1.json schema).
 *
 *   {
 *     formatVersion: "1",
 *     header: { description, originalLanguage, abapLanguageVersion? },
 *     extendedBehaviorDefintion?: { name?: string }
 *   }
 */

import { createHandler } from '../base';
import type { BdefAff } from '../../../schemas/generated';

type BdefLike = {
  name: string;
  description?: string;
  originalLanguage?: string;
  abapLanguageVersion?: string;
  getSource?: () => Promise<string> | string;
};

export const behaviorDefinitionHandler = createHandler('BDEF', {
  toMetadata(obj: BdefLike): BdefAff {
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
    } as BdefAff;
  },

  getSource: (obj: BdefLike) =>
    typeof obj.getSource === 'function' ? obj.getSource() : '',

  fromMetadata: (meta: BdefAff) => ({
    name: '',
    description: meta.header.description,
    language: meta.header.originalLanguage?.toUpperCase(),
    masterLanguage: meta.header.originalLanguage?.toUpperCase(),
  }),
});
