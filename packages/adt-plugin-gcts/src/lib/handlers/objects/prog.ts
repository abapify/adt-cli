/**
 * PROG handler for gCTS / AFF format.
 *
 * Projects ADK program data to the AFF prog-v1.json schema shape:
 *
 *   {
 *     formatVersion: "1",
 *     header: { description, originalLanguage, abapLanguageVersion? },
 *     generalInformation: { programType, programStatus, fixPointArithmetic?, ... }
 *   }
 */

import { AdkProgram } from '@abapify/adk';
import { createHandler } from '../base';
import type { ProgAff } from '../../../schemas/generated';

/** ADK sourceObjectStatus → AFF programStatus */
const STATUS_TO_AFF: Record<string, string> = {
  SAPStandardProduction: 'sapProductionProgram',
  customerProduction: 'customerProductionProgram',
  system: 'systemProgram',
  test: 'testProgram',
};

const STATUS_FROM_AFF: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_TO_AFF).map(([k, v]) => [v, k]),
);

export const programHandler = createHandler(AdkProgram, {
  toMetadata(prog): ProgAff {
    const data = prog.dataSync;
    const lang = (data.language ?? data.masterLanguage ?? '').toLowerCase();
    const generalInformation: Record<string, unknown> = {
      programType: (data.programType ??
        'executableProgram') as ProgAff['generalInformation']['programType'],
      programStatus: (STATUS_TO_AFF[data.sourceObjectStatus ?? ''] ??
        'systemProgram') as ProgAff['generalInformation']['programStatus'],
    };
    if (typeof data.fixPointArithmetic === 'boolean') {
      generalInformation.fixPointArithmetic = data.fixPointArithmetic;
    }
    return {
      formatVersion: '1',
      header: {
        description: prog.description ?? data.description ?? '',
        originalLanguage: lang,
        ...(data.abapLanguageVersion && data.abapLanguageVersion !== 'standard'
          ? {
              abapLanguageVersion:
                data.abapLanguageVersion as ProgAff['header']['abapLanguageVersion'],
            }
          : {}),
      },
      generalInformation: generalInformation as ProgAff['generalInformation'],
    };
  },

  getSource: (obj) => obj.getSource(),

  fromMetadata: (meta: ProgAff) => ({
    name: '',
    type: 'PROG/P',
    description: meta.header.description,
    language: meta.header.originalLanguage?.toUpperCase(),
    masterLanguage: meta.header.originalLanguage?.toUpperCase(),
    programType: meta.generalInformation?.programType,
    sourceObjectStatus: meta.generalInformation?.programStatus
      ? STATUS_FROM_AFF[meta.generalInformation.programStatus]
      : undefined,
    fixPointArithmetic: meta.generalInformation?.fixPointArithmetic,
    abapLanguageVersion: meta.header.abapLanguageVersion,
  }),

  setSources: (prog, sources) => {
    if (sources.main) {
      (prog as unknown as { _pendingSource: string })._pendingSource =
        sources.main;
    }
  },
});
