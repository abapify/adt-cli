/**
 * PROG handler for gCTS / AFF format.
 */
import { AdkProgram } from '@abapify/adk';
import { createHandler } from '../base';

export const programHandler = createHandler(AdkProgram, {
  toMetadata(prog) {
    const data = prog.dataSync;
    return {
      header: {
        formatVersion: '1.0',
        description: prog.description ?? data.description ?? '',
        originalLanguage: data.language ?? data.masterLanguage,
        abapLanguageVersion: data.abapLanguageVersion,
      },
      program: {
        programType: data.programType ?? 'executableProgram',
        fixedPointArithmetic: data.fixPointArithmetic === true,
        unicodeChecksActive: data.activeUnicodeCheck !== false,
      },
    };
  },

  getSource: (obj) => obj.getSource(),

  fromMetadata: (meta: any) => ({
    name: (meta?.program?.name ?? '').toUpperCase(),
    type: 'PROG/P',
    description: meta?.header?.description,
    language: meta?.header?.originalLanguage,
    programType: meta?.program?.programType,
  }),

  setSources: (prog, sources) => {
    if (sources.main) {
      (prog as unknown as { _pendingSource: string })._pendingSource =
        sources.main;
    }
  },
});
