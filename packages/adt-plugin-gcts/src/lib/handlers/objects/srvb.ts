/**
 * SRVB (RAP service binding) handler for gCTS / AFF format.
 *
 * Metadata-only (no source): emits `<name>.srvb.json` only
 * (metadata per srvb-v1.json schema).
 *
 *   {
 *     formatVersion: "1",
 *     header: { description, originalLanguage, abapLanguageVersion? },
 *     bindingType: string (required),
 *     bindingTypeCategory: "ui" | "webApi" (required),
 *     services: [{ name, versions: [{ serviceVersion, serviceDefinition }] }]
 *   }
 */

import { createHandler } from '../base';
import type { SrvbAff } from '../../../schemas/generated';

type SrvbLike = {
  name: string;
  description?: string;
  originalLanguage?: string;
  abapLanguageVersion?: string;
  bindingType?: string;
  bindingTypeCategory?: string;
  services?: Array<{
    name: string;
    versions: Array<{
      serviceVersion: string;
      serviceBuildVersion?: string;
      serviceDefinition: string;
    }>;
  }>;
};

export const serviceBindingHandler = createHandler('SRVB', {
  toMetadata(obj: SrvbLike): SrvbAff {
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
      bindingType: obj.bindingType ?? '',
      bindingTypeCategory: (obj.bindingTypeCategory as 'ui' | 'webApi') ?? 'ui',
      services: obj.services ?? [],
    } as SrvbAff;
  },

  fromMetadata: (meta: SrvbAff) => ({
    name: '',
    description: meta.header.description,
    language: meta.header.originalLanguage?.toUpperCase(),
    masterLanguage: meta.header.originalLanguage?.toUpperCase(),
    bindingType: meta.bindingType,
    bindingTypeCategory: meta.bindingTypeCategory,
    services: meta.services,
  }),
});
