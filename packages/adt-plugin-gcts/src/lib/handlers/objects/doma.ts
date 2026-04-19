/**
 * DOMA (domain) handler for gCTS / AFF format.
 */
import { AdkDomain } from '@abapify/adk';
import { createHandler } from '../base';

export const domainHandler = createHandler(AdkDomain, {
  toMetadata(doma) {
    const data = doma.dataSync as Record<string, unknown>;
    return {
      header: {
        formatVersion: '1.0',
        description: doma.description ?? '',
        originalLanguage:
          (data.language as string) ?? (data.masterLanguage as string),
      },
      domain: {
        dataType: data.dataType,
        length: data.length,
        decimals: data.decimals,
        outputLength: data.outputLength,
        caseSensitive: data.caseSensitive === true,
        valueTable: (data.valueTableRef as { name?: string } | undefined)?.name,
      },
    };
  },

  fromMetadata: (meta: any) => ({
    name: (meta?.domain?.name ?? '').toUpperCase(),
    description: meta?.header?.description,
    dataType: meta?.domain?.dataType,
    length: meta?.domain?.length,
    decimals: meta?.domain?.decimals,
  }),
});
