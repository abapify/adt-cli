/**
 * SRVD (RAP service definition) handler for gCTS / AFF format.
 *
 * Source-driven: emits `<name>.srvd.acds` (source) + `<name>.srvd.json`
 * (metadata per srvd-v1.json schema).
 *
 *   {
 *     formatVersion: "1",
 *     header: { description, originalLanguage, abapLanguageVersion? },
 *     generalInformation: { sourceOrigin, sourceType }
 *   }
 */

import { createHandler } from '../base';
import type { SrvdAff } from '../../../schemas/generated';

type SrvdLike = {
  name: string;
  description?: string;
  originalLanguage?: string;
  abapLanguageVersion?: string;
  sourceOrigin?: string;
  sourceType?: string;
  getSource?: () => Promise<string> | string;
};

export const serviceDefinitionHandler = createHandler('SRVD', {
  toMetadata(obj: SrvdLike): SrvdAff {
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
      generalInformation: {
        sourceOrigin: obj.sourceOrigin ?? 'abapDevelopmentTools',
        sourceType: obj.sourceType ?? 'definition',
      },
    } as SrvdAff;
  },

  getSource: (obj: SrvdLike) =>
    typeof obj.getSource === 'function' ? obj.getSource() : '',

  fromMetadata: (meta: SrvdAff) => ({
    name: '',
    description: meta.header.description,
    language: meta.header.originalLanguage?.toUpperCase(),
    masterLanguage: meta.header.originalLanguage?.toUpperCase(),
    sourceOrigin: meta.generalInformation.sourceOrigin,
    sourceType: meta.generalInformation.sourceType,
  }),
});
