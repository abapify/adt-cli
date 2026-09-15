/**
 * DOMA (domain) handler for gCTS / AFF format.
 *
 * Projects ADK domain data to the AFF doma-v1.json schema shape:
 *
 *   {
 *     formatVersion: "1",
 *     header: { description, originalLanguage, abapLanguageVersion? },
 *     format: { dataType, length, decimals? } (required),
 *     outputCharacteristics?: { length?, caseSensitive?, conversionRoutine?, ... },
 *     valueTable?: { name }
 *   }
 */

import { AdkDomain } from '@abapify/adk';
import { createHandler } from '../base';
import type { DomaAff } from '../../../schemas/generated';

export const domainHandler = createHandler(AdkDomain, {
  toMetadata(doma): DomaAff {
    const data = doma.dataSync as Record<string, unknown>;
    const content = (data.content ?? {}) as Record<string, unknown>;
    const lang = (
      (data.language as string) ??
      (data.masterLanguage as string) ??
      ''
    ).toLowerCase();
    const ti = (content.typeInformation ?? {}) as Record<string, unknown>;
    const oi = (content.outputInformation ?? {}) as Record<string, unknown>;
    const vi = (content.valueInformation ?? {}) as Record<string, unknown>;

    const format: Record<string, unknown> = {
      dataType: ti.datatype ?? 'CHAR',
      length: ti.length ?? 1,
    };
    if (typeof ti.decimals === 'number') {
      format.decimals = ti.decimals;
    }

    const result: Record<string, unknown> = {
      formatVersion: '1',
      header: {
        description: doma.description ?? '',
        originalLanguage: lang,
      },
      format: format as DomaAff['format'],
    };

    // outputCharacteristics — only emit if we have meaningful values
    const outChars: Record<string, unknown> = {};
    if (typeof oi.length === 'number') outChars.length = oi.length;
    if (typeof oi.lowercase === 'boolean')
      outChars.caseSensitive = !oi.lowercase;
    if (oi.conversionExit) outChars.conversionRoutine = oi.conversionExit;
    if (Object.keys(outChars).length > 0) {
      result.outputCharacteristics = outChars;
    }

    // valueTable
    const vtRef = (vi.valueTableRef ?? {}) as { name?: string };
    if (vtRef.name) {
      result.valueTable = { name: vtRef.name };
    }

    return result as DomaAff;
  },

  fromMetadata: (meta: DomaAff) => {
    const result: Record<string, unknown> = {
      name: '',
      description: meta.header.description,
      language: meta.header.originalLanguage?.toUpperCase(),
      masterLanguage: meta.header.originalLanguage?.toUpperCase(),
    };
    const content: Record<string, unknown> = {
      typeInformation: {
        datatype: meta.format.dataType,
        length: meta.format.length,
        decimals: meta.format.decimals ?? 0,
      },
    };
    if (meta.outputCharacteristics) {
      content.outputInformation = {
        length: meta.outputCharacteristics.length,
        lowercase: meta.outputCharacteristics.caseSensitive ? false : undefined,
        conversionExit: meta.outputCharacteristics.conversionRoutine,
      };
    }
    if (meta.valueTable?.name) {
      content.valueInformation = {
        valueTableRef: { name: meta.valueTable.name },
      };
    }
    result.content = content;
    return result as { name: string } & Record<string, unknown>;
  },
});
