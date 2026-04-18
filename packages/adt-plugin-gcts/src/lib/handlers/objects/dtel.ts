/**
 * DTEL (data element) handler for gCTS / AFF format.
 */
import { AdkDataElement } from '@abapify/adk';
import { createHandler } from '../base';

export const dataElementHandler = createHandler(AdkDataElement, {
  toMetadata(dtel) {
    const data = dtel.dataSync as Record<string, unknown>;
    return {
      header: {
        formatVersion: '1.0',
        description: dtel.description ?? '',
        originalLanguage:
          (data.language as string) ?? (data.masterLanguage as string),
      },
      dataElement: {
        typeKind: data.typeKind,
        dataType: data.dataType,
        length: data.length,
        decimals: data.decimals,
        domain: (data.domainRef as { name?: string } | undefined)?.name,
        predefinedType: data.predefinedType,
      },
    };
  },

  fromMetadata: (meta: any) => ({
    name: (meta?.dataElement?.name ?? '').toUpperCase(),
    description: meta?.header?.description,
    dataType: meta?.dataElement?.dataType,
  }),
});
