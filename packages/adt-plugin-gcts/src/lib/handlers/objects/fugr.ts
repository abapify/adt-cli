/**
 * FUGR (function group) handler for gCTS / AFF format.
 *
 * AFF's FUGR representation nests function modules under the group
 * directory. This plugin emits the group metadata only — per-module files
 * are produced by individual FUNC handlers once ADK exposes them.
 */
import { AdkFunctionGroup } from '@abapify/adk';
import { createHandler } from '../base';

export const functionGroupHandler = createHandler(AdkFunctionGroup, {
  toMetadata(fugr) {
    const data = fugr.dataSync as Record<string, unknown>;
    return {
      header: {
        formatVersion: '1.0',
        description: fugr.description ?? '',
        originalLanguage:
          (data.language as string) ?? (data.masterLanguage as string),
      },
      functionGroup: {
        // Function-module enumeration is intentionally deferred — AFF treats
        // FMs as separate artefacts and ADK already models them per FM.
        fixedPointArithmetic: data.fixPointArithmetic === true,
        unicodeChecksActive: data.activeUnicodeCheck !== false,
      },
    };
  },

  fromMetadata: (meta: any) => ({
    name: (meta?.functionGroup?.name ?? '').toUpperCase(),
    description: meta?.header?.description,
  }),
});
