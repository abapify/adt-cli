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
import { affDataType } from './ddic-data-type';
import type { DomaAff } from '../../../schemas/generated';

export const domainHandler = createHandler(AdkDomain, {
  toMetadata(doma): DomaAff {
    const data = doma.dataSync;
    const content = data.content;
    const lang = (data.language ?? data.masterLanguage ?? '').toLowerCase();
    const ti = content?.typeInformation;
    const oi = content?.outputInformation;
    const vi = content?.valueInformation;

    const format: DomaAff['format'] = {
      dataType: affDataType(ti?.datatype ?? 'CHAR'),
      length: ti?.length ?? 1,
    };
    if (typeof ti?.decimals === 'number') {
      format.decimals = ti.decimals;
    }

    const result: DomaAff = {
      formatVersion: '1',
      header: {
        description: doma.description ?? '',
        originalLanguage: lang,
      },
      format,
    };

    // outputCharacteristics — only emit if we have meaningful values
    const outChars: NonNullable<DomaAff['outputCharacteristics']> = {};
    if (typeof oi?.length === 'number') outChars.length = oi.length;
    if (typeof oi?.lowercase === 'boolean')
      outChars.caseSensitive = !oi.lowercase;
    if (oi?.conversionExit) outChars.conversionRoutine = oi.conversionExit;
    if (Object.keys(outChars).length > 0) {
      result.outputCharacteristics = outChars;
    }

    // valueTable
    const vtRef = vi?.valueTableRef;
    if (vtRef?.name) {
      result.valueTable = { name: vtRef.name };
    }

    return result;
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
