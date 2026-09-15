/**
 * DDLS (CDS view) handler for gCTS / AFF format.
 *
 * Source-driven: emits `<name>.ddls.asddls` (source) + `<name>.ddls.json`
 * (metadata per ddls-v1.json schema).
 *
 *   {
 *     formatVersion: "1",
 *     header: { description, originalLanguage, abapLanguageVersion? },
 *     sourceOrigin: "abapDevelopmentTools" (required),
 *     sourceType: "unknown" (required),
 *     parentName?: string
 *   }
 */

import { createHandler } from '../base';
import type { DdlsAff } from '../../../schemas/generated';

type DdlsLike = {
  name: string;
  description?: string;
  originalLanguage?: string;
  abapLanguageVersion?: string;
  sourceOrigin?: string;
  sourceType?: string;
  getSource?: () => Promise<string> | string;
};

export const ddlSourceHandler = createHandler('DDLS', {
  toMetadata(obj: DdlsLike): DdlsAff {
    const lang = (obj.originalLanguage ?? '').toLowerCase();
    const meta: Record<string, unknown> = {
      formatVersion: '1',
      header: {
        description: obj.description ?? obj.name ?? '',
        originalLanguage: lang,
        ...(obj.abapLanguageVersion
          ? { abapLanguageVersion: obj.abapLanguageVersion }
          : {}),
      },
      sourceOrigin: obj.sourceOrigin ?? 'abapDevelopmentTools',
      sourceType: obj.sourceType ?? 'unknown',
    };
    return meta as DdlsAff;
  },

  getSource: (obj: DdlsLike) =>
    typeof obj.getSource === 'function' ? obj.getSource() : '',

  fromMetadata: (meta: DdlsAff) => ({
    name: '',
    description: meta.header.description,
    language: meta.header.originalLanguage?.toUpperCase(),
    masterLanguage: meta.header.originalLanguage?.toUpperCase(),
    sourceOrigin: meta.sourceOrigin,
    sourceType: meta.sourceType,
  }),
});
