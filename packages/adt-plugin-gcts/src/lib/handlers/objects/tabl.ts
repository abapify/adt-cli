/**
 * TABL (table / structure) handler for gCTS / AFF format.
 */
import { AdkTable } from '@abapify/adk';
import { createHandler } from '../base';

export const tableHandler = createHandler(AdkTable, {
  toMetadata(tabl) {
    const data = tabl.dataSync as Record<string, unknown>;
    return {
      header: {
        formatVersion: '1.0',
        description: tabl.description ?? '',
        originalLanguage:
          (data.language as string) ?? (data.masterLanguage as string),
      },
      table: {
        tableCategory: data.tableCategory,
        deliveryClass: data.deliveryClass,
        dataMaintenance: data.dataMaintenance,
        fields: data.fields,
      },
    };
  },

  fromMetadata: (meta: any) => ({
    name: (meta?.table?.name ?? '').toUpperCase(),
    description: meta?.header?.description,
  }),
});
