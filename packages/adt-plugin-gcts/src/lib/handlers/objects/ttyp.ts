/**
 * TTYP (table type) handler for gCTS / AFF format.
 *
 * Note: TTYP has no AFF schema in SAP/abap-file-formats — this handler
 * uses a gCTS-compatible shape with formatVersion "1". If AFF adds a TTYP
 * schema later, align here.
 */
import { AdkTableType } from '@abapify/adk';
import { createHandler } from '../base';

export const tableTypeHandler = createHandler(AdkTableType, {
  toMetadata(ttyp) {
    const data = ttyp.dataSync as Record<string, unknown>;
    return {
      formatVersion: '1',
      header: {
        description: ttyp.description ?? '',
        originalLanguage: (
          (data.language as string) ??
          (data.masterLanguage as string) ??
          ''
        ).toLowerCase(),
      },
      tableType: {
        accessMode: data.accessMode,
        rowType: (data.rowTypeRef as { name?: string } | undefined)?.name,
        primaryKey: data.primaryKey,
        secondaryKeys: data.secondaryKeys,
      },
    };
  },

  fromMetadata: (meta: any) => ({
    name: '',
    description: meta?.header?.description,
    language: meta?.header?.originalLanguage?.toUpperCase(),
  }),
});
