/**
 * INTF handler for gCTS / AFF format.
 *
 * Projects ADK interface data to the AFF intf-v1.json schema shape:
 *
 *   {
 *     formatVersion: "1",
 *     header: { description, originalLanguage, abapLanguageVersion? },
 *     category?,
 *     proxy?,
 *     descriptions?
 *   }
 */

import { AdkInterface } from '@abapify/adk';
import { createHandler } from '../base';
import type { IntfAff } from '../../../schemas/generated';

export const interfaceHandler = createHandler(AdkInterface, {
  toMetadata(intf): IntfAff {
    const data = intf.dataSync;
    const lang = (data.language ?? data.masterLanguage ?? '').toLowerCase();
    return {
      formatVersion: '1',
      header: {
        description: intf.description ?? data.description ?? '',
        originalLanguage: lang,
        ...(data.abapLanguageVersion && data.abapLanguageVersion !== 'standard'
          ? {
              abapLanguageVersion:
                data.abapLanguageVersion as IntfAff['header']['abapLanguageVersion'],
            }
          : {}),
      },
    };
  },

  getSource: (obj) => obj.getSource(),

  fromMetadata: (meta: IntfAff) => ({
    name: '',
    type: 'INTF/OI',
    description: meta.header.description,
    language: meta.header.originalLanguage?.toUpperCase(),
    masterLanguage: meta.header.originalLanguage?.toUpperCase(),
    abapLanguageVersion: meta.header.abapLanguageVersion,
  }),

  setSources: (intf, sources) => {
    if (sources.main) {
      (intf as unknown as { _pendingSource: string })._pendingSource =
        sources.main;
    }
  },
});
