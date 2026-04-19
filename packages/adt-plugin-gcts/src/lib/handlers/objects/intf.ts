/**
 * INTF handler for gCTS / AFF format.
 */
import { AdkInterface } from '@abapify/adk';
import { createHandler } from '../base';

export const interfaceHandler = createHandler(AdkInterface, {
  toMetadata(intf) {
    const data = intf.dataSync;
    return {
      header: {
        formatVersion: '1.0',
        description: intf.description ?? data.description ?? '',
        originalLanguage: data.language ?? data.masterLanguage,
        abapLanguageVersion: data.abapLanguageVersion,
      },
      interface: {
        unicodeChecksActive: data.activeUnicodeCheck !== false,
      },
    };
  },

  getSource: (obj) => obj.getSource(),

  fromMetadata: (meta: any) => ({
    name: (meta?.interface?.name ?? '').toUpperCase(),
    type: 'INTF/OI',
    description: meta?.header?.description,
    language: meta?.header?.originalLanguage,
    masterLanguage: meta?.header?.originalLanguage,
    abapLanguageVersion: meta?.header?.abapLanguageVersion,
  }),

  setSources: (intf, sources) => {
    if (sources.main) {
      (intf as unknown as { _pendingSource: string })._pendingSource =
        sources.main;
    }
  },
});
