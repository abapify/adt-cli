/**
 * FUGR (function group) handler for gCTS / AFF format.
 *
 * Projects ADK function group data to the AFF fugr-v1.json schema shape:
 *
 *   {
 *     formatVersion: "1",
 *     header: { description, originalLanguage, abapLanguageVersion? },
 *     fixPointArithmetic: boolean (required),
 *     status?
 *   }
 *
 * AFF's FUGR representation nests function modules under the group
 * directory. This handler emits the group metadata plus per-function-module
 * files when function module data is available:
 *   <fmname>.func.json — FM metadata (func-v1.json schema)
 *   <fmname>.func.abap — FM source
 */

import { AdkFunctionGroup } from '@abapify/adk';
import { createHandler, type GctsExtraFile } from '../base';
import type { FugrAff, FuncAff } from '../../../schemas/generated';

type FmDescriptor = {
  name: string;
  description?: string;
  processingType?: string;
  includeNumber?: string;
  source?: string;
};

type FugrLike = {
  name: string;
  description?: string;
  dataSync?: Record<string, unknown>;
  functionModules?: FmDescriptor[];
  getSource?: () => Promise<string> | string;
};

function buildFuncMetadata(fm: FmDescriptor): string {
  const meta: Record<string, unknown> = {
    formatVersion: '1',
    header: {
      description: fm.description ?? fm.name ?? '',
    },
    processingType: fm.processingType ?? 'normal',
    includeNumber: fm.includeNumber ?? '0000',
  };
  return JSON.stringify(meta, null, 2) + '\n';
}

export const functionGroupHandler = createHandler(AdkFunctionGroup, {
  toMetadata(fugr: FugrLike): FugrAff {
    const data = (fugr.dataSync ?? {}) as Record<string, unknown>;
    const lang = (
      (data.language as string) ??
      (data.masterLanguage as string) ??
      ''
    ).toLowerCase();
    return {
      formatVersion: '1',
      header: {
        description: fugr.description ?? '',
        originalLanguage: lang,
      },
      fixPointArithmetic: data.fixPointArithmetic === true,
    };
  },

  getSource: (fugr: FugrLike) =>
    typeof fugr.getSource === 'function' ? fugr.getSource() : '',

  getExtraFiles(fugr: FugrLike): GctsExtraFile[] {
    const fms = fugr.functionModules ?? [];
    const files: GctsExtraFile[] = [];
    for (const fm of fms) {
      const fmName = fm.name.toLowerCase();
      files.push({
        path: `${fmName}.func.json`,
        content: buildFuncMetadata(fm),
      });
      if (fm.source) {
        files.push({
          path: `${fmName}.func.abap`,
          content: fm.source,
        });
      }
    }
    return files;
  },

  fromMetadata: (meta: FugrAff) => ({
    name: '',
    description: meta.header.description,
    language: meta.header.originalLanguage?.toUpperCase(),
    masterLanguage: meta.header.originalLanguage?.toUpperCase(),
    fixPointArithmetic: meta.fixPointArithmetic,
  }),
});
