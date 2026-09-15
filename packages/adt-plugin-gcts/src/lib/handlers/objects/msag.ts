/**
 * MSAG (message class) handler for gCTS / AFF format.
 *
 * Metadata-only (no source): emits `<name>.msag.json` only
 * (metadata per msag-v1.json schema).
 *
 *   {
 *     formatVersion: "1",
 *     header: { description, originalLanguage },
 *     messages: [{ number?: string, text?: string }]
 *   }
 */

import { createHandler } from '../base';
import type { MsagAff } from '../../../schemas/generated';

type MsagLike = {
  name: string;
  description?: string;
  originalLanguage?: string;
  messages?: Array<{ number?: string; text?: string }>;
};

export const messageClassHandler = createHandler('MSAG', {
  toMetadata(obj: MsagLike): MsagAff {
    const lang = (obj.originalLanguage ?? '').toLowerCase();
    return {
      formatVersion: '1',
      header: {
        description: obj.description ?? obj.name ?? '',
        originalLanguage: lang,
      },
      messages: obj.messages ?? [],
    } as MsagAff;
  },

  fromMetadata: (meta: MsagAff) => ({
    name: '',
    description: meta.header.description,
    language: meta.header.originalLanguage?.toUpperCase(),
    masterLanguage: meta.header.originalLanguage?.toUpperCase(),
    messages: meta.messages,
  }),
});
