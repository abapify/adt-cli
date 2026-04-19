/**
 * TTYP (table type) handler for gCTS / AFF format.
 */
import { AdkTableType } from '@abapify/adk';
import { createHandler } from '../base';

export const tableTypeHandler = createHandler(AdkTableType, {
  toMetadata(ttyp) {
    const data = ttyp.dataSync as Record<string, unknown>;
    return {
      header: {
        formatVersion: '1.0',
        description: ttyp.description ?? '',
        originalLanguage:
          (data.language as string) ?? (data.masterLanguage as string),
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
    name: (meta?.tableType?.name ?? '').toUpperCase(),
    description: meta?.header?.description,
  }),
});
