/**
 * TABL (table / structure) handler for gCTS / AFF format.
 *
 * Note: TABL has no AFF schema in SAP/abap-file-formats — this handler
 * uses a gCTS-compatible shape with formatVersion "1". If AFF adds a TABL
 * schema later, align here.
 */
import { AdkTable } from '@abapify/adk';
import { createHandler } from '../base';

export const tableHandler = createHandler(AdkTable, {
  toMetadata(tabl) {
    const data = tabl.dataSync as Record<string, unknown>;
    return {
      formatVersion: '1',
      header: {
        description: tabl.description ?? '',
        originalLanguage: (
          (data.language as string) ??
          (data.masterLanguage as string) ??
          ''
        ).toLowerCase(),
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
    name: '',
    description: meta?.header?.description,
    language: meta?.header?.originalLanguage?.toUpperCase(),
    masterLanguage: meta?.header?.originalLanguage?.toUpperCase(),
    tableCategory: meta?.table?.tableCategory,
    deliveryClass: meta?.table?.deliveryClass,
    dataMaintenance: meta?.table?.dataMaintenance,
    fields: meta?.table?.fields,
  }),
});
